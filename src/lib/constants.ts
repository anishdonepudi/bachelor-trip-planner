import { FlightCategory, BudgetTier, ScoringAlgorithm, FlightCategoryConfig, FlightTimeFilters, TripDuration, BudgetTierConfig, AirbnbAmenity, SearchMode } from "./types";

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
  maxDuration: null,
};

export const DEFAULT_BUDGET_TIER_CONFIGS: BudgetTierConfig[] = [
  { id: "tier_1", label: "Tier 1", perPersonMin: 0, perPersonMax: 0 },
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

// ── Airbnb Amenity Options ──

export interface AirbnbAmenityOption {
  id: string;
  label: string;
  category: string;
}

export const AIRBNB_AMENITY_OPTIONS: AirbnbAmenityOption[] = [
  // Essentials
  { id: "4", label: "WiFi", category: "Essentials" },
  { id: "8", label: "Kitchen", category: "Essentials" },
  { id: "5", label: "Air Conditioning", category: "Essentials" },
  { id: "30", label: "Heating", category: "Essentials" },
  { id: "33", label: "Washer", category: "Essentials" },
  { id: "34", label: "Dryer", category: "Essentials" },
  { id: "45", label: "Hair Dryer", category: "Essentials" },
  { id: "46", label: "Iron", category: "Essentials" },
  { id: "47", label: "Dedicated Workspace", category: "Essentials" },
  { id: "1", label: "TV", category: "Essentials" },

  // Kitchen & Dining
  { id: "89", label: "Microwave", category: "Kitchen & Dining" },
  { id: "90", label: "Coffee Maker", category: "Kitchen & Dining" },
  { id: "91", label: "Refrigerator", category: "Kitchen & Dining" },
  { id: "92", label: "Dishwasher", category: "Kitchen & Dining" },
  { id: "95", label: "Oven", category: "Kitchen & Dining" },
  { id: "96", label: "Stove", category: "Kitchen & Dining" },
  { id: "137", label: "Hot Water Kettle", category: "Kitchen & Dining" },
  { id: "322", label: "Blender", category: "Kitchen & Dining" },
  { id: "236", label: "Dining Table", category: "Kitchen & Dining" },

  // Outdoor
  { id: "7", label: "Pool", category: "Outdoor" },
  { id: "25", label: "Hot Tub", category: "Outdoor" },
  { id: "58", label: "Patio or Balcony", category: "Outdoor" },
  { id: "57", label: "BBQ Grill", category: "Outdoor" },
  { id: "210", label: "Outdoor Shower", category: "Outdoor" },
  { id: "280", label: "Sauna", category: "Outdoor" },

  // Parking & Facilities
  { id: "9", label: "Free Parking", category: "Parking & Facilities" },
  { id: "104", label: "EV Charger", category: "Parking & Facilities" },
  { id: "15", label: "Gym", category: "Parking & Facilities" },

  // Location
  { id: "100", label: "Beach Access", category: "Location" },
  { id: "286", label: "Ski-In/Ski-Out", category: "Location" },

  // Entertainment
  { id: "185", label: "Sound System", category: "Entertainment" },
  { id: "227", label: "Exercise Equipment", category: "Entertainment" },
  { id: "392", label: "Board Games", category: "Entertainment" },
  { id: "515", label: "Ping Pong Table", category: "Entertainment" },
  { id: "521", label: "Pool Table", category: "Entertainment" },
  { id: "347", label: "Piano", category: "Entertainment" },

  // Family
  { id: "71", label: "Crib", category: "Family" },
  { id: "64", label: "High Chair", category: "Family" },

  // Safety
  { id: "35", label: "Smoke Alarm", category: "Safety" },
  { id: "36", label: "Carbon Monoxide Alarm", category: "Safety" },
  { id: "37", label: "First Aid Kit", category: "Safety" },
  { id: "39", label: "Fire Extinguisher", category: "Safety" },

  // Booking
  { id: "51", label: "Self Check-in", category: "Booking" },
];

export const DEFAULT_AIRBNB_AMENITIES: AirbnbAmenity[] = [];

export const SEARCH_MODE_OPTIONS: {
  value: SearchMode;
  label: string;
  description: string;
}[] = [
  { value: "both", label: "Flights + Airbnb", description: "Search for both flights and Airbnb stays" },
  { value: "flights", label: "Flights Only", description: "Search for flights only — no Airbnb data" },
  { value: "stays", label: "Airbnb Only", description: "Search for Airbnb stays only — no flight data" },
];

export function getAvailableAlgorithms(mode: SearchMode): ScoringAlgorithm[] {
  switch (mode) {
    case "flights":
      return ["zscore", "lowest_total", "lowest_per_person", "fairness"];
    case "stays":
      return ["zscore", "lowest_total", "lowest_per_person", "best_value"];
    case "both":
      return ["zscore", "lowest_total", "lowest_per_person", "fairness", "best_value"];
  }
}
