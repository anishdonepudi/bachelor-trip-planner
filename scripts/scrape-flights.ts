/**
 * Google Flights Scraper (Airport-Centric, Filter-Based)
 *
 * Each GitHub Actions job passes AIRPORTS env var (e.g. "SFO").
 * For each date range, this script loads Google Flights 4 times (once per
 * category), applies UI filters (stops, bags, duration < 10hrs, sort by price),
 * grabs the top 3 outbound flights, clicks each to find the cheapest return,
 * and writes results to flight_options for every city that uses the airport.
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

// Category → filter settings
const CATEGORY_FILTERS: Record<FlightCategory, { stops: "nonstop" | "1stop"; bags: "carryon" | "none" }> = {
  nonstop_carryon: { stops: "nonstop", bags: "carryon" },
  nonstop_no_carryon: { stops: "nonstop", bags: "none" },
  onestop_carryon: { stops: "1stop", bags: "carryon" },
  onestop_no_carryon: { stops: "1stop", bags: "none" },
};

const TOP_N_OUTBOUND = 3;

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

function randomDelay(minMs = 2000, maxMs = 5000): Promise<void> {
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
// Google Flights filter helpers
// ---------------------------------------------------------------------------

/** Click a dropdown option by matching text content inside the currently open dropdown */
async function clickDropdownOption(page: Page, textMatch: string): Promise<boolean> {
  return page.evaluate((text: string) => {
    const allEls = document.querySelectorAll("li, label, div[role='option'], div[role='menuitem'], span");
    for (const el of allEls) {
      const elText = el.textContent?.trim() ?? "";
      if (elText === text || elText.includes(text)) {
        (el as HTMLElement).click();
        return true;
      }
    }
    return false;
  }, textMatch);
}

/** Close an open dropdown by clicking Done/Close button or body */
async function closeDropdown(page: Page): Promise<void> {
  const closed = await page.evaluate(() => {
    const buttons = document.querySelectorAll("button");
    for (const b of buttons) {
      const text = b.textContent?.trim() ?? "";
      if (text === "Done" || text === "Close") {
        (b as HTMLElement).click();
        return true;
      }
    }
    return false;
  });
  if (!closed) {
    await page.click("body");
  }
  await new Promise((r) => setTimeout(r, 1000));
}

/**
 * Apply the "Stops" filter on Google Flights.
 */
async function applyStopsFilter(page: Page, stops: "nonstop" | "1stop"): Promise<void> {
  const btn = await page.$('button[aria-label^="Stops"]');
  if (!btn) {
    console.warn("      Could not find Stops filter button");
    return;
  }
  await btn.click();
  await new Promise((r) => setTimeout(r, 1500));

  const target = stops === "nonstop" ? "Nonstop only" : "1 stop or fewer";
  const clicked = await clickDropdownOption(page, target);
  if (!clicked) console.warn(`      Could not find "${target}" option`);

  await new Promise((r) => setTimeout(r, 1000));
  await page.click("body");
  await new Promise((r) => setTimeout(r, 1500));
}

/**
 * Apply the "Bags" filter: increment carry-on bag count to 1.
 */
async function applyBagsFilter(page: Page, bags: "carryon" | "none"): Promise<void> {
  if (bags === "none") return;

  const btn = await page.$('button[aria-label^="Bags"]');
  if (!btn) {
    console.warn("      Could not find Bags filter button");
    return;
  }
  await btn.click();
  await new Promise((r) => setTimeout(r, 1500));

  // Click the "Add carry-on bag" button
  const clicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll("button");
    for (const b of buttons) {
      const aria = b.getAttribute("aria-label") ?? "";
      if (aria.toLowerCase().includes("carry-on") &&
          (aria.toLowerCase().includes("add") || aria.toLowerCase().includes("increase"))) {
        (b as HTMLElement).click();
        return true;
      }
    }
    return false;
  });
  if (!clicked) console.warn("      Could not find carry-on increment button");

  await new Promise((r) => setTimeout(r, 1500));
  await closeDropdown(page);
}

