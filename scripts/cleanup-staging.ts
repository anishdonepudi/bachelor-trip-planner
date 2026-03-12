/**
 * Cleanup staging tables for a failed run.
 * Usage: npx tsx scripts/cleanup-staging.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const RUN_ID = process.env.GITHUB_RUN_ID ?? null;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log(`Cleaning staging tables for run ${RUN_ID ?? "all"}...`);

  if (RUN_ID) {
    await supabase.from("flight_options_staging").delete().eq("run_id", RUN_ID);
    await supabase.from("flights_staging").delete().eq("run_id", RUN_ID);
    await supabase.from("airbnb_listings_staging").delete().eq("run_id", RUN_ID);
  } else {
    await supabase.from("flight_options_staging").delete().gte("id", 0);
    await supabase.from("flights_staging").delete().gte("id", 0);
    await supabase.from("airbnb_listings_staging").delete().gte("id", 0);
  }

  console.log("Staging tables cleaned.");
}

main();
