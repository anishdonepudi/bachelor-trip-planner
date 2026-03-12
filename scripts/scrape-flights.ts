/**
 * Google Flights Scraper (Airport-Centric)
 *
 * Each GitHub Actions job passes AIRPORTS env var (e.g. "SFO" or "PHL,ONT").
 * This script scrapes those airports across all date ranges, then writes
 * results to every city that uses those airports.
 *
 * Usage: AIRPORTS=SFO npx tsx scripts/scrape-flights.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { generateDateRanges } from "../src/lib/date-ranges";
import type {
  FlightCategory,
  FlightLeg,
  FlightOptionRow,
} from "../src/lib/types";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

puppeteerExtra.use(StealthPlugin());

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars");
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DESTINATION_AIRPORT = "CUN";

const FLIGHT_CATEGORIES: FlightCategory[] = [
  "nonstop_carryon",
  "nonstop_no_carryon",
  "onestop_carryon",
  "onestop_no_carryon",
];

// Maps each airport to the cities it serves
const AIRPORT_TO_CITIES: Record<string, string[]> = {
  SFO: ["San Francisco"],
  OAK: ["San Francisco"],
  SJC: ["San Francisco"],
  JFK: ["New York City"],
  EWR: ["New York City"],
  LGA: ["New York City"],
  PHL: ["Philadelphia"],
  IAH: ["Houston"],
  HOU: ["Houston"],
  MSY: ["New Orleans"],
  DCA: ["Washington DC"],
  IAD: ["Washington DC"],
  BWI: ["Washington DC"],
  ORD: ["Chicago"],
  MDW: ["Chicago"],
  LAX: ["Los Angeles", "Irvine"],
  BUR: ["Los Angeles"],
  LGB: ["Los Angeles", "Irvine"],
  SNA: ["Los Angeles", "Irvine"],
  PHX: ["Phoenix"],
  AZA: ["Phoenix"],
  ONT: ["Irvine"],
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomDelay(minMs = 3000, maxMs = 8000): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildFlightsUrl(
  airport: string,
  departDate: string,
  returnDate: string
): string {
  return (
    `https://www.google.com/travel/flights?q=Flights+from+${airport}` +
    `+to+${DESTINATION_AIRPORT}+departing+${departDate}+returning+${returnDate}&curr=USD`
  );
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function createScrapeJob(airports: string[]): Promise<number> {
  const { data, error } = await supabase
    .from("scrape_jobs")
    .insert({
      job_type: "flights",
      status: "running",
      started_at: new Date().toISOString(),
      github_run_id: process.env.GITHUB_RUN_ID ?? null,
      progress: { completed: 0, total: 0, current: "initializing", airports },
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to create scrape job: ${error?.message}`);
  return data.id;
}

async function updateJobProgress(
  jobId: number,
  completed: number,
  total: number,
  current: string
): Promise<void> {
  await supabase
    .from("scrape_jobs")
    .update({ progress: { completed, total, current } })
    .eq("id", jobId);
}

async function completeJob(jobId: number, errorMsg?: string): Promise<void> {
  await supabase
    .from("scrape_jobs")
    .update({
      status: errorMsg ? "failed" : "completed",
      completed_at: new Date().toISOString(),
      error_message: errorMsg ?? null,
    })
    .eq("id", jobId);
}

// ---------------------------------------------------------------------------
// Page scraping
// ---------------------------------------------------------------------------

interface ScrapedFlight {
  price: number;
  airline: string;
  stops: number;
  duration: string;
  departTime: string;
  arriveTime: string;
  returnDepartTime: string;
  returnArriveTime: string;
  returnDuration: string;
  returnStops: number;
  layoverAirport?: string;
  layoverDuration?: string;
  returnLayoverAirport?: string;
  returnLayoverDuration?: string;
  hasBaggage: boolean;
}

interface ParsedFlightInfo {
  price: number;
  airline: string;
  stops: number;
  duration: string;
  departTime: string;
  arriveTime: string;
  layoverAirport?: string;
  layoverDuration?: string;
  hasBaggage: boolean;
}

/** Parse flight info from an aria-label string */
function parseAriaLabel(ariaLabel: string): Omit<ParsedFlightInfo, "hasBaggage"> | null {
  const priceMatch = ariaLabel.match(/(\d[\d,]*)\s*US\s*dollars/i);
  if (!priceMatch) return null;
  const price = parseInt(priceMatch[1].replace(/,/g, ""), 10);
  if (!price || price === 0 || price > 99999999) return null;

  let stops = 0;
  if (!/nonstop/i.test(ariaLabel)) {
    const stopMatch = ariaLabel.match(/(\d+)\s*stop/i);
    stops = stopMatch ? parseInt(stopMatch[1], 10) : 0;
  }

  let duration = "";
  const totalDurMatch = ariaLabel.match(/Total duration\s+(.+?)(?:\.|$)/i);
  if (totalDurMatch) duration = totalDurMatch[1].trim();

  let airline = "Unknown";
  const airlineMatch = ariaLabel.match(/flight with\s+(.+?)\./i);
  if (airlineMatch) airline = airlineMatch[1].trim();

  let departTime = "";
  let arriveTime = "";
  const timeMatches = ariaLabel.match(
    /Leaves\s+.+?\s+at\s+(\d{1,2}:\d{2}\s*[AP]M).+?arrives\s+at\s+.+?\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)/i
  );
  if (timeMatches) {
    departTime = timeMatches[1];
    arriveTime = timeMatches[2];
  }

  let layoverDuration: string | undefined;
  const layoverDurMatch = ariaLabel.match(
    /(?:is\s+a\s+)?(\d+\s*hr?\s*(?:\d+\s*min)?|\d+\s*min)\s+(?:overnight\s+)?layover\s+at/i
  );
  if (layoverDurMatch && stops > 0) layoverDuration = layoverDurMatch[1].trim();

  let layoverAirport: string | undefined;
  const layoverMatch = ariaLabel.match(/layover\s+at\s+(.+?)(?:\.\s|$)/i);
  if (layoverMatch && stops > 0) layoverAirport = layoverMatch[1].trim();

  return { price, airline, stops, duration, departTime, arriveTime, layoverAirport, layoverDuration };
}

