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

export type FlightCategory =
  | "nonstop_carryon"
  | "nonstop_no_carryon"
  | "onestop_carryon"
  | "onestop_no_carryon";

export type BudgetTier = "budget" | "mid" | "premium";

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
