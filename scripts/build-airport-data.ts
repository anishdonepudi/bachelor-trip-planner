/**
 * Downloads OurAirports CSV and generates a compact JSON dataset
 * of commercial airports with IATA codes.
 *
 * Usage: npx tsx scripts/build-airport-data.ts
 */

import * as fs from "fs";
import * as path from "path";

const CSV_URL =
  "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv";

interface Airport {
  iata: string;
  name: string;
  lat: number;
  lng: number;
  type: "large_airport" | "medium_airport";
  country: string;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

async function main() {
  console.log("Downloading airports.csv from OurAirports...");
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const csv = await res.text();

  const lines = csv.split("\n");
  const header = parseCsvLine(lines[0]);

  const idx = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`Column "${name}" not found in CSV`);
    return i;
  };

  const iType = idx("type");
  const iName = idx("name");
  const iLat = idx("latitude_deg");
  const iLng = idx("longitude_deg");
  const iCountry = idx("iso_country");
  const iIata = idx("iata_code");
  const iScheduled = idx("scheduled_service");

  const airports: Airport[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCsvLine(line);

    const type = cols[iType];
    if (type !== "large_airport" && type !== "medium_airport") continue;

    const iata = cols[iIata]?.trim();
    if (!iata || iata.length !== 3) continue;

    const scheduled = cols[iScheduled]?.trim();
    if (scheduled !== "yes") continue;

    if (seen.has(iata)) continue;
    seen.add(iata);

    airports.push({
      iata,
      name: cols[iName]?.trim().replace(/"/g, ""),
      lat: parseFloat(cols[iLat]),
      lng: parseFloat(cols[iLng]),
      type: type as Airport["type"],
      country: cols[iCountry]?.trim(),
    });
  }

  const outPath = path.join(__dirname, "..", "src", "data", "airports.json");
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(outPath, JSON.stringify(airports));
  console.log(`Wrote ${airports.length} airports to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
