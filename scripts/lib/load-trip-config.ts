/**
 * Shared config loader for scraper scripts.
 * Reads trip configuration from the `trips` table using the required TRIP_ID env var.
 */

import { createClient } from "@supabase/supabase-js";
import type {
  FlightCategoryConfig,
  FlightTimeFilters,
  SelectedMonth,
  TripDuration,
  BudgetTierConfig,
  AirbnbAmenity,
} from "../../src/lib/types";
import { DEFAULT_FLIGHT_CATEGORIES, DEFAULT_TIME_FILTERS, DEFAULT_TRIP_DURATION, DEFAULT_AIRBNB_AMENITIES } from "../../src/lib/constants";
import { migrateTimeFilters } from "../../src/lib/migrate-time-filters";

export interface TripConfig {
  tripId: string;
  cities: { city: string; primaryAirports: string[]; nearbyAirports: string[] }[];
  destinationAirport: string;
  destinationCity: string | null;
  totalPeople: number;
  flightCategories: FlightCategoryConfig[];
  flightTimeFilters: FlightTimeFilters;
  selectedMonths: SelectedMonth[] | null;
  tripDuration: TripDuration | null;
  budgetTiers: BudgetTierConfig[];
  airbnbAmenities: AirbnbAmenity[];
}

export async function loadTripConfig(): Promise<TripConfig> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
  const tripId = process.env.TRIP_ID;

  if (!tripId) {
    throw new Error("Missing required TRIP_ID env var");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Loading config from trips table for trip: ${tripId}`);
  const { data, error } = await supabase
    .from("trips")
    .select("cities, destination_airport, destination_city, total_people, flight_categories, flight_time_filters, selected_months, trip_duration, budget_tiers, airbnb_amenities")
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
  const budgetTiers = (data.budget_tiers && Array.isArray(data.budget_tiers))
    ? data.budget_tiers as BudgetTierConfig[]
    : null;
  if (!budgetTiers || budgetTiers.length === 0) {
    throw new Error(`Trip ${tripId} has no budget_tiers configured`);
  }

  const airbnbAmenities = (data.airbnb_amenities && Array.isArray(data.airbnb_amenities))
    ? data.airbnb_amenities as AirbnbAmenity[]
    : DEFAULT_AIRBNB_AMENITIES;

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
    budgetTiers,
    airbnbAmenities,
  };
}
