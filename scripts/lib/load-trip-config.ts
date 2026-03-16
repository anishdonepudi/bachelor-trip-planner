/**
 * Shared config loader for scraper scripts.
 * If TRIP_ID env var is set → reads from `trips` table.
 * If not → falls back to `config` table (backward compat for production on main).
 */

import { createClient } from "@supabase/supabase-js";
import type {
  FlightCategoryConfig,
  FlightTimeFilters,
  SelectedMonth,
  TripDuration,
} from "../../src/lib/types";
import { DEFAULT_FLIGHT_CATEGORIES, DEFAULT_TIME_FILTERS, DEFAULT_TRIP_DURATION } from "../../src/lib/constants";
import { migrateTimeFilters } from "../../src/lib/migrate-time-filters";

export interface TripConfig {
  tripId: string | null;
  cities: { city: string; primaryAirports: string[]; nearbyAirports: string[] }[];
  destinationAirport: string;
  destinationCity: string | null;
  totalPeople: number;
  flightCategories: FlightCategoryConfig[];
  flightTimeFilters: FlightTimeFilters;
  selectedMonths: SelectedMonth[] | null;
  tripDuration: TripDuration | null;
}

export async function loadTripConfig(): Promise<TripConfig> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
  const tripId = process.env.TRIP_ID || null;

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (tripId) {
    console.log(`Loading config from trips table for trip: ${tripId}`);
    const { data, error } = await supabase
      .from("trips")
      .select("cities, destination_airport, destination_city, total_people, flight_categories, flight_time_filters, selected_months, trip_duration")
      .eq("id", tripId)
      .single();

    if (error || !data) {
      throw new Error(`Failed to load trip ${tripId}: ${error?.message ?? "not found"}`);
    }

    const cities = (data.cities ?? []) as TripConfig["cities"];
    const flightCategories = (data.flight_categories && Array.isArray(data.flight_categories))
      ? data.flight_categories as FlightCategoryConfig[]
      : DEFAULT_FLIGHT_CATEGORIES;
    const flightTimeFilters = data.flight_time_filters
      ? migrateTimeFilters(data.flight_time_filters)
      : DEFAULT_TIME_FILTERS;
    const selectedMonths = (data.selected_months && Array.isArray(data.selected_months) && data.selected_months.length > 0)
      ? data.selected_months as SelectedMonth[]
      : null;
    const tripDuration = data.trip_duration as TripDuration | null;

    return {
      tripId,
      cities,
      destinationAirport: data.destination_airport ?? "CUN",
      destinationCity: data.destination_city ?? null,
      totalPeople: data.total_people ?? 1,
      flightCategories,
      flightTimeFilters,
      selectedMonths,
      tripDuration,
    };
  }

  // Fallback: read from config table (production on main)
  console.log("No TRIP_ID set — loading config from config table (legacy mode)");
  const { data, error } = await supabase
    .from("config")
    .select("cities, destination_airport, destination_city, total_people, flight_categories, flight_time_filters, selected_months, trip_duration")
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load config: ${error?.message ?? "no data"}`);
  }

  const cities = (data.cities ?? []) as TripConfig["cities"];
  const flightCategories = (data.flight_categories && Array.isArray(data.flight_categories))
    ? data.flight_categories as FlightCategoryConfig[]
    : DEFAULT_FLIGHT_CATEGORIES;
  const flightTimeFilters = data.flight_time_filters
    ? migrateTimeFilters(data.flight_time_filters)
    : DEFAULT_TIME_FILTERS;
  const selectedMonths = (data.selected_months && Array.isArray(data.selected_months) && data.selected_months.length > 0)
    ? data.selected_months as SelectedMonth[]
    : null;
  const tripDuration = data.trip_duration as TripDuration | null;

  return {
    tripId: null,
    cities,
    destinationAirport: data.destination_airport ?? "CUN",
    destinationCity: data.destination_city ?? null,
    totalPeople: data.total_people ?? 1,
    flightCategories,
    flightTimeFilters,
    selectedMonths,
    tripDuration,
  };
}
