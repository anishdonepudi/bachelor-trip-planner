import { FlightCategory, BudgetTier, ScoringAlgorithm, FlightCategoryConfig, FlightTimeFilters } from "./types";

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
  outboundDeparture: { time: "12:00", plusMinus: 12 },
  outboundArrival: { time: "12:00", plusMinus: 12 },
  returnDeparture: { time: "12:00", plusMinus: 12 },
  returnArrival: { time: "12:00", plusMinus: 12 },
  maxDuration: 10,
};

export const BUDGET_TIERS: {
  value: BudgetTier;
  label: string;
  range: string;
  perPersonMin: number;
  perPersonMax: number;
  totalMin: number;
  totalMax: number;
}[] = [
  {
    value: "budget",
    label: "Budget",
    range: "$50-59/person/night",
    perPersonMin: 50,
    perPersonMax: 59,
    totalMin: 2550,
    totalMax: 3059,
  },
  {
    value: "mid",
    label: "Mid-Range",
    range: "$60-69/person/night",
    perPersonMin: 60,
    perPersonMax: 69,
    totalMin: 3060,
    totalMax: 3569,
  },
  {
    value: "premium",
    label: "Premium",
    range: "$70-79/person/night",
    perPersonMin: 70,
    perPersonMax: 79,
    totalMin: 3570,
    totalMax: 4029,
  },
];

export const NIGHTS = 3;
export const TOTAL_PEOPLE = 17;

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
