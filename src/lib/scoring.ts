import {
  CityConfig,
  Flight,
  AirbnbListingRow,
  FlightCategory,
  BudgetTier,
  ScoringAlgorithm,
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
    const skippedCategories: FlightCategory[] = [];

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
      skippedCategories.push(cat);
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
      skippedCategories,
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
  priorityCity: string = "all",
  scoringAlgorithm: ScoringAlgorithm = "zscore"
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

  // --- Compute city stats (used by zscore and fairness) ---
  const cityNames = priorityCity !== "all"
    ? [priorityCity]
    : cities.map((c) => c.city);

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

  const cityStats: Record<string, { mean: number; std: number }> = {};
  for (const city of cityNames) {
    const vals = cityPerPersonCosts[city];
    if (vals.length === 0) {
      cityStats[city] = { mean: 0, std: 1 };
      continue;
    }
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
    const std = Math.sqrt(variance) || 1;
    cityStats[city] = { mean, std };
  }

  // --- Apply scoring algorithm ---
  for (const ws of weekendScores) {
    if (ws.totalGroupCost === Infinity || ws.perCityCosts.length === 0) {
      ws.score = 0;
      continue;
    }

    switch (scoringAlgorithm) {
      case "zscore": {
        let zSum = 0;
        let zCount = 0;
        for (const cost of ws.perCityCosts) {
          if (cost.perPersonTotal !== null && cityStats[cost.city]) {
            const { mean, std } = cityStats[cost.city];
            const z = (cost.perPersonTotal - mean) / std;
            zSum += -z;
            zCount++;
          }
        }
        ws.score = zCount > 0 ? zSum / zCount : 0;
        break;
      }

      case "lowest_total": {
        // Invert so lower cost = higher score
        ws.score = -ws.totalGroupCost;
        break;
      }

      case "lowest_per_person": {
        const costs = ws.perCityCosts
          .filter((c) => c.perPersonTotal !== null)
          .map((c) => c.perPersonTotal!);
        if (costs.length === 0) { ws.score = 0; break; }
        const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
        ws.score = -avg; // invert
        break;
      }

      case "fairness": {
        const costs = ws.perCityCosts
          .filter((c) => c.perPersonTotal !== null)
          .map((c) => c.perPersonTotal!);
        if (costs.length <= 1) { ws.score = 0; break; }
        const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
        const variance = costs.reduce((sum, v) => sum + (v - mean) ** 2, 0) / costs.length;
        ws.score = -variance; // invert: lower variance = higher score
        break;
      }

      case "best_value": {
        // Combine cost ranking with airbnb quality
        const topAirbnb = ws.airbnbListings
          .filter((a) => a.budget_tier === budgetTier && (a.rating ?? 0) > 0)
          .sort((a, b) => {
            const scoreA = bayesianScore(a.rating ?? 0, a.review_count ?? 0, 4.5);
            const scoreB = bayesianScore(b.rating ?? 0, b.review_count ?? 0, 4.5);
            return scoreB - scoreA;
          })[0];
        const qualityScore = topAirbnb
          ? bayesianScore(topAirbnb.rating ?? 0, topAirbnb.review_count ?? 0, 4.5)
          : 0;
        // Normalize: quality 0-5 mapped to 0-1, cost inverted and combined
        const costFactor = ws.totalGroupCost > 0 ? 1 / ws.totalGroupCost : 0;
        ws.score = costFactor * 1e6 * (qualityScore / 5);
        break;
      }
    }
  }

  // Normalize all scores to 1-100
  const validScores = weekendScores.filter((w) => w.totalGroupCost !== Infinity);
  if (validScores.length > 0) {
    const minS = Math.min(...validScores.map((w) => w.score));
    const maxS = Math.max(...validScores.map((w) => w.score));
    const range = maxS - minS;

    for (const ws of weekendScores) {
      if (ws.totalGroupCost === Infinity) {
        ws.score = 0;
      } else if (range === 0) {
        ws.score = 100;
      } else {
        ws.score = Math.round(1 + ((ws.score - minS) / range) * 99);
      }
    }
  }

  // Attach city averages
  for (const ws of weekendScores) {
    ws.cityAverages = cityStats;
  }

  // Sort by score descending (best first)
  weekendScores.sort((a, b) => b.score - a.score);

  return weekendScores;
}
