/**
 * Aggregate Best Flights
 *
 * Runs after all parallel flight scraper jobs complete.
 * Queries flight_options to find the cheapest flight per
 * (date_range_id, origin_city, category) and upserts into the flights table.
 *
 * Usage: npx tsx scripts/aggregate-flights.ts
 */

import { createClient } from "@supabase/supabase-js";
import { generateDateRanges } from "../src/lib/date-ranges";
import type {
  FlightCategory,
  FlightOptionRow,
  Flight,
} from "../src/lib/types";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FLIGHT_CATEGORIES: FlightCategory[] = [
  "nonstop_carryon",
  "nonstop_no_carryon",
  "onestop_carryon",
  "onestop_no_carryon",
];

const ALL_CITIES = [
  "San Francisco",
  "New York City",
  "Philadelphia",
  "Houston",
  "New Orleans",
  "Washington DC",
  "Chicago",
  "Los Angeles",
  "Phoenix",
  "Irvine",
];

async function main() {
  console.log("=== Aggregate Best Flights ===");
  console.log(`Started at ${new Date().toISOString()}\n`);

  const dateRanges = generateDateRanges();
  let upsertCount = 0;
  let skipCount = 0;

  for (const dateRange of dateRanges) {
    for (const city of ALL_CITIES) {
      // Fetch all flight_options for this city + date range
      const { data: options, error } = await supabase
        .from("flight_options")
        .select("*")
        .eq("date_range_id", dateRange.id)
        .eq("origin_city", city);

      if (error) {
        console.error(`Error fetching options for ${city} ${dateRange.id}: ${error.message}`);
        continue;
      }

      if (!options || options.length === 0) continue;

      // Find cheapest per category
      for (const category of FLIGHT_CATEGORIES) {
        const categoryOptions = options.filter(
          (o: FlightOptionRow) => o.category === category
        );

        if (categoryOptions.length === 0) continue;

        // Pick cheapest
        const best = categoryOptions.reduce(
          (a: FlightOptionRow, b: FlightOptionRow) =>
            (a.price ?? Infinity) <= (b.price ?? Infinity) ? a : b
        );

        // Mark is_best in flight_options
        // First, unmark any previously marked best for this combo
        await supabase
          .from("flight_options")
          .update({ is_best: false })
          .eq("date_range_id", dateRange.id)
          .eq("origin_city", city)
          .eq("category", category);

        await supabase
          .from("flight_options")
          .update({ is_best: true })
          .eq("id", best.id);

        // Upsert into flights table
        const flightRow: Flight = {
          date_range_id: dateRange.id,
          trip_format: dateRange.format,
          depart_date: dateRange.departDate,
          return_date: dateRange.returnDate,
          origin_city: city,
          category,
          airport_used: best.airport_used,
          price: best.price,
          airline: best.airline,
          outbound_details: best.outbound_details,
          return_details: best.return_details,
          google_flights_url: best.google_flights_url,
          scraped_at: best.scraped_at,
        };

        const { error: upsertError } = await supabase
          .from("flights")
          .upsert(flightRow, {
            onConflict: "date_range_id,origin_city,category",
          });

        if (upsertError) {
          console.error(
            `  Upsert error (${city}, ${dateRange.id}, ${category}): ${upsertError.message}`
          );
        } else {
          upsertCount++;
        }
      }
    }
  }

  console.log(`\nAggregation complete.`);
  console.log(`  Upserted: ${upsertCount} best flights`);
  console.log(`Finished at ${new Date().toISOString()}`);
}

main();
