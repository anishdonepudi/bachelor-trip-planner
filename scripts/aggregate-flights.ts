/**
 * Aggregate Best Flights
 *
 * Runs after all parallel flight scraper jobs complete.
 * Fetches ALL flight_options in one query, finds the cheapest per
 * (date_range_id, origin_city, category), and batch-upserts into flights.
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

async function main() {
  console.log("=== Aggregate Best Flights ===");
  console.log(`Started at ${new Date().toISOString()}\n`);

  const dateRanges = generateDateRanges();
  const dateRangeMap = new Map(dateRanges.map((dr) => [dr.id, dr]));

  // Fetch ALL flight_options in paginated batches (Supabase returns max 1000 per query)
  console.log("Fetching all flight_options...");
  const allOptions: FlightOptionRow[] = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("flight_options")
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error(`Error fetching flight_options: ${error.message}`);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allOptions.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`Fetched ${allOptions.length} flight options\n`);

  if (allOptions.length === 0) {
    console.log("No flight options found. Nothing to aggregate.");
    return;
  }

  // Group by (date_range_id, origin_city, category) and find cheapest
  const bestByKey = new Map<string, FlightOptionRow>();
  const bestIds = new Set<number>();

  for (const opt of allOptions) {
    const key = `${opt.date_range_id}|${opt.origin_city}|${opt.category}`;
    const existing = bestByKey.get(key);
    if (!existing || (opt.price ?? Infinity) < (existing.price ?? Infinity)) {
      bestByKey.set(key, opt);
    }
  }

  // Collect best IDs
  for (const best of bestByKey.values()) {
    if (best.id) bestIds.add(best.id);
  }

  console.log(`Found ${bestByKey.size} best flights across all combinations`);

  // Reset all is_best flags, then set the new ones
  console.log("Updating is_best flags...");
  await supabase
    .from("flight_options")
    .update({ is_best: false })
    .eq("is_best", true);

  // Set is_best in batches
  const bestIdArray = [...bestIds];
  for (let i = 0; i < bestIdArray.length; i += 100) {
    const batch = bestIdArray.slice(i, i + 100);
    await supabase
      .from("flight_options")
      .update({ is_best: true })
      .in("id", batch);
  }

  // Build flight rows for batch upsert
  console.log("Upserting into flights table...");
  const flightRows: Flight[] = [];

  for (const best of bestByKey.values()) {
    const dateRange = dateRangeMap.get(best.date_range_id);
    if (!dateRange) continue;

    flightRows.push({
      date_range_id: best.date_range_id,
      trip_format: dateRange.format,
      depart_date: dateRange.departDate,
      return_date: dateRange.returnDate,
      origin_city: best.origin_city,
      category: best.category as FlightCategory,
      airport_used: best.airport_used,
      price: best.price,
      airline: best.airline,
      outbound_details: best.outbound_details,
      return_details: best.return_details,
      google_flights_url: best.google_flights_url,
      scraped_at: best.scraped_at,
    });
  }

  // Upsert in batches of 100
  let upsertCount = 0;
  for (let i = 0; i < flightRows.length; i += 100) {
    const batch = flightRows.slice(i, i + 100);
    const { error } = await supabase
      .from("flights")
      .upsert(batch, {
        onConflict: "date_range_id,origin_city,category",
      });

    if (error) {
      console.error(`  Upsert error (batch ${i / 100 + 1}): ${error.message}`);
    } else {
      upsertCount += batch.length;
    }
  }

  console.log(`\nAggregation complete.`);
  console.log(`  Upserted: ${upsertCount} best flights`);
  console.log(`Finished at ${new Date().toISOString()}`);
}

main();
