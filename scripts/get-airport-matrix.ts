/**
 * Reads config from Supabase and outputs a JSON matrix of airports
 * for GitHub Actions dynamic matrix strategy.
 *
 * Output format: { "include": [{ "name": "SFO", "airports": "SFO" }, ...] }
 *
 * Airports are grouped to keep total jobs ≤ 20 (GitHub Actions limit).
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const MAX_JOBS = 19;

async function main() {
  const { data, error } = await supabase
    .from("config")
    .select("cities")
    .limit(1)
    .single();

  if (error || !data?.cities) {
    console.error("Failed to load config:", error);
    process.exit(1);
  }

  const cities = data.cities as {
    city: string;
    primaryAirports: string[];
    nearbyAirports: string[];
  }[];

  // Collect all unique airports
  const allAirports = new Set<string>();
  for (const c of cities) {
    for (const apt of [...c.primaryAirports, ...c.nearbyAirports]) {
      allAirports.add(apt);
    }
  }

  const airports = [...allAirports].sort();
  console.error(`Found ${airports.length} unique airports from ${cities.length} cities`);

  // If we have more airports than max jobs, group them
  let entries: { name: string; airports: string }[];

  if (airports.length <= MAX_JOBS) {
    // One job per airport
    entries = airports.map((apt) => ({ name: apt, airports: apt }));
  } else {
    // Group airports to fit within MAX_JOBS
    const groupSize = Math.ceil(airports.length / MAX_JOBS);
    entries = [];
    for (let i = 0; i < airports.length; i += groupSize) {
      const group = airports.slice(i, i + groupSize);
      entries.push({
        name: group.join("+"),
        airports: group.join(","),
      });
    }
  }

  // Output the matrix JSON to stdout (GitHub Actions reads this)
  const matrix = { include: entries };
  console.log(JSON.stringify(matrix));
}

main();
