// ============================================
// TypeScript Interfaces
// ============================================

export interface DateRange {
  id: string; // e.g. "2026-06-04_2026-06-07"
  departDate: string; // ISO date string
  returnDate: string;
  format: string; // e.g. "June 4 - June 7"
}

export interface CityConfig {
  city: string;
  people: number;
  primaryAirports: string[];
  nearbyAirports: string[];
}

export interface FlightOption {
  category: FlightCategory;
  price: number;
  airline: string;
  departureAirport: string;
  arrivalAirport: string;
  outbound: FlightLeg;
  returnFlight: FlightLeg;
  googleFlightsUrl: string;
  scrapedAt: string;
}

export interface FlightLeg {
  departTime: string;
  arriveTime: string;
  duration: string;
  stops: number;
  layoverAirport?: string;
  layoverDuration?: string;
}

export interface AirbnbListing {
  id?: number;
  name: string;
  pricePerNight: number;
  pricePerPersonPerNight: number;
  totalStayCost: number;
  rating: number;
  reviewCount: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  imageUrl: string;
  airbnbUrl: string;
  superhost: boolean;
  budgetTier: BudgetTier;
  scrapedAt: string;
}

export interface FlightCategoryConfig {
  id: string;        // e.g., "nonstop_carryon"
  stops: 0 | 1 | 2;  // 0 = nonstop, 1 = one stop, 2 = two stops
  bags: "carryon" | "none";  // carry-on or personal item only
  label: string;     // display name
}

/** Time filter: a target time with +/- hours tolerance */
export interface TimeRange {
  time: string;     // target time in "HH:MM" 24-hour format, e.g. "14:00"
  plusMinus: number; // hours tolerance, e.g. 3 means 11:00-17:00
}

/** Global time filters applied to every flight search */
export interface FlightTimeFilters {
  outboundDeparture: TimeRange;
  outboundArrival: TimeRange;
  returnDeparture: TimeRange;
  returnArrival: TimeRange;
  maxDuration: number; // max flight duration in hours
}

/** Configurable month range for trip season */
export interface MonthRange {
  startMonth: number; // 1-12
  startYear: number;
  endMonth: number;   // 1-12
  endYear: number;
}

/** Configurable trip duration and departure day choices */
export interface TripDuration {
  nights: number;      // number of nights (e.g. 3, 4, 5)
  departDays: number[]; // day-of-week for departure (0=Sun..6=Sat), up to 2 choices
}

export type FlightCategory = string;

export type BudgetTier = "budget" | "mid" | "premium";

export type ScoringAlgorithm =
  | "zscore"
  | "lowest_total"
  | "lowest_per_person"
  | "fairness"
  | "best_value";

export interface Flight {
  id?: number;
  date_range_id: string;
  trip_format: string;
  depart_date: string;
  return_date: string;
  origin_city: string;
  category: FlightCategory;
  airport_used: string;
  price: number | null;
  airline: string | null;
  outbound_details: FlightLeg | null;
  return_details: FlightLeg | null;
  google_flights_url: string | null;
  scraped_at: string;
}

export interface FlightOptionRow {
  id?: number;
  date_range_id: string;
  origin_city: string;
  category: FlightCategory;
  airport_used: string;
  price: number | null;
  airline: string | null;
  outbound_details: FlightLeg | null;
  return_details: FlightLeg | null;
  google_flights_url: string | null;
  is_best: boolean;
  scraped_at: string;
}

export interface AirbnbListingRow {
  id?: number;
  date_range_id: string;
  listing_name: string | null;
  price_per_night: number | null;
  price_per_person_per_night: number | null;
  total_stay_cost: number | null;
  rating: number | null;
  review_count: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  max_guests: number | null;
  amenities: string[] | null;
  image_url: string | null;
  airbnb_url: string | null;
  superhost: boolean;
  budget_tier: BudgetTier;
  scraped_at: string;
}

export interface ScrapeJob {
  id?: number;
  job_type: "flights" | "airbnb";
  status: "pending" | "running" | "completed" | "failed";
  progress: { completed: number; total: number; current: string } | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  github_run_id: string | null;
}

export interface CostBreakdown {
  city: string;
  people: number;
  flightCost: number | null;
  stayCost: number;
  perPersonTotal: number | null;
  cityTotal: number | null;
  flight: Flight | null;
  /** If the flight came from a different category via fallback */
  fallbackCategory: FlightCategory | null;
  /** Categories that were checked during fallback but had no data */
  skippedCategories: FlightCategory[];
  /** Up to 3 flight options for the effective category (for toggle) */
  alternateFlights: FlightOptionRow[];
}

export interface CityStats {
  mean: number;
  std: number;
}

export interface WeekendScore {
  dateRange: DateRange;
  score: number;
  totalGroupCost: number;
  perCityCosts: CostBreakdown[];
  airbnbListings: AirbnbListingRow[];
  allFlightOptions: FlightOptionRow[];
  selectedAirbnbUrl: string | null;
  cityAverages: Record<string, CityStats>;
}

export interface WeekendData {
  flights: Flight[];
  flightOptions: FlightOptionRow[];
  airbnbListings: AirbnbListingRow[];
}

export interface CityPriceChange {
  city: string;
  previousFlightCost: number | null;
  currentFlightCost: number | null;
  previousStayCost: number | null;
  currentStayCost: number;
  previousPerPerson: number | null;
  currentPerPerson: number | null;
  previousCityAvg: number | null;
  currentCityAvg: number | null;
}

export interface AirbnbChange {
  previousUrl: string | null;
  currentUrl: string | null;
  previousName: string | null;
  currentName: string | null;
  previousCostPerNight: number | null;
  currentCostPerNight: number | null;
  selectionChanged: boolean;
}

export interface RankChangeInfo {
  rankDelta: number | null; // positive = improved, negative = dropped, null = new
  previousRank: number | null;
  currentRank: number;
  previousScore: number | null;
  currentScore: number;
  previousCost: number | null;
  currentCost: number;
  scoringAlgorithm: ScoringAlgorithm;
  cityChanges: CityPriceChange[];
  previousAirbnbCount: number | null;
  currentAirbnbCount: number;
  airbnbChange: AirbnbChange | null;
  // Fairness-specific
  previousCostVariance: number | null;
  currentCostVariance: number | null;
  // Best value-specific
  previousAirbnbRating: number | null;
  currentAirbnbRating: number | null;
  previousAirbnbReviews: number | null;
  currentAirbnbReviews: number | null;
}

export type RankChangeMap = Record<string, RankChangeInfo>;