/** Parse list items on the current page into flight data using aria-labels */
function parseFlightItems(items: { ariaLabel: string; textContent: string }[]): ParsedFlightInfo[] {
  const results: ParsedFlightInfo[] = [];
  for (const item of items) {
    const parsed = parseAriaLabel(item.ariaLabel);
    if (!parsed) continue;
    const hasBaggage = !/does not include overhead bin access/i.test(item.ariaLabel);
    results.push({ ...parsed, hasBaggage });
  }
  return results;
}

/** Extract aria-label data from all li.pIav2d items on the page */
async function extractPageItems(page: Page): Promise<{ ariaLabel: string; textContent: string }[]> {
  return page.evaluate(() => {
    const items = document.querySelectorAll("li.pIav2d");
    const results: { ariaLabel: string; textContent: string }[] = [];
    for (const item of items) {
      const linkEl = item.querySelector("[aria-label]");
      const ariaLabel = linkEl?.getAttribute("aria-label") ?? "";
      if (!ariaLabel) continue;
      results.push({ ariaLabel, textContent: item.textContent ?? "" });
    }
    return results;
  });
}

async function scrapeFlightsPage(
  page: Page,
  url: string
): Promise<ScrapedFlight[]> {
  await page.setUserAgent(pickRandom(USER_AGENTS));
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });

  try {
    await page.waitForSelector("li.pIav2d", { timeout: 15_000 });
  } catch {
    const captcha = await page.$('iframe[src*="recaptcha"], #captcha-form, .g-recaptcha');
    if (captcha) {
      console.warn("    CAPTCHA detected, skipping this page");
      return [];
    }
    console.warn("    No flight results found on page, skipping");
    return [];
  }

  await new Promise((r) => setTimeout(r, 2000));

  // Step 1: Collect outbound flights
  const outboundData = await extractPageItems(page);
  const outboundFlights = parseFlightItems(outboundData);
  if (outboundFlights.length === 0) return [];

  // Step 2: Click cheapest per category to get return flight details
  const seenCategories = new Set<string>();
  const flightsToClick: { index: number; outbound: ParsedFlightInfo }[] = [];

  for (let i = 0; i < outboundFlights.length; i++) {
    const f = outboundFlights[i];
    const cat = (f.stops === 0 ? "nonstop" : "onestop") + "_" + (f.hasBaggage ? "carryon" : "no_carryon");
    if (!seenCategories.has(cat)) {
      seenCategories.add(cat);
      flightsToClick.push({ index: i, outbound: f });
    }
  }

  const results: ScrapedFlight[] = [];

  for (const { index, outbound } of flightsToClick) {
    try {
      const items = await page.$$("li.pIav2d");
      if (index >= items.length) continue;

      await items[index].click();
      await new Promise((r) => setTimeout(r, 3000));

      try {
        await page.waitForSelector("li.pIav2d", { timeout: 10_000 });
      } catch {
        console.warn("      No return flights loaded, skipping");
        await page.goBack({ waitUntil: "networkidle2", timeout: 30_000 });
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const returnData = await extractPageItems(page);
      const returnFlights = parseFlightItems(returnData);

      const bestReturn = returnFlights.length > 0
        ? returnFlights.reduce((a, b) => (a.price <= b.price ? a : b))
        : null;

      results.push({
        price: outbound.price,
        airline: outbound.airline,
        stops: outbound.stops,
        duration: outbound.duration,
        departTime: outbound.departTime,
        arriveTime: outbound.arriveTime,
        layoverAirport: outbound.layoverAirport,
        layoverDuration: outbound.layoverDuration,
        returnDepartTime: bestReturn?.departTime ?? "",
        returnArriveTime: bestReturn?.arriveTime ?? "",
        returnDuration: bestReturn?.duration ?? "",
        returnStops: bestReturn?.stops ?? outbound.stops,
        returnLayoverAirport: bestReturn?.layoverAirport,
        returnLayoverDuration: bestReturn?.layoverDuration,
        hasBaggage: outbound.hasBaggage,
      });

      const layoverInfo = outbound.layoverAirport
        ? ` | layover: ${outbound.layoverDuration} at ${outbound.layoverAirport}`
        : "";
      const retLayoverInfo = bestReturn?.layoverAirport
        ? ` | layover: ${bestReturn.layoverDuration} at ${bestReturn.layoverAirport}`
        : "";
      console.log(
        `      Outbound: $${outbound.price} ${outbound.airline} (${outbound.stops} stops, ${outbound.duration})${layoverInfo}`
      );
      console.log(
        `      Return:   ${bestReturn ? `${bestReturn.airline} (${bestReturn.stops} stops, ${bestReturn.duration})${retLayoverInfo}` : "none found"}`
      );

      await page.goBack({ waitUntil: "networkidle2", timeout: 30_000 });
      await new Promise((r) => setTimeout(r, 2000));

      try {
        await page.waitForSelector("li.pIav2d", { timeout: 10_000 });
      } catch {
        console.warn("      Could not return to outbound list, stopping click-through");
        break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`      Click-through error: ${msg}`);
      try {
        await page.goBack({ waitUntil: "networkidle2", timeout: 15_000 });
        await new Promise((r) => setTimeout(r, 2000));
      } catch {
        break;
      }
    }
  }

  // Include remaining outbound flights without return details
  for (let i = 0; i < outboundFlights.length; i++) {
    if (flightsToClick.some((c) => c.index === i)) continue;
    const f = outboundFlights[i];
    results.push({
      price: f.price,
      airline: f.airline,
      stops: f.stops,
      duration: f.duration,
      departTime: f.departTime,
      arriveTime: f.arriveTime,
      layoverAirport: f.layoverAirport,
      layoverDuration: f.layoverDuration,
      returnDepartTime: "",
      returnArriveTime: "",
      returnDuration: "",
      returnStops: f.stops,
      hasBaggage: f.hasBaggage,
    });
  }

  return results;
}

