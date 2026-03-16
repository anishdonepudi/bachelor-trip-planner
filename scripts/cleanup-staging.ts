/**
 * Cleanup staging tables for a failed run.
 * Usage: npx tsx scripts/cleanup-staging.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const RUN_ID = process.env.GITHUB_RUN_ID ?? null;
const TRIP_ID = process.env.TRIP_ID!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars");
  process.exit(1);
}

if (!TRIP_ID) {
  console.error("Missing TRIP_ID env var");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log(`Cleaning staging tables for run ${RUN_ID ?? "all"}, trip ${TRIP_ID}...`);

  const tables = ["flight_options_staging", "flights_staging", "airbnb_listings_staging"];

  for (const table of tables) {
    let query = supabase.from(table).delete();
    if (RUN_ID) {
      query = query.eq("run_id", RUN_ID);
    } else {
      query = query.gte("id", 0);
    }
    query = query.eq("trip_id", TRIP_ID);
    await query;
  }

  console.log("Staging tables cleaned.");
}

main();
