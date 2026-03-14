import { WeekendData } from "./types";

const STORAGE_KEY = "tripsync_previous_weekend_data";
const TIMESTAMP_KEY = "tripsync_previous_data_timestamp";

/**
 * Strip WeekendData down to only the fields needed by scoreAllWeekends,
 * reducing storage size dramatically.
 * Exported so the DB snapshot logic can reuse it if needed.
 */
export function minimizeForScoring(data: WeekendData): WeekendData {
  const flights = data.flights.map((f) => ({
    date_range_id: f.date_range_id,
    trip_format: f.trip_format,
    depart_date: f.depart_date,
    return_date: f.return_date,
    origin_city: f.origin_city,
    category: f.category,
    airport_used: f.airport_used,
    price: f.price,
    airline: f.airline,
    outbound_details: f.outbound_details ? { stops: f.outbound_details.stops } : null,
    return_details: f.return_details ? { stops: f.return_details.stops } : null,
    google_flights_url: null,
    scraped_at: "",
  }));

  const flightOptions = data.flightOptions.map((f) => ({
    date_range_id: f.date_range_id,
    origin_city: f.origin_city,
    category: f.category,
    airport_used: f.airport_used,
    price: f.price,
    airline: f.airline,
    outbound_details: f.outbound_details ? { stops: f.outbound_details.stops } : null,
    return_details: f.return_details ? { stops: f.return_details.stops } : null,
    google_flights_url: null,
    is_best: f.is_best,
    scraped_at: "",
  }));

  const airbnbListings = data.airbnbListings.map((a) => ({
    date_range_id: a.date_range_id,
    listing_name: a.listing_name,
    price_per_night: a.price_per_night,
    price_per_person_per_night: a.price_per_person_per_night,
    total_stay_cost: a.total_stay_cost,
    rating: a.rating,
    review_count: a.review_count,
    bedrooms: null,
    bathrooms: null,
    max_guests: null,
    amenities: null,
    image_url: null,
    airbnb_url: a.airbnb_url,
    superhost: a.superhost,
    budget_tier: a.budget_tier,
    scraped_at: "",
  }));

  return { flights, flightOptions, airbnbListings } as WeekendData;
}

export function savePreviousWeekendData(data: WeekendData): void {
  try {
    const minimal = minimizeForScoring(data);
    const json = JSON.stringify(minimal);
    localStorage.setItem(STORAGE_KEY, json);
    localStorage.setItem(TIMESTAMP_KEY, new Date().toISOString());
  } catch (e) {
    console.warn("[rank-history] save failed:", e);
  }
}

export function loadPreviousWeekendData(): WeekendData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WeekendData;
  } catch {
    return null;
  }
}

export function getPreviousDataTimestamp(): string | null {
  try {
    return localStorage.getItem(TIMESTAMP_KEY);
  } catch {
    return null;
  }
}

export function clearPreviousWeekendData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TIMESTAMP_KEY);
  } catch {
    // SSR — silently ignore
  }
}

/**
 * Check if localStorage data is stale (identical to current data).
 * When localStorage matches current data, it means localStorage was seeded
 * from the current session and has no useful "previous" information.
 */
export function isLocalStorageStale(
  currentData: WeekendData,
  localData: WeekendData
): boolean {
  // Quick check: compare flight count and a sample of prices
  if (
    currentData.flights.length !== localData.flights.length ||
    currentData.airbnbListings.length !== localData.airbnbListings.length
  ) {
    return false; // Different lengths → not stale
  }

  // Compare a fingerprint of flights by (date_range_id, price) tuples
  const currentFingerprint = currentData.flights
    .map((f) => `${f.date_range_id}:${f.price}`)
    .sort()
    .join("|");
  const localFingerprint = localData.flights
    .map((f) => `${f.date_range_id}:${f.price}`)
    .sort()
    .join("|");

  return currentFingerprint === localFingerprint;
}

/**
 * Fetch previous weekend data from the DB snapshot (fallback when localStorage is stale).
 * Returns the snapshot and its timestamp, or null if unavailable.
 */
export async function fetchPreviousWeekendDataFromDB(): Promise<{
  data: WeekendData;
  timestamp: string;
} | null> {
  try {
    const res = await fetch("/api/weekends/previous");
    if (!res.ok) return null;

    const json = await res.json();
    if (!json.snapshot) return null;

    return {
      data: json.snapshot as WeekendData,
      timestamp: json.created_at as string,
    };
  } catch {
    return null;
  }
}
