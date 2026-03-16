/**
 * Reads config from Supabase and outputs a JSON matrix of airports
 * for GitHub Actions dynamic matrix strategy.
 *
 * Output format: { "include": [{ "name": "SFO", "airports": "SFO" }, ...] }
 *
 * Airports are grouped to keep total jobs ≤ 20 (GitHub Actions limit).
 */

import { loadTripConfig } from "./lib/load-trip-config";

const MAX_JOBS = 19;

async function main() {
  const config = await loadTripConfig();
  const cities = config.cities;

  // Collect all unique airports
  const allAirports = new Set<string>();
  for (const c of cities) {
    for (const apt of [...c.primaryAirports, ...c.nearbyAirports]) {
      allAirports.add(apt);
    }
  }

  const airports = [...allAirports].sort();
  console.error(`Found ${airports.length} unique airports from ${cities.length} cities`);

  // Always distribute airports across exactly MAX_JOBS jobs
  const entries: { name: string; airports: string }[] = [];

  if (airports.length === 0) {
    console.error("No airports found");
    process.exit(1);
  }

  // Initialize job buckets
  for (let i = 0; i < MAX_JOBS; i++) {
    entries.push({ name: "", airports: "" });
  }

  // Round-robin distribute airports across jobs
  for (let i = 0; i < airports.length; i++) {
    const jobIdx = i % MAX_JOBS;
    const existing = entries[jobIdx].airports;
    entries[jobIdx].airports = existing ? `${existing},${airports[i]}` : airports[i];
  }

  // Remove empty jobs (only if fewer airports than MAX_JOBS) and set names
  const filledEntries = entries
    .filter((e) => e.airports !== "")
    .map((e) => ({
      name: e.airports.replace(/,/g, "+"),
      airports: e.airports,
    }));

  // Output the matrix JSON to stdout (GitHub Actions reads this)
  const matrix = { include: filledEntries };
  console.error(`Created ${filledEntries.length} jobs for ${airports.length} airports`);
  console.log(JSON.stringify(matrix));
}

main();