/**
 * Apply the "Duration" filter: set max flight duration to 10 hours.
 * The duration dropdown has an <input type="range" aria-label="Duration">.
 */
async function applyDurationFilter(page: Page): Promise<void> {
  const btn = await page.$('button[aria-label^="Duration"]');
  if (!btn) {
    console.warn("      Could not find Duration filter button");
    return;
  }
  await btn.click();
  await new Promise((r) => setTimeout(r, 1500));

  // The slider is an <input type="range" aria-label="Duration">
  const adjusted = await page.evaluate(() => {
    const slider = document.querySelector('input[aria-label="Duration"]') as HTMLInputElement | null;
    if (!slider) return null;

    const max = parseInt(slider.max || (slider.getAttribute("aria-valuemax") ?? "0"), 10);
    const min = parseInt(slider.min || (slider.getAttribute("aria-valuemin") ?? "0"), 10);
    const current = parseInt(slider.value || (slider.getAttribute("aria-valuenow") ?? "0"), 10);
    const target = 10; // 10 hours

    if (target >= max || target <= min) return { min, max, current, target, moved: false };

    // Focus the slider for keyboard interaction
    slider.focus();
    return { min, max, current, target, moved: true };
  });

  if (adjusted?.moved) {
    // Press Home to go to min, then ArrowRight to reach target
    await page.keyboard.press("Home");
    await new Promise((r) => setTimeout(r, 200));

    const stepsNeeded = adjusted.target - adjusted.min;
    for (let i = 0; i < stepsNeeded; i++) {
      await page.keyboard.press("ArrowRight");
    }
    await new Promise((r) => setTimeout(r, 500));

    // Verify new value
    const newVal = await page.evaluate(() => {
      const s = document.querySelector('input[aria-label="Duration"]') as HTMLInputElement | null;
      return s?.value ?? "unknown";
    });
    console.log(`      Duration slider set to ${newVal} hours`);
  } else if (adjusted) {
    console.log(`      Duration slider range ${adjusted.min}-${adjusted.max}h, no adjustment needed`);
  } else {
    console.warn("      Could not find duration slider");
  }

  await closeDropdown(page);
}

/**
 * Sort results by price using the "Sorted by" dropdown.
 * The dropdown renders sort options as li.VfPpkd-StrnGf-rymPhb-ibnC6b elements.
 */
async function applySortByPrice(page: Page): Promise<void> {
  const btn = await page.$('button[aria-label^="Sorted by"]');
  if (!btn) {
    console.warn("      Could not find Sort dropdown");
    return;
  }
  await btn.click();
  await new Promise((r) => setTimeout(r, 1500));

  // Click the "Price" option in the sort dropdown
  // Sort options are li elements with span children; click the li whose span text is "Price"
  const clicked = await page.evaluate(() => {
    const listItems = document.querySelectorAll("li");
    for (const li of listItems) {
      const spans = li.querySelectorAll("span");
      for (const span of spans) {
        if (span.textContent?.trim() === "Price" && span.parentElement?.closest("li")) {
          // Click both span and parent li for reliability
          span.click();
          return true;
        }
      }
    }
    return false;
  });

  if (!clicked) console.warn("      Could not find Price sort option");
  await new Promise((r) => setTimeout(r, 2000));
}

/**
 * Apply all filters for a given category.
 * Order: stops → bags → duration → sort by price
 */
async function applyFilters(page: Page, category: FlightCategory): Promise<void> {
  const filters = CATEGORY_FILTERS[category];
  console.log(`      Applying filters: stops=${filters.stops}, bags=${filters.bags}`);

  await applyStopsFilter(page, filters.stops);
  await applyBagsFilter(page, filters.bags);
  await applyDurationFilter(page);
  await applySortByPrice(page);

  // Wait for results to reload after filtering
  await new Promise((r) => setTimeout(r, 2000));
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
  category: FlightCategory;
  filteredUrl: string;
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
}

