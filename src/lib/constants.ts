import { FlightCategory, BudgetTier } from "./types";

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
    range: "$50-60/person/night",
    perPersonMin: 50,
    perPersonMax: 60,
    totalMin: 850,
    totalMax: 1020,
  },
  {
    value: "mid",
    label: "Mid-Range",
    range: "$60-70/person/night",
    perPersonMin: 60,
    perPersonMax: 70,
    totalMin: 1020,
    totalMax: 1190,
  },
  {
    value: "premium",
    label: "Premium",
    range: "$70-80/person/night",
    perPersonMin: 70,
    perPersonMax: 80,
    totalMin: 1190,
    totalMax: 1360,
  },
];

export const NIGHTS = 3;
export const TOTAL_PEOPLE = 17;
