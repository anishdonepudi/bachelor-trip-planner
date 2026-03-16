/**
 * Finalize Data Refresh
 *
 * Runs ONLY when all scrape jobs succeed. All work happens in staging first,
 * then production tables are updated via insert-then-delete-old (never empty):
 *
 *   Phase 1 (staging): Aggregate best flights into flights_staging
 *   Phase 2 (promote): Insert new rows with run_id, then delete old rows
 *   Phase 3 (cleanup): Clear staging tables
 *
 * Usage: npx tsx scripts/finalize-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import { generateDateRanges } from "../src/lib/date-ranges";
import type { FlightCategory, SelectedMonth } from "../src/lib/types";
import { loadTripConfig } from "./lib/load-trip-config";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const RUN_ID = process.env.GITHUB_RUN_ID ?? null;
const TRIP_ID = process.env.TRIP_ID || null;

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

  // =============================================
  // CAPTCHA GATE: Block promotion if any scraper hit CAPTCHAs
  // =============================================

  if (RUN_ID) {
    let jobsQuery = supabase
      .from("scrape_jobs")
      .select("id, job_type, progress")
      .eq("github_run_id", RUN_ID);
    if (TRIP_ID) jobsQuery = jobsQuery.eq("trip_id", TRIP_ID);
    const { data: jobs } = await jobsQuery;

    let totalCaptchas = 0;
    if (jobs) {
      for (const job of jobs) {
        const p = job.progress as { captcha_count?: number } | null;
        totalCaptchas += p?.captcha_count ?? 0;
      }
    }

    if (totalCaptchas > 0) {
      console.error(`\n CAPTCHA GATE FAILED: ${totalCaptchas} CAPTCHA(s) detected across ${jobs?.length ?? 0} scrape jobs.`);
      console.error("Production data will NOT be updated to prevent incomplete data.");
      console.error("Staging data is preserved for inspection.\n");
      process.exit(1);
    }

    console.log(`CAPTCHA gate passed: 0 CAPTCHAs across ${jobs?.length ?? 0} scrape jobs\n`);
  }

  // Load config (trip-aware)
  const tripConfig = await loadTripConfig();
  const selectedMonths = tripConfig.selectedMonths;

  if (!selectedMonths || selectedMonths.length === 0) {
    console.error("No selected_months in config — nothing to finalize. Exiting.");
    process.exit(0);
  }

  const dateRanges = generateDateRanges(tripConfig.tripDuration ?? undefined, selectedMonths);
  const dateRangeMap = new Map(dateRanges.map((dr) => [dr.id, dr]));

  // =============================================
  // PHASE 0.5: Snapshot current production data
  // Captures what production looks like BEFORE the new data overwrites it,
  // so the frontend can show rank changes even without localStorage.
  // =============================================

  console.log("--- Phase 0.5: Snapshot current production data ---\n");

  try {
    // Scope production data fetch by trip_id if set
    const fetchProdData = async (table: string) => {
      if (TRIP_ID) {
        const rows: Record<string, unknown>[] = [];
        let offset = 0;
        const PAGE_SIZE = 1000;
        while (true) {
          const { data, error } = await supabase.from(table).select("*").eq("trip_id", TRIP_ID).range(offset, offset + PAGE_SIZE - 1);
          if (error) { console.error(`Error fetching ${table}: ${error.message}`); break; }
          if (!data || data.length === 0) break;
          rows.push(...data);
          if (data.length < PAGE_SIZE) break;
          offset += PAGE_SIZE;
        }
        return rows;
      }
      return fetchAll(table, null);
    };
    const [prodFlights, prodFlightOptions, prodAirbnb] = await Promise.all([
      fetchProdData("flights"),
      fetchProdData("flight_options"),
      fetchProdData("airbnb_listings"),
    ]);

    if (prodFlights.length > 0 || prodFlightOptions.length > 0 || prodAirbnb.length > 0) {
      // Minimize the snapshot to only fields needed for scoring (mirrors minimizeForScoring in rank-history.ts)
      const minFlights = prodFlights.map((f) => ({
        date_range_id: f.date_range_id,
        trip_format: f.trip_format,
        depart_date: f.depart_date,
        return_date: f.return_date,
        origin_city: f.origin_city,
        category: f.category,
        airport_used: f.airport_used,
        price: f.price,
        airline: f.airline,
        outbound_details: f.outbound_details ? { stops: (f.outbound_details as Record<string, unknown>).stops } : null,
        return_details: f.return_details ? { stops: (f.return_details as Record<string, unknown>).stops } : null,
        google_flights_url: null,
        scraped_at: "",
      }));

      const minFlightOptions = prodFlightOptions.map((f) => ({
        date_range_id: f.date_range_id,
        origin_city: f.origin_city,
        category: f.category,
        airport_used: f.airport_used,
        price: f.price,
        airline: f.airline,
        outbound_details: f.outbound_details ? { stops: (f.outbound_details as Record<string, unknown>).stops } : null,
        return_details: f.return_details ? { stops: (f.return_details as Record<string, unknown>).stops } : null,
        google_flights_url: null,
        is_best: f.is_best,
        scraped_at: "",
      }));

      const minAirbnb = prodAirbnb.map((a) => ({
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

      const snapshot = {
        flights: minFlights,
        flightOptions: minFlightOptions,
        airbnbListings: minAirbnb,
      };

      const snapshotKey = TRIP_ID ?? "legacy0001";
      const { error: snapshotError } = await supabase
        .from("previous_weekend_snapshot")
        .upsert({ trip_id: snapshotKey, snapshot, created_at: new Date().toISOString() });

      if (snapshotError) {
        console.error(`   Snapshot upsert error: ${snapshotError.message}`);
      } else {
        console.log(`   Snapshot saved (${minFlights.length} flights, ${minFlightOptions.length} options, ${minAirbnb.length} airbnb)`);
      }
    } else {
      console.log("   No current production data to snapshot — skipping.");
    }
  } catch (snapshotErr) {
    // Non-fatal: if snapshotting fails, we still want to promote data
    console.error("   Snapshot failed (non-fatal):", snapshotErr);
  }

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
        trip_id: TRIP_ID,
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
  // PHASE 2: Promote staging → production (insert-then-delete-old)
  // New rows are inserted WITH run_id before old rows are removed,
  // so the production tables are never empty.
  // =============================================

  console.log("\n--- Phase 2: Promote to production ---\n");

  const promoteRunId = RUN_ID ?? `local-${Date.now()}`;

  // Promote flight_options
  if (stagedFlights.length > 0) {
    console.log("5. Promoting flight_options...");
    const foRows = stagedFlights.map((row) => {
      const { id, ...rest } = row;
      return { ...rest, run_id: promoteRunId, trip_id: TRIP_ID };
    });
    const foInserted = await batchInsert("flight_options", foRows);
    console.log(`   Inserted ${foInserted} new flight options`);

    // Delete old rows — scope by trip_id to avoid nuking other trips' data
    let foDeleteQuery = supabase.from("flight_options").delete({ count: "exact" });
    if (TRIP_ID) {
      foDeleteQuery = foDeleteQuery.eq("trip_id", TRIP_ID);
    }
    const { count: deletedCount } = await foDeleteQuery.or(`run_id.is.null,run_id.neq.${promoteRunId}`);
    console.log(`   Deleted ${deletedCount ?? "?"} old flight options`);
  }

  // Promote flights
  const stagedBestFlights = await fetchAll("flights_staging", RUN_ID);
  if (stagedBestFlights.length > 0) {
    console.log("6. Promoting best flights...");
    const flightRows = stagedBestFlights.map((row) => {
      const { id, ...rest } = row;
      return { ...rest, run_id: promoteRunId, trip_id: TRIP_ID };
    });
    const inserted = await batchInsert("flights", flightRows);
    console.log(`   Inserted ${inserted} new best flights`);

    let fDeleteQuery = supabase.from("flights").delete({ count: "exact" });
    if (TRIP_ID) {
      fDeleteQuery = fDeleteQuery.eq("trip_id", TRIP_ID);
    }
    const { count: deletedCount } = await fDeleteQuery.or(`run_id.is.null,run_id.neq.${promoteRunId}`);
    console.log(`   Deleted ${deletedCount ?? "?"} old best flights`);
  }

  // Promote airbnb_listings
  if (stagedAirbnb.length > 0) {
    console.log("7. Promoting airbnb_listings...");
    const alRows = stagedAirbnb.map((row) => {
      const { id, ...rest } = row;
      return { ...rest, run_id: promoteRunId, trip_id: TRIP_ID };
    });
    const alInserted = await batchInsert("airbnb_listings", alRows);
    console.log(`   Inserted ${alInserted} new airbnb listings`);

    let alDeleteQuery = supabase.from("airbnb_listings").delete({ count: "exact" });
    if (TRIP_ID) {
      alDeleteQuery = alDeleteQuery.eq("trip_id", TRIP_ID);
    }
    const { count: deletedCount } = await alDeleteQuery.or(`run_id.is.null,run_id.neq.${promoteRunId}`);
    console.log(`   Deleted ${deletedCount ?? "?"} old airbnb listings`);
  } else {
    console.log("7. No staged airbnb listings — skipping.");
  }

  // =============================================
  // PHASE 3: Cleanup staging
  // =============================================

  console.log("\n--- Phase 3: Cleanup ---\n");
  console.log("8. Cleaning staging tables...");
  const cleanStaging = async (table: string) => {
    let query = supabase.from(table).delete();
    if (RUN_ID) {
      query = query.eq("run_id", RUN_ID);
    } else {
      query = query.gte("id", 0);
    }
    if (TRIP_ID) query = query.eq("trip_id", TRIP_ID);
    await query;
  };
  await cleanStaging("flight_options_staging");
  await cleanStaging("flights_staging");
  await cleanStaging("airbnb_listings_staging");
  console.log("   Done");

  console.log(`\nFinalization complete at ${new Date().toISOString()}`);
}

main();
