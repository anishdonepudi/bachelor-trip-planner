import {
  CityConfig,
  Flight,
  AirbnbListingRow,
  FlightCategory,
  BudgetTier,
  CostBreakdown,
  DateRange,
  WeekendScore,
  FlightOptionRow,
} from "./types";
import { NIGHTS } from "./constants";

/** Category fallback hierarchy: nonstop_carryon → nonstop_no_carryon → onestop_carryon → onestop_no_carryon */
const CATEGORY_HIERARCHY: FlightCategory[] = [
  "nonstop_carryon",
  "nonstop_no_carryon",
  "onestop_carryon",
  "onestop_no_carryon",
];

/**
 * Bayesian weighted rating — balances rating vs review confidence.
 * score = (v / (v + m)) * R + (m / (v + m)) * C
 */
const BAYESIAN_M = 5;

function bayesianScore(rating: number, reviewCount: number, avgRating: number): number {
  if (rating <= 0) return 0;
  return (reviewCount / (reviewCount + BAYESIAN_M)) * rating +
    (BAYESIAN_M / (reviewCount + BAYESIAN_M)) * avgRating;
}

function selectTopAirbnb(airbnbs: AirbnbListingRow[], budgetTier: BudgetTier): AirbnbListingRow | null {
  const tierListings = airbnbs.filter((a) => a.budget_tier === budgetTier);
  if (tierListings.length === 0) return null;

  const rated = tierListings.filter((l) => (l.rating ?? 0) > 0);
  const avgRating = rated.length > 0
    ? rated.reduce((sum, l) => sum + (l.rating ?? 0), 0) / rated.length
    : 4.5;

  return tierListings
    .map((l) => ({
      listing: l,
      score: bayesianScore(l.rating ?? 0, l.review_count ?? 0, avgRating),
    }))
    .sort((a, b) => b.score - a.score)[0].listing;
}

export function calculateWeekendScore(
  weekend: DateRange,
  flights: Flight[],
  flightOptions: FlightOptionRow[],
  airbnbs: AirbnbListingRow[],
  flightCategory: FlightCategory,
  budgetTier: BudgetTier,
  cities: CityConfig[]
): { score: number; totalGroupCost: number; perCityCosts: CostBreakdown[]; selectedAirbnbUrl: string | null } {
  const topAirbnb = selectTopAirbnb(airbnbs, budgetTier);

  if (!topAirbnb) {
    return { score: 0, totalGroupCost: Infinity, perCityCosts: [], selectedAirbnbUrl: null };
  }

  const stayPerPerson =
    (topAirbnb.price_per_person_per_night ?? 0) * NIGHTS;

  // Build the fallback order starting from the selected category
  const startIdx = CATEGORY_HIERARCHY.indexOf(flightCategory);
  const fallbackOrder = CATEGORY_HIERARCHY.slice(startIdx);

  let totalGroupCost = 0;
  const perCityCosts: CostBreakdown[] = [];

  for (const city of cities) {
    let bestFlight: Flight | null = null;
    let fallbackCategory: FlightCategory | null = null;

    // Try each category in hierarchy order
    for (const cat of fallbackOrder) {
      const candidate = flights
        .filter((f) => f.origin_city === city.city && f.category === cat)
        .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];

      if (candidate?.price != null) {
        bestFlight = candidate;
        fallbackCategory = cat !== flightCategory ? cat : null;
        break;
      }
    }

    // Collect up to 3 flight options for the effective category (for toggle)
    const effectiveCategory = fallbackCategory ?? flightCategory;
    const alternateFlights = flightOptions
      .filter((f) => f.origin_city === city.city && f.category === effectiveCategory && f.price != null)
      .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
      .slice(0, 3);

    const flightCost = bestFlight?.price ?? null;
    const perPersonTotal =
      flightCost !== null ? flightCost + stayPerPerson : null;

    perCityCosts.push({
      city: city.city,
      people: city.people,
      flightCost,
      stayCost: stayPerPerson,
      perPersonTotal,
      cityTotal: perPersonTotal !== null ? perPersonTotal * city.people : null,
      flight: bestFlight ?? null,
      fallbackCategory,
      alternateFlights,
    });

    if (perPersonTotal !== null) {
      totalGroupCost += perPersonTotal * city.people;
    }
  }

  return { score: totalGroupCost, totalGroupCost, perCityCosts, selectedAirbnbUrl: topAirbnb.airbnb_url ?? null };
}

