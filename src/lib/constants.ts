import { FlightCategory, BudgetTier, ScoringAlgorithm } from "./types";

export const FLIGHT_CATEGORIES: {
  value: FlightCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "nonstop_carryon",
    label: "Nonstop + Carry-on",
    description: "Nonstop flight with carry-on bag included",
  },
  {
    value: "nonstop_no_carryon",
    label: "Nonstop Basic",
    description: "Nonstop flight, personal item only",
  },
  {
    value: "onestop_carryon",
    label: "1-Stop + Carry-on",
    description: "One-stop flight with carry-on bag included",
  },
  {
    value: "onestop_no_carryon",
    label: "1-Stop Basic",
    description: "One-stop flight, personal item only",
  },
];

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
