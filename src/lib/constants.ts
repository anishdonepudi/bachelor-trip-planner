import { FlightCategory, BudgetTier, ScoringAlgorithm, FlightCategoryConfig, FlightTimeFilters, TripDuration, BudgetTierConfig } from "./types";

function stopDescription(stops: 0 | 1 | 2, bags: "carryon" | "none"): string {
  const stopPart = stops === 0 ? "Nonstop flight" : stops === 1 ? "One-stop flight" : "Two-stop flight";
  const bagPart = bags === "carryon" ? "with carry-on bag included" : "personal item only";
  return `${stopPart}, ${bagPart}`;
}

export function flightCategoryConfigToDisplay(categories: FlightCategoryConfig[]): { value: FlightCategory; label: string; description: string }[] {
  return categories.map(fc => ({
    value: fc.id,
    label: fc.label,
    description: stopDescription(fc.stops, fc.bags),
  }));
}

export function generateCategoryId(stops: 0 | 1 | 2, bags: "carryon" | "none"): string {
  const stopPart = stops === 0 ? "nonstop" : stops === 1 ? "onestop" : "twostop";
  return `${stopPart}_${bags === "carryon" ? "carryon" : "no_carryon"}`;
}

export function generateCategoryLabel(stops: 0 | 1 | 2, bags: "carryon" | "none"): string {
  const stopLabel = stops === 0 ? "Nonstop" : stops === 1 ? "1-Stop" : "2-Stop";
  const bagLabel = bags === "carryon" ? "+ Carry-on" : "Basic";
  return `${stopLabel} ${bagLabel}`;
}

export const DEFAULT_FLIGHT_CATEGORIES: FlightCategoryConfig[] = [
  { id: "nonstop_carryon", stops: 0, bags: "carryon", label: "Nonstop + Carry-on" },
  { id: "nonstop_no_carryon", stops: 0, bags: "none", label: "Nonstop Basic" },
  { id: "onestop_carryon", stops: 1, bags: "carryon", label: "1-Stop + Carry-on" },
  { id: "onestop_no_carryon", stops: 1, bags: "none", label: "1-Stop Basic" },
];

export const FLIGHT_CATEGORIES: {
  value: FlightCategory;
  label: string;
  description: string;
}[] = flightCategoryConfigToDisplay(DEFAULT_FLIGHT_CATEGORIES);

export const DEFAULT_TIME_FILTERS: FlightTimeFilters = {
  destinationArrival: { from: "00:00", to: "23:59" },
  destinationDeparture: { from: "00:00", to: "23:59" },
  maxDuration: 10,
};

export const DEFAULT_BUDGET_TIER_CONFIGS: BudgetTierConfig[] = [
  { id: "budget", label: "Budget", perPersonMin: 50, perPersonMax: 59 },
  { id: "mid", label: "Mid-Range", perPersonMin: 60, perPersonMax: 69 },
  { id: "premium", label: "Premium", perPersonMin: 70, perPersonMax: 79 },
];

export function budgetTierConfigToDisplay(configs: BudgetTierConfig[]): {
  value: string; label: string; range: string; perPersonMin: number; perPersonMax: number;
}[] {
  return configs.map(c => ({
    value: c.id,
    label: c.label,
    range: `$${c.perPersonMin}-${c.perPersonMax}/person/night`,
    perPersonMin: c.perPersonMin,
    perPersonMax: c.perPersonMax,
  }));
}

export const BUDGET_TIERS = budgetTierConfigToDisplay(DEFAULT_BUDGET_TIER_CONFIGS);

export const DEFAULT_TRIP_DURATION: TripDuration = {
  nights: 3,
  departDays: [4, 5], // Thursday, Friday
};

export const SCORING_ALGORITHMS: {
  value: ScoringAlgorithm;
  label: string;
  description: string;
}[] = [
  {
    value: "zscore",
    label: "Z-Score",
    description:
      "Measures how cheap each weekend is relative to the average across all weekends. A high score means the weekend is unusually cheap for most cities. Best for finding hidden deals.",
  },
  {
    value: "lowest_total",
    label: "Lowest Group Cost",
    description:
      "Ranks by total cost for the entire group (all flights + stay). Accounts for group size per city. Best when the goal is to minimize what the group spends overall.",
  },
  {
    value: "lowest_per_person",
    label: "Lowest Per-Person",
    description:
      "Ranks by average per-person cost across all cities, treating each city equally regardless of group size. Best when you want the cheapest individual experience.",
  },
  {
    value: "fairness",
    label: "Fairness",
    description:
      "Ranks by how similar per-person costs are across cities. Low variance means no one city gets a bad deal. Best when equity matters more than overall cost.",
  },
  {
    value: "best_value",
    label: "Best Value",
    description:
      "Balances cost with Airbnb quality (rating and reviews). A slightly pricier weekend with a top-rated stay can outrank a cheaper one with poor reviews.",
  },
];