/** Parse flight info from an aria-label string */
function parseAriaLabel(ariaLabel: string): ParsedFlightInfo | null {
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
function parseFlightItems(items: { ariaLabel: string }[]): ParsedFlightInfo[] {
  const results: ParsedFlightInfo[] = [];
  for (const item of items) {
    const parsed = parseAriaLabel(item.ariaLabel);
    if (!parsed) continue;
    results.push(parsed);
  }
  return results;
}

/** Extract aria-label data from all li.pIav2d items on the page */
async function extractPageItems(page: Page): Promise<{ ariaLabel: string }[]> {
  return page.evaluate(() => {
    const items = document.querySelectorAll("li.pIav2d");
    const results: { ariaLabel: string }[] = [];
    for (const item of items) {
      const linkEl = item.querySelector("[aria-label]");
      const ariaLabel = linkEl?.getAttribute("aria-label") ?? "";
      if (!ariaLabel) continue;
      results.push({ ariaLabel });
    }
    return results;
  });
}

/**
 * Scrape a single category for an airport+date range.
 * 1. Load Google Flights page
 * 2. Apply filters (stops, bags, duration, sort)
 * 3. Get top 3 outbound flights
 * 4. Click each → get cheapest return
 * 5. Capture filtered URL
 */
async function scrapeCategoryPage(
  page: Page,
  baseUrl: string,
  category: FlightCategory
): Promise<ScrapedFlight[]> {
  await page.setUserAgent(pickRandom(USER_AGENTS));
  await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 60_000 });

  try {
    await page.waitForSelector("li.pIav2d", { timeout: 15_000 });
  } catch {
    const captcha = await page.$('iframe[src*="recaptcha"], #captcha-form, .g-recaptcha');
    if (captcha) {
      console.warn("    CAPTCHA detected, skipping");
      return [];
    }
    console.warn("    No flight results found on page, skipping");
    return [];
  }

  await new Promise((r) => setTimeout(r, 2000));

  // Apply filters for this category
  await applyFilters(page, category);

  // Wait for results to update after filtering
  try {
    await page.waitForSelector("li.pIav2d", { timeout: 10_000 });
  } catch {
    console.warn(`      No results after applying ${category} filters`);
    return [];
  }

  await new Promise((r) => setTimeout(r, 1500));

  // Capture the filtered URL from address bar
  const filteredUrl = page.url();

  // Get outbound flights (already sorted by price due to filter)
  const outboundData = await extractPageItems(page);
  const outboundFlights = parseFlightItems(outboundData);

  if (outboundFlights.length === 0) {
    console.log(`      No outbound flights found for ${category}`);
    return [];
  }

  // Take top N outbound flights
  const topOutbounds = outboundFlights.slice(0, TOP_N_OUTBOUND);
  console.log(`      Found ${outboundFlights.length} outbounds, taking top ${topOutbounds.length}`);

  const results: ScrapedFlight[] = [];

  // Click each top outbound to get cheapest return
  for (let i = 0; i < topOutbounds.length; i++) {
    const outbound = topOutbounds[i];

    try {
      const items = await page.$$("li.pIav2d");
      if (i >= items.length) {
        console.warn(`      Outbound index ${i} out of range (${items.length} items)`);
        continue;
      }

      await items[i].click();
      await new Promise((r) => setTimeout(r, 3000));

      try {
        await page.waitForSelector("li.pIav2d", { timeout: 10_000 });
      } catch {
        console.warn(`      No return flights loaded for outbound #${i + 1}`);
        await page.goBack({ waitUntil: "networkidle2", timeout: 30_000 });
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      // Parse return flights and find cheapest
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
        category,
        filteredUrl,
      });

      const layoverInfo = outbound.layoverAirport
        ? ` | layover: ${outbound.layoverDuration} at ${outbound.layoverAirport}`
        : "";
      const retLayoverInfo = bestReturn?.layoverAirport
        ? ` | layover: ${bestReturn.layoverDuration} at ${bestReturn.layoverAirport}`
        : "";
      console.log(
        `        #${i + 1}: $${outbound.price} ${outbound.airline} (${outbound.stops} stops, ${outbound.duration})${layoverInfo}`
      );
      console.log(
        `          Return: ${bestReturn ? `${bestReturn.airline} (${bestReturn.stops} stops, ${bestReturn.duration})${retLayoverInfo}` : "none"}`
      );

      // Go back to outbound list
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
      console.warn(`      Click-through error for outbound #${i + 1}: ${msg}`);
      try {
        await page.goBack({ waitUntil: "networkidle2", timeout: 15_000 });
        await new Promise((r) => setTimeout(r, 2000));
      } catch {
        break;
      }
    }
  }

  return results;
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
  const airportsEnv = process.env.AIRPORTS;
  if (!airportsEnv) {
    console.error("Missing AIRPORTS env var (e.g. AIRPORTS=SFO)");
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

  console.log("=== Google Flights Scraper (Filter-Based) ===");
  console.log(`Started at ${new Date().toISOString()}`);
  console.log(`Airports: ${inputAirports.join(", ")}`);
  console.log(`Target cities: ${[...targetCities].join(", ")}`);

  const dateRanges = generateDateRanges();
  // 4 categories per airport per date range
  const totalTasks = inputAirports.length * dateRanges.length * FLIGHT_CATEGORIES.length;
  let completedTasks = 0;

  console.log(`Date ranges: ${dateRanges.length}`);
  console.log(`Categories: ${FLIGHT_CATEGORIES.length}`);
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

      for (const airport of inputAirports) {
        const baseUrl = buildFlightsUrl(airport, dateRange.departDate, dateRange.returnDate);

        // All scraped flights for this airport + date range (across categories)
        const allScraped: ScrapedFlight[] = [];

        for (const category of FLIGHT_CATEGORIES) {
          completedTasks++;
          const taskLabel = `${airport} | ${dateRange.id} | ${category}`;
          console.log(`  [${completedTasks}/${totalTasks}] ${taskLabel}`);
          await updateJobProgress(jobId, completedTasks, totalTasks, taskLabel);

          try {
            const page = await browser!.newPage();
            await page.setViewport({ width: 1920, height: 1080 });

            const flights = await scrapeCategoryPage(page, baseUrl, category);
            console.log(`    ${category}: ${flights.length} results`);
            allScraped.push(...flights);

            await page.close();
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`    ${category}: ERROR - ${msg}`);
          }

          // Small delay between category page loads
          await randomDelay(1500, 3000);
        }

        // Write results for each target city
        const now = new Date().toISOString();

        for (const city of targetCities) {
          // Only write if this airport serves this city
          if (!AIRPORT_TO_CITIES[airport]?.includes(city)) continue;

          if (allScraped.length === 0) continue;

          // Build flight_options rows
          const optionRows: FlightOptionRow[] = allScraped.map((f) => ({
            date_range_id: dateRange.id,
            origin_city: city,
            category: f.category,
            airport_used: airport,
            price: f.price,
            airline: f.airline,
            outbound_details: buildFlightLeg(f, "outbound"),
            return_details: buildFlightLeg(f, "return"),
            google_flights_url: f.filteredUrl,
            is_best: false,
            scraped_at: now,
          }));

          // Delete old options for this airport + date range + city
          await supabase
            .from("flight_options")
            .delete()
            .eq("date_range_id", dateRange.id)
            .eq("origin_city", city)
            .eq("airport_used", airport);

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

        // Delay between airports if there are multiple
        if (inputAirports.length > 1) await randomDelay();
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
