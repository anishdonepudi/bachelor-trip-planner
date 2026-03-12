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

export function calculateWeekendScore(
  weekend: DateRange,
  flights: Flight[],
  airbnbs: AirbnbListingRow[],
  flightCategory: FlightCategory,
  budgetTier: BudgetTier,
  cities: CityConfig[]
): { score: number; totalGroupCost: number; perCityCosts: CostBreakdown[] } {
  const cheapestAirbnb = airbnbs
    .filter((a) => a.budget_tier === budgetTier)
    .sort(
      (a, b) =>
        (a.price_per_person_per_night ?? Infinity) -
        (b.price_per_person_per_night ?? Infinity)
    )[0];

  if (!cheapestAirbnb) {
    return { score: 0, totalGroupCost: Infinity, perCityCosts: [] };
  }

  const stayPerPerson =
    (cheapestAirbnb.price_per_person_per_night ?? 0) * NIGHTS;

  let totalGroupCost = 0;
  const perCityCosts: CostBreakdown[] = [];

  for (const city of cities) {
    const bestFlight = flights
      .filter(
        (f) => f.origin_city === city.city && f.category === flightCategory
      )
      .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];

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
    });

    if (perPersonTotal !== null) {
      totalGroupCost += perPersonTotal * city.people;
    }
  }

  return { score: totalGroupCost, totalGroupCost, perCityCosts };
}

export function scoreAllWeekends(
  dateRanges: DateRange[],
  allFlights: Flight[],
  allFlightOptions: FlightOptionRow[],
  allAirbnbs: AirbnbListingRow[],
  flightCategory: FlightCategory,
  budgetTier: BudgetTier,
  cities: CityConfig[]
): WeekendScore[] {
  const weekendScores: WeekendScore[] = [];

  for (const weekend of dateRanges) {
    const weekendFlights = allFlights.filter(
      (f) => f.date_range_id === weekend.id
    );
    const weekendAirbnbs = allAirbnbs.filter(
      (a) => a.date_range_id === weekend.id
    );
    const weekendFlightOptions = allFlightOptions.filter(
      (f) => f.date_range_id === weekend.id
    );

    const result = calculateWeekendScore(
      weekend,
      weekendFlights,
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
    });
  }

  // Sort by total group cost ascending (cheapest first)
  weekendScores.sort((a, b) => a.totalGroupCost - b.totalGroupCost);

  // Normalize scores to 1-100
  const costs = weekendScores
    .map((w) => w.totalGroupCost)
    .filter((c) => c !== Infinity);

  if (costs.length > 0) {
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const range = maxCost - minCost;

    for (const weekend of weekendScores) {
      if (weekend.totalGroupCost === Infinity) {
        weekend.score = 0;
      } else if (range === 0) {
        weekend.score = 100;
      } else {
        weekend.score = Math.round(
          100 - ((weekend.totalGroupCost - minCost) / range) * 99
        );
      }
    }
  }

  return weekendScores;
}
