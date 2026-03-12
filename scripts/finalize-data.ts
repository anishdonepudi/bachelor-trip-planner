/**
 * Finalize Data Refresh
 *
 * Runs ONLY when all scrape jobs succeed. All work happens in staging first,
 * then production tables are updated in one final swap:
 *
 *   Phase 1 (staging): Aggregate best flights into flights_staging
 *   Phase 2 (promote): Copy all staging tables → production
 *   Phase 3 (cleanup): Clear staging tables
 *
 * Usage: npx tsx scripts/finalize-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import { generateDateRanges } from "../src/lib/date-ranges";
import type { FlightCategory } from "../src/lib/types";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const RUN_ID = process.env.GITHUB_RUN_ID ?? null;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchAll(table: string, runId: string | null) {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    let query = supabase.from(table).select("*").range(offset, offset + PAGE_SIZE - 1);
    if (runId) query = query.eq("run_id", runId);

    const { data, error } = await query;
    if (error) {
      console.error(`Error fetching ${table}: ${error.message}`);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

async function batchInsert(table: string, rows: Record<string, unknown>[], batchSize = 100) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error(`   Insert error (${table} batch ${i / batchSize + 1}): ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }
  return inserted;
}

async function main() {
  console.log("=== Finalize Data Refresh ===");
  console.log(`Run ID: ${RUN_ID ?? "local"}`);
  console.log(`Started at ${new Date().toISOString()}\n`);

  const dateRanges = generateDateRanges();
  const dateRangeMap = new Map(dateRanges.map((dr) => [dr.id, dr]));

  // =============================================
  // PHASE 1: Aggregate in staging
  // =============================================

  console.log("--- Phase 1: Aggregate in staging ---\n");

  // Flights
  console.log("1. Fetching staged flight options...");
  const stagedFlights = await fetchAll("flight_options_staging", RUN_ID);
  console.log(`   ${stagedFlights.length} staged flight options`);

  if (stagedFlights.length > 0) {
    // Find cheapest per (date_range_id, origin_city, category)
    const bestByKey = new Map<string, Record<string, unknown>>();
    for (const opt of stagedFlights) {
      const key = `${opt.date_range_id}|${opt.origin_city}|${opt.category}`;
      const existing = bestByKey.get(key);
      if (!existing || ((opt.price as number) ?? Infinity) < ((existing.price as number) ?? Infinity)) {
        bestByKey.set(key, opt);
      }
    }
    const bestIds = new Set([...bestByKey.values()].map((b) => b.id as number).filter(Boolean));

    console.log(`   ${bestByKey.size} best flights identified`);

    // Mark is_best on staging flight_options
    console.log("2. Marking is_best on staged flight options...");
    const bestIdArray = [...bestIds];
    for (let i = 0; i < bestIdArray.length; i += 100) {
      const batch = bestIdArray.slice(i, i + 100);
      await supabase.from("flight_options_staging").update({ is_best: true }).in("id", batch);
    }

    // Write aggregated best flights to flights_staging
    console.log("3. Writing best flights to flights_staging...");
    // Clear any previous staging for this run
    if (RUN_ID) {
      await supabase.from("flights_staging").delete().eq("run_id", RUN_ID);
    } else {
      await supabase.from("flights_staging").delete().gte("id", 0);
    }

    const flightRows = [];
    for (const best of bestByKey.values()) {
      const dateRange = dateRangeMap.get(best.date_range_id as string);
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
        run_id: RUN_ID,
      });
    }

    const inserted = await batchInsert("flights_staging", flightRows);
    console.log(`   Inserted ${inserted} best flights into flights_staging`);
  } else {
    console.log("   No staged flights — skipping aggregation.");
  }

  // Airbnb — already fully staged, nothing to aggregate
  const stagedAirbnb = await fetchAll("airbnb_listings_staging", RUN_ID);
  console.log(`\n4. ${stagedAirbnb.length} staged airbnb listings (ready for promotion)`);

  // =============================================
  // PHASE 2: Promote staging → production
  // =============================================

  console.log("\n--- Phase 2: Promote to production ---\n");

  // Promote flight_options
  if (stagedFlights.length > 0) {
    console.log("5. Promoting flight_options...");
    // Delete production rows for the combinations we have new data for
    const foKeys = new Set(stagedFlights.map((r) => `${r.date_range_id}|${r.origin_city}|${r.airport_used}`));
    for (const key of foKeys) {
      const [drId, city, airport] = key.split("|");
      await supabase.from("flight_options").delete()
        .eq("date_range_id", drId).eq("origin_city", city).eq("airport_used", airport);
    }

    const foRows = stagedFlights.map((row) => {
      const { id, run_id, ...rest } = row;
      return rest;
    });
    const foInserted = await batchInsert("flight_options", foRows);
    console.log(`   Inserted ${foInserted} flight options`);
  }

  // Promote flights (aggregated best)
  const stagedBestFlights = await fetchAll("flights_staging", RUN_ID);
  if (stagedBestFlights.length > 0) {
    console.log("6. Promoting best flights...");
    const flightRows = stagedBestFlights.map((row) => {
      const { id, run_id, ...rest } = row;
      return rest;
    });

    for (let i = 0; i < flightRows.length; i += 100) {
      const batch = flightRows.slice(i, i + 100);
      const { error } = await supabase
        .from("flights")
        .upsert(batch, { onConflict: "date_range_id,origin_city,category" });
      if (error) console.error(`   Upsert error (flights batch ${i / 100 + 1}): ${error.message}`);
    }
    console.log(`   Upserted ${flightRows.length} best flights`);
  }

  // Promote airbnb_listings
  if (stagedAirbnb.length > 0) {
    console.log("7. Promoting airbnb_listings...");
    const airbnbKeys = new Set(stagedAirbnb.map((r) => `${r.date_range_id}|${r.budget_tier}`));
    for (const key of airbnbKeys) {
      const [drId, tier] = key.split("|");
      await supabase.from("airbnb_listings").delete().eq("date_range_id", drId).eq("budget_tier", tier);
    }

    const alRows = stagedAirbnb.map((row) => {
      const { id, run_id, ...rest } = row;
      return rest;
    });
    const alInserted = await batchInsert("airbnb_listings", alRows);
    console.log(`   Inserted ${alInserted} airbnb listings`);
  } else {
    console.log("7. No staged airbnb listings — skipping.");
  }

  // =============================================
  // PHASE 3: Cleanup staging
  // =============================================

  console.log("\n--- Phase 3: Cleanup ---\n");
  console.log("8. Cleaning staging tables...");
  if (RUN_ID) {
    await supabase.from("flight_options_staging").delete().eq("run_id", RUN_ID);
    await supabase.from("flights_staging").delete().eq("run_id", RUN_ID);
    await supabase.from("airbnb_listings_staging").delete().eq("run_id", RUN_ID);
  } else {
    await supabase.from("flight_options_staging").delete().gte("id", 0);
    await supabase.from("flights_staging").delete().gte("id", 0);
    await supabase.from("airbnb_listings_staging").delete().gte("id", 0);
  }
  console.log("   Done");

  console.log(`\nFinalization complete at ${new Date().toISOString()}`);
}

main();