export function scoreAllWeekends(
  dateRanges: DateRange[],
  allFlights: Flight[],
  allFlightOptions: FlightOptionRow[],
  allAirbnbs: AirbnbListingRow[],
  flightCategory: FlightCategory,
  budgetTier: BudgetTier,
  cities: CityConfig[],
  priorityCity: string = "all"
): WeekendScore[] {
  // Filter out flights with 2+ stops on either leg (stale data from older scraper runs)
  const maxStops = (f: { outbound_details?: { stops?: number } | null; return_details?: { stops?: number } | null }) =>
    Math.max(f.outbound_details?.stops ?? 0, f.return_details?.stops ?? 0);
  const validFlights = allFlights.filter((f) => maxStops(f) <= 1);
  const validFlightOptions = allFlightOptions.filter((f) => maxStops(f) <= 1);

  const weekendScores: WeekendScore[] = [];

  for (const weekend of dateRanges) {
    const weekendFlights = validFlights.filter(
      (f) => f.date_range_id === weekend.id
    );
    const weekendAirbnbs = allAirbnbs.filter(
      (a) => a.date_range_id === weekend.id
    );
    let weekendFlightOptions = validFlightOptions.filter(
      (f) => f.date_range_id === weekend.id
    );

    // Fill gaps: if flight_options is missing a city/category but flights has it,
    // convert the Flight entry into a FlightOptionRow so the grid can display it
    const optionKeys = new Set(
      weekendFlightOptions.map((f) => `${f.origin_city}|${f.category}`)
    );
    for (const f of weekendFlights) {
      if (f.price != null && !optionKeys.has(`${f.origin_city}|${f.category}`)) {
        weekendFlightOptions = [...weekendFlightOptions, {
          date_range_id: f.date_range_id,
          origin_city: f.origin_city,
          category: f.category,
          airport_used: f.airport_used,
          price: f.price,
          airline: f.airline,
          outbound_details: f.outbound_details,
          return_details: f.return_details,
          google_flights_url: f.google_flights_url,
          is_best: true,
          scraped_at: f.scraped_at,
        }];
        optionKeys.add(`${f.origin_city}|${f.category}`);
      }
    }

    const result = calculateWeekendScore(
      weekend,
      weekendFlights,
      weekendFlightOptions,
      weekendAirbnbs,
      flightCategory,
      budgetTier,
      cities
    );

    weekendScores.push({
      dateRange: weekend,
      score: result.totalGroupCost,
      totalGroupCost: result.totalGroupCost,
      perCityCosts: result.perCityCosts,
      airbnbListings: weekendAirbnbs,
      allFlightOptions: weekendFlightOptions,
      selectedAirbnbUrl: result.selectedAirbnbUrl,
      cityAverages: {},
    });
  }

  // --- Z-score composite scoring ---
  // For each city, compute mean & stddev of per-person cost across all weekends.
  // Then for each weekend, compute how many stddevs each city is below its mean.
  // Average the z-scores across cities, then normalize to 0-100.
  // When priorityCity is set, only that city's z-score is used for ranking.

  const cityNames = priorityCity !== "all"
    ? [priorityCity]
    : cities.map((c) => c.city);

  // Collect per-person costs per city across all weekends
  const cityPerPersonCosts: Record<string, number[]> = {};
  for (const city of cityNames) {
    cityPerPersonCosts[city] = [];
  }
  for (const ws of weekendScores) {
    for (const cost of ws.perCityCosts) {
      if (cost.perPersonTotal !== null) {
        cityPerPersonCosts[cost.city]?.push(cost.perPersonTotal);
      }
    }
  }

  // Compute mean & stddev per city
  const cityStats: Record<string, { mean: number; std: number }> = {};
  for (const city of cityNames) {
    const vals = cityPerPersonCosts[city];
    if (vals.length === 0) {
      cityStats[city] = { mean: 0, std: 1 };
      continue;
    }
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
    const std = Math.sqrt(variance) || 1; // avoid division by zero
    cityStats[city] = { mean, std };
  }

  // For each weekend, compute average z-score across cities
  // Negative z = cheaper than average (good), so we negate to make higher = better
  for (const ws of weekendScores) {
    if (ws.totalGroupCost === Infinity || ws.perCityCosts.length === 0) {
      ws.score = 0;
      continue;
    }

    let zSum = 0;
    let zCount = 0;
    for (const cost of ws.perCityCosts) {
      if (cost.perPersonTotal !== null && cityStats[cost.city]) {
        const { mean, std } = cityStats[cost.city];
        const z = (cost.perPersonTotal - mean) / std;
        zSum += -z; // negate: lower cost = higher score
        zCount++;
      }
    }

    ws.score = zCount > 0 ? zSum / zCount : 0;
  }

  // Normalize z-scores to 1-100
  const rawScores = weekendScores
    .map((w) => w.score)
    .filter((s) => s !== 0 || weekendScores.find((w) => w.score === s)?.totalGroupCost !== Infinity);

  const validScores = weekendScores.filter((w) => w.totalGroupCost !== Infinity);
  if (validScores.length > 0) {
    const minZ = Math.min(...validScores.map((w) => w.score));
    const maxZ = Math.max(...validScores.map((w) => w.score));
    const range = maxZ - minZ;

    for (const ws of weekendScores) {
      if (ws.totalGroupCost === Infinity) {
        ws.score = 0;
      } else if (range === 0) {
        ws.score = 100;
      } else {
        ws.score = Math.round(1 + ((ws.score - minZ) / range) * 99);
      }
    }
  }

  // Attach city averages to each weekend
  for (const ws of weekendScores) {
    ws.cityAverages = cityStats;
  }

  // Sort by score descending (best first)
  weekendScores.sort((a, b) => b.score - a.score);

  return weekendScores;
}