function categorizeFlight(flight: ScrapedFlight): FlightCategory {
  const isNonstop = flight.stops === 0;
  const hasCarryOn = flight.hasBaggage;

  if (isNonstop && hasCarryOn) return "nonstop_carryon";
  if (isNonstop && !hasCarryOn) return "nonstop_no_carryon";
  if (!isNonstop && hasCarryOn) return "onestop_carryon";
  return "onestop_no_carryon";
}

function buildFlightLeg(flight: ScrapedFlight, leg: "outbound" | "return"): FlightLeg {
  if (leg === "outbound") {
    return {
      departTime: flight.departTime,
      arriveTime: flight.arriveTime,
      duration: flight.duration,
      stops: flight.stops,
      layoverAirport: flight.layoverAirport,
      layoverDuration: flight.layoverDuration,
    };
  }
  return {
    departTime: flight.returnDepartTime,
    arriveTime: flight.returnArriveTime,
    duration: flight.returnDuration,
    stops: flight.returnStops,
    layoverAirport: flight.returnLayoverAirport,
    layoverDuration: flight.returnLayoverDuration,
  };
}

// ---------------------------------------------------------------------------
// Main orchestration
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Parse input airports from env
  const airportsEnv = process.env.AIRPORTS;
  if (!airportsEnv) {
    console.error("Missing AIRPORTS env var (e.g. AIRPORTS=SFO or AIRPORTS=PHL,ONT)");
    process.exit(1);
  }

  const inputAirports = airportsEnv.split(",").map((a) => a.trim());

  // Derive all cities served by these airports
  const targetCities = new Set<string>();
  for (const airport of inputAirports) {
    const cities = AIRPORT_TO_CITIES[airport];
    if (!cities) {
      console.error(`Unknown airport: ${airport}`);
      process.exit(1);
    }
    for (const city of cities) targetCities.add(city);
  }

  console.log("=== Google Flights Scraper ===");
  console.log(`Started at ${new Date().toISOString()}`);
  console.log(`Airports: ${inputAirports.join(", ")}`);
  console.log(`Target cities: ${[...targetCities].join(", ")}`);

  const dateRanges = generateDateRanges();
  const totalTasks = inputAirports.length * dateRanges.length;
  let completedTasks = 0;

  console.log(`Date ranges: ${dateRanges.length}`);
  console.log(`Total tasks: ${totalTasks}\n`);

  const jobId = await createScrapeJob(inputAirports);

  let browser: Browser | null = null;

  try {
    browser = await puppeteerExtra.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1920,1080",
      ],
    });

    for (const dateRange of dateRanges) {
      console.log(`\n--- ${dateRange.id} (${dateRange.format}) ---`);

      // Scrape each airport for this date range
      const scrapedByAirport = new Map<string, { flights: ScrapedFlight[]; url: string }>();

      for (const airport of inputAirports) {
        completedTasks++;
        const taskLabel = `${airport} | ${dateRange.id}`;
        console.log(`  [${completedTasks}/${totalTasks}] ${taskLabel} - scraping...`);
        await updateJobProgress(jobId, completedTasks, totalTasks, taskLabel);

        const url = buildFlightsUrl(airport, dateRange.departDate, dateRange.returnDate);

        try {
          const page = await browser!.newPage();
          await page.setViewport({ width: 1920, height: 1080 });
          const flights = await scrapeFlightsPage(page, url);
          console.log(`    ${airport}: ${flights.length} results`);
          scrapedByAirport.set(airport, { flights, url });
          await page.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`    ${airport}: ERROR - ${msg}`);
        }

        if (inputAirports.length > 1) await randomDelay();
      }

      // Write results for each target city
      const now = new Date().toISOString();

      for (const city of targetCities) {
        // Find which of our input airports serve this city
        const cityAirports = inputAirports.filter(
          (a) => AIRPORT_TO_CITIES[a]?.includes(city)
        );

        // Collect all flight options for this city from its airports
        const allOptions: {
          airport: string;
          category: FlightCategory;
          flight: ScrapedFlight;
          url: string;
        }[] = [];

        for (const airport of cityAirports) {
          const data = scrapedByAirport.get(airport);
          if (!data) continue;
          for (const f of data.flights) {
            allOptions.push({
              airport,
              category: categorizeFlight(f),
              flight: f,
              url: data.url,
            });
          }
        }

        if (allOptions.length === 0) continue;

        // Build flight_options rows
        const optionRows: FlightOptionRow[] = allOptions.map((opt) => ({
          date_range_id: dateRange.id,
          origin_city: city,
          category: opt.category,
          airport_used: opt.airport,
          price: opt.flight.price,
          airline: opt.flight.airline,
          outbound_details: buildFlightLeg(opt.flight, "outbound"),
          return_details: buildFlightLeg(opt.flight, "return"),
          google_flights_url: opt.url,
          is_best: false,
          scraped_at: now,
        }));

        // Delete old options scoped to these specific airports (not all airports for the city)
        for (const airport of cityAirports) {
          await supabase
            .from("flight_options")
            .delete()
            .eq("date_range_id", dateRange.id)
            .eq("origin_city", city)
            .eq("airport_used", airport);
        }

        // Insert in batches of 50
        for (let i = 0; i < optionRows.length; i += 50) {
          const batch = optionRows.slice(i, i + 50);
          const { error } = await supabase.from("flight_options").insert(batch);
          if (error) {
            console.error(`    DB insert error (flight_options, ${city}): ${error.message}`);
          }
        }

        console.log(`    → ${city}: ${optionRows.length} options saved`);
      }
    }

    await completeJob(jobId);
    console.log(`\nCompleted at ${new Date().toISOString()}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Fatal error: ${msg}`);
    await completeJob(jobId, msg);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
