/**
 * Google Flights Scraper (Click-Free API Interception)
 *
 * Uses network interception to capture structured flight data from Google's
 * internal GetShoppingResults API. Return flights are fetched via direct POST
 * requests using tokens from the outbound API response — no clicking needed.
 *
 * Per airport + date range, runs 4 parallel pages (one per category):
 *   1. nonstop_no_carryon  — load page, POST for returns
 *   2. onestop_no_carryon  — load page, POST for returns
 *   3. nonstop_carryon     — load page + carry-on filter, POST for returns
 *   4. onestop_carryon     — load page + carry-on filter, POST for returns
 *
 * Each page:
 *   1. Load page, optionally apply carry-on bag filter
 *   2. Intercept outbound API → extract tokens + segment data
 *   3. For each top N outbound: POST directly to get return flights
 *   4. Pair each outbound with its specific return flight
 *   5. Skip records with no valid return
 *
 * Usage: AIRPORTS=IAH,SFO npx tsx scripts/scrape-flights.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { generateDateRanges } from "../src/lib/date-ranges";
import type {
  FlightCategory,
  FlightLeg,
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

const CATEGORIES_TO_SCRAPE: FlightCategory[] = [
  "nonstop_carryon",
  "nonstop_no_carryon",
  "onestop_carryon",
  "onestop_no_carryon",
];

const TOP_N_PER_CATEGORY = 3;
const MAX_DURATION_MINUTES = 10 * 60; // 10 hours

// Built dynamically from Supabase config at startup
let AIRPORT_TO_CITIES: Record<string, string[]> = {};

async function loadAirportToCities(): Promise<void> {
  const { data, error } = await supabase
    .from("config")
    .select("cities")
    .limit(1)
    .single();

  if (error || !data?.cities) {
    console.error("Failed to load config from Supabase, using empty map");
    return;
  }

  const cities = data.cities as { city: string; primaryAirports: string[]; nearbyAirports: string[] }[];
  const map: Record<string, string[]> = {};

  for (const c of cities) {
    for (const apt of [...c.primaryAirports, ...c.nearbyAirports]) {
      if (!map[apt]) map[apt] = [];
      if (!map[apt].includes(c.city)) map[apt].push(c.city);
    }
  }

  AIRPORT_TO_CITIES = map;
  console.log(`Loaded airport map: ${Object.keys(map).length} airports, ${cities.length} cities`);
}

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
// API Response Parsing
// ---------------------------------------------------------------------------

interface SegmentInfo {
  origin: string;
  dest: string;
  date: string;
  airlineCode: string;
  flightNumber: string;
}

interface ApiParsedFlight {
  airline: string;
  airlineCode: string;
  origin: string;
  dest: string;
  departTime: string;
  arriveTime: string;
  departDate: string;
  arriveDate: string;
  duration: number;
  stops: number;
  price: number;
  layoverAirport?: string;
  layoverDuration?: number;
  token: string;
  segments: SegmentInfo[];
}

interface CapturedApiCall {
  body: string;
  resolved: boolean;
}

/**
 * Parse Google's multi-part response format.
 * Response starts with )]}' prefix, then alternating length\njson\n blocks.
 */
function parseMultiPart(body: string): unknown[] {
  let cleaned = body;
  if (cleaned.startsWith(")]}'")) cleaned = cleaned.substring(4).trim();
  const lines = cleaned.split("\n");
  const parts: unknown[] = [];
  let pos = 0;
  while (pos < lines.length) {
    const lenStr = lines[pos]?.trim();
    if (!lenStr || !/^\d+$/.test(lenStr)) { pos++; continue; }
    pos++;
    if (pos >= lines.length) break;
    const jsonStr = lines[pos].trim();
    pos++;
    try { parts.push(JSON.parse(jsonStr)); } catch {}
  }
  return parts;
}

/**
 * Extract inner flight data from wrb.fr wrapper.
 */
function extractInner(parts: unknown[]): any[] {
  const results: any[] = [];
  for (const part of parts) {
    if (!Array.isArray(part) || !part[0]) continue;
    const wrapper = part[0];
    if (!Array.isArray(wrapper) || wrapper[0] !== "wrb.fr") continue;
    const innerStr = wrapper[2];
    if (typeof innerStr !== "string") continue;
    try { results.push(JSON.parse(innerStr)); } catch {}
  }
  return results;
}

/**
 * Parse structured flight data from API inner response.
 * Extracts token and segment data needed for click-free return requests.
 * Filters: duration ≤ MAX_DURATION_MINUTES, stops 0 or 1.
 * Sorts by price ascending.
 */
function parseFlightsFromApi(inner: any[]): { nonstop: ApiParsedFlight[]; onestop: ApiParsedFlight[] } {
  const nonstop: ApiParsedFlight[] = [];
  const onestop: ApiParsedFlight[] = [];

  for (const idx of [2, 3]) {
    if (!inner[idx]?.[0] || !Array.isArray(inner[idx][0])) continue;
    const flights = inner[idx][0];

    for (const item of flights) {
      const d = item[0];
      if (!d) continue;

      const rawSegments = d[2] ?? [];
      const stops = rawSegments.length > 0 ? rawSegments.length - 1 : 0;
      const dep = d[5];
      const arr = d[8];
      const depDate = rawSegments[0]?.[20];
      const arrDate = rawSegments[rawSegments.length - 1]?.[21];

      // Extract token for click-free POST requests
      const token = item[1]?.[1];
      if (typeof token !== "string" || token.length < 20) continue;

      // Extract per-segment data for POST body construction
      const segments: SegmentInfo[] = [];
      for (const seg of rawSegments) {
        const flightCode = seg?.[22]; // [airlineCode, flightNumber, null, airlineName]
        const segOrigin = seg?.[3];   // origin airport code
        const segDest = seg?.[6];     // destination airport code
        const segDate = seg?.[20];    // [year, month, day]
        if (!flightCode || !segOrigin || !segDest || !segDate) continue;
        segments.push({
          origin: segOrigin,
          dest: segDest,
          date: `${segDate[0]}-${String(segDate[1]).padStart(2, "0")}-${String(segDate[2]).padStart(2, "0")}`,
          airlineCode: flightCode[0],
          flightNumber: flightCode[1],
        });
      }
      if (segments.length === 0) continue;

      let layoverAirport: string | undefined;
      let layoverDuration: number | undefined;
      if (stops === 1 && d[13]?.[0]) {
        layoverDuration = d[13][0][0];
        layoverAirport = d[13][0][1] ?? d[13][0][2];
      }

      const flight: ApiParsedFlight = {
        airline: d[1]?.[0] ?? d[0] ?? "Unknown",
        airlineCode: d[0] ?? "??",
        origin: d[3] ?? "?",
        dest: d[6] ?? "?",
        departTime: dep && dep[0] != null ? `${dep[0]}:${String(dep[1] ?? 0).padStart(2, "0")}` : "?",
        arriveTime: arr && arr[0] != null ? `${arr[0]}:${String(arr[1] ?? 0).padStart(2, "0")}` : "?",
        departDate: depDate ? `${depDate[0]}-${String(depDate[1]).padStart(2, "0")}-${String(depDate[2]).padStart(2, "0")}` : "?",
        arriveDate: arrDate ? `${arrDate[0]}-${String(arrDate[1]).padStart(2, "0")}-${String(arrDate[2]).padStart(2, "0")}` : "?",
        duration: d[9] ?? 0,
        stops,
        price: item[1]?.[0]?.[1] ?? 0,
        layoverAirport,
        layoverDuration,
        token,
        segments,
      };

      if (flight.duration > MAX_DURATION_MINUTES) continue;

      if (stops === 0) nonstop.push(flight);
      else if (stops === 1) onestop.push(flight);
    }
  }

  nonstop.sort((a, b) => a.price - b.price);
  onestop.sort((a, b) => a.price - b.price);

  return { nonstop, onestop };
}

// ---------------------------------------------------------------------------
// Click-Free Return Flight Requests
// ---------------------------------------------------------------------------

/**
 * Build the f.req value for requesting return flights for a specific outbound.
 * Uses the outbound flight's token and segment data to construct the POST body
 * that Google Flights normally sends when a user clicks an outbound flight.
 */
function buildFreqValue(
  token: string,
  segments: SegmentInfo[],
  originAirport: string,
  destAirport: string,
  departDate: string,
  returnDate: string
): string {
  const segEntries = segments.map(s =>
    `["${s.origin}","${s.date}","${s.dest}",null,"${s.airlineCode}","${s.flightNumber}"]`
  );
  const segArray = `[${segEntries.join(",")}]`;

  const innerJson =
    `[[null,"${token}"],` +
    `[null,null,1,null,[],1,[1,0,0,0],null,null,null,null,null,null,` +
    `[` +
      `[[[["${originAirport}",0]]],[[["${destAirport}",0]]],null,0,null,null,"${departDate}",null,` +
      `${segArray},null,null,null,null,null,3],` +
      `[[[["${destAirport}",0]]],[[["${originAirport}",0]]],null,0,null,null,"${returnDate}",null,null,null,null,null,null,null,3]` +
    `]` +
    `,null,null,null,1],0,0,0,1]`;

  return `[null,${JSON.stringify(innerJson)}]`;
}

/**
 * Fetch return flights for a specific outbound via direct POST.
 * Uses the browser's fetch() to maintain cookies/session.
 */
async function fetchReturnViaPost(
  page: Page,
  apiUrl: string,
  target: ApiParsedFlight,
  originAirport: string,
  departDate: string,
  returnDate: string
): Promise<{ nonstop: ApiParsedFlight[]; onestop: ApiParsedFlight[] } | null> {
  const freqValue = buildFreqValue(
    target.token, target.segments,
    originAirport, DESTINATION_AIRPORT, departDate, returnDate
  );
  const postBody = `f.req=${encodeURIComponent(freqValue)}&`;

  const result = await page.evaluate(async (evalUrl: string, evalBody: string) => {
    try {
      const res = await fetch(evalUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: evalBody,
      });
      if (res.status !== 200) return null;
      return await res.text();
    } catch {
      return null;
    }
  }, apiUrl, postBody);

  if (!result || result.length < 500) return null;

  const parts = parseMultiPart(result);
  const inners = extractInner(parts);
  for (const inner of inners) {
    const parsed = parseFlightsFromApi(inner);
    if (parsed.nonstop.length > 0 || parsed.onestop.length > 0) return parsed;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Page Interaction
// ---------------------------------------------------------------------------

/**
 * Apply carry-on bag filter. Returns true if successful.
 */
async function applyCarryOnFilter(page: Page): Promise<boolean> {
  const bagsBtn = await page.$('button[aria-label^="Bags"]');
  if (!bagsBtn) {
    console.warn("      Could not find Bags button");
    return false;
  }
  await bagsBtn.click();
  await new Promise((r) => setTimeout(r, 1500));

  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Add carry-on bag"]');
    if (btn) { (btn as HTMLElement).click(); return true; }
    return false;
  });

  if (!clicked) {
    console.warn("      Could not find 'Add carry-on bag' button");
    return false;
  }

  await new Promise((r) => setTimeout(r, 500));
  await page.click("body");
  return true;
}

/**
 * Set up API interception on a page. Captures the API URL and response bodies.
 */
function setupApiInterception(
  page: Page,
  captured: CapturedApiCall[],
  state: { apiUrl: string }
): void {
  page.on("request", (req) => {
    if (req.url().includes("GetShoppingResults")) {
      if (!state.apiUrl) state.apiUrl = req.url();
      captured.push({ body: "", resolved: false });
    }
    req.continue();
  });

  page.on("response", async (res) => {
    if (res.url().includes("GetShoppingResults") && res.status() === 200) {
      try {
        const body = await res.text();
        const pending = captured.find((c) => !c.resolved);
        if (pending) { pending.body = body; pending.resolved = true; }
      } catch {}
    }
  });
}

/**
 * Wait for a new API response after the given index.
 */
async function waitForApiResponse(
  captured: CapturedApiCall[],
  afterIndex: number,
  timeoutMs = 15_000
): Promise<{ nonstop: ApiParsedFlight[]; onestop: ApiParsedFlight[] } | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (let i = captured.length - 1; i >= afterIndex; i--) {
      const c = captured[i];
      if (!c.body) continue;
      const parts = parseMultiPart(c.body);
      const inners = extractInner(parts);
      for (const inner of inners) {
        const parsed = parseFlightsFromApi(inner);
        if (parsed.nonstop.length > 0 || parsed.onestop.length > 0) {
          return parsed;
        }
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

// ---------------------------------------------------------------------------
// Core scrape function
// ---------------------------------------------------------------------------

interface ScrapeResult {
  category: FlightCategory;
  price: number;
  airline: string;
  outbound: ApiParsedFlight;
  return_: ApiParsedFlight;
  googleFlightsUrl: string;
}

/**
 * Scrape a single category on its own page using click-free POST approach.
 * Each category gets its own browser context + page for isolation.
 *
 * Flow:
 *   1. Load page, optionally apply carry-on filter
 *   2. Intercept outbound API → extract tokens + segments
 *   3. For each top N outbound: POST directly to get return flights
 *   4. Pair outbound + best return, skip if no valid return
 */
async function scrapeSingleCategory(
  browser: Browser,
  baseUrl: string,
  category: FlightCategory,
  stopType: "nonstop" | "onestop",
  isCarryon: boolean,
  originAirport: string,
  departDate: string,
  returnDate: string
): Promise<ScrapeResult[]> {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(pickRandom(USER_AGENTS));

  const captured: CapturedApiCall[] = [];
  const state = { apiUrl: "" };
  await page.setRequestInterception(true);
  setupApiInterception(page, captured, state);

  const results: ScrapeResult[] = [];

  try {
    // Step 1: Load page
    const preLoadCount = captured.length;
    await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 60_000 });

    try {
      await page.waitForSelector("li.pIav2d", { timeout: 15_000 });
    } catch {
      const captcha = await page.$('iframe[src*="recaptcha"], #captcha-form, .g-recaptcha');
      if (captcha) {
        console.warn(`      [${category}] CAPTCHA detected, skipping`);
      } else {
        console.warn(`      [${category}] No flight results found, skipping`);
      }
      return results;
    }
    await new Promise((r) => setTimeout(r, 2000));

    // Step 2: Optionally apply carry-on filter
    let outbound: { nonstop: ApiParsedFlight[]; onestop: ApiParsedFlight[] } | null = null;

    if (isCarryon) {
      const preFilterCount = captured.length;
      const filterApplied = await applyCarryOnFilter(page);
      if (filterApplied) {
        await new Promise((r) => setTimeout(r, 3000));
        outbound = await waitForApiResponse(captured, preFilterCount, 10_000);
        console.log(`      [${category}] Carry-on filter applied`);
      }
    }

    if (!outbound) {
      outbound = await waitForApiResponse(captured, preLoadCount, 5_000);
    }

    if (!outbound) {
      console.warn(`      [${category}] No outbound API data, skipping`);
      return results;
    }

    if (!state.apiUrl) {
      console.warn(`      [${category}] No API URL captured, skipping`);
      return results;
    }

    const googleFlightsUrl = page.url();
    const outboundList = stopType === "nonstop" ? outbound.nonstop : outbound.onestop;
    const topCount = Math.min(TOP_N_PER_CATEGORY, outboundList.length);

    console.log(`      [${category}] ${outboundList.length} outbound, fetching returns for top ${topCount}`);

    if (topCount === 0) return results;

    // Step 3: POST for return flights (no clicking)
    for (let i = 0; i < topCount; i++) {
      const target = outboundList[i];

      const returns = await fetchReturnViaPost(
        page, state.apiUrl, target,
        originAirport, departDate, returnDate
      );

      // Pick best return for this category
      let bestReturn: ApiParsedFlight | null = null;
      if (returns) {
        if (stopType === "nonstop") {
          bestReturn = returns.nonstop.find(r => r.stops === 0) ?? null;
        } else {
          bestReturn = returns.onestop[0] ?? returns.nonstop[0] ?? null;
        }
      }

      // Validate: skip if no valid return
      if (!bestReturn) {
        console.log(`      [${category}] #${i + 1}: no return, skipping`);
        continue;
      }
      if (stopType === "nonstop" && bestReturn.stops > 0) {
        console.log(`      [${category}] #${i + 1}: return has ${bestReturn.stops} stops, skipping`);
        continue;
      }

      results.push({
        category,
        price: Math.max(target.price, bestReturn.price),
        airline: target.airline,
        outbound: target,
        return_: bestReturn,
        googleFlightsUrl,
      });

      // Small delay between POSTs
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
    }
  } finally {
    await page.close();
    await context.close();
  }

  return results;
}

/**
 * Scrape all 4 categories for one airport + date range.
 *
 * Launches 4 parallel pages (one per category) with staggered loads
 * and separate browser contexts to minimize CAPTCHA risk.
 * Each page fetches return flights via direct POST — no clicking.
 */
async function scrapeAirportDate(
  browser: Browser,
  baseUrl: string,
  airport: string,
  departDate: string,
  returnDate: string
): Promise<ScrapeResult[]> {
  const categoryDefs: { category: FlightCategory; stopType: "nonstop" | "onestop"; isCarryon: boolean }[] = [
    { category: "nonstop_no_carryon", stopType: "nonstop", isCarryon: false },
    { category: "onestop_no_carryon", stopType: "onestop", isCarryon: false },
    { category: "nonstop_carryon",    stopType: "nonstop", isCarryon: true },
    { category: "onestop_carryon",    stopType: "onestop", isCarryon: true },
  ];

  // Stagger launches: start each category 3-5s apart to avoid burst requests
  const promises: Promise<ScrapeResult[]>[] = [];
  for (let i = 0; i < categoryDefs.length; i++) {
    const def = categoryDefs[i];
    const delay = i * (3000 + Math.random() * 2000); // 3-5s stagger
    promises.push(
      new Promise<ScrapeResult[]>((resolve) => setTimeout(resolve, delay)).then(() =>
        scrapeSingleCategory(
          browser, baseUrl, def.category, def.stopType, def.isCarryon,
          airport, departDate, returnDate
        )
      )
    );
  }

  const allResults = await Promise.all(promises);
  return allResults.flat();
}

// ---------------------------------------------------------------------------
// Build DB rows
// ---------------------------------------------------------------------------

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

function apiFlightToLeg(f: ApiParsedFlight): FlightLeg {
  const leg: FlightLeg = {
    departTime: f.departTime,
    arriveTime: f.arriveTime,
    duration: formatDuration(f.duration),
    stops: f.stops,
  };
  if (f.layoverAirport) leg.layoverAirport = f.layoverAirport;
  if (f.layoverDuration) leg.layoverDuration = formatDuration(f.layoverDuration);
  return leg;
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

  await loadAirportToCities();

  const inputAirports = airportsEnv.split(",").map((a) => a.trim());

  const targetCities = new Set<string>();
  for (const airport of inputAirports) {
    const cities = AIRPORT_TO_CITIES[airport];
    if (!cities || cities.length === 0) {
      console.warn(`No cities mapped for airport: ${airport}, skipping`);
      continue;
    }
    for (const city of cities) targetCities.add(city);
  }

  if (targetCities.size === 0) {
    console.error("No target cities found for given airports");
    process.exit(1);
  }

  console.log("=== Google Flights Scraper (Click-Free API) ===");
  console.log(`Started at ${new Date().toISOString()}`);
  console.log(`Airports: ${inputAirports.join(", ")}`);
  console.log(`Target cities: ${[...targetCities].join(", ")}`);

  const dateRanges = generateDateRanges();
  const totalTasks = inputAirports.length * dateRanges.length;
  let completedTasks = 0;

  console.log(`Date ranges: ${dateRanges.length}`);
  console.log(`Categories: ${CATEGORIES_TO_SCRAPE.join(", ")}`);
  console.log(`Top N per category: ${TOP_N_PER_CATEGORY}`);
  console.log(`Max duration: ${MAX_DURATION_MINUTES} min`);
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
        completedTasks++;
        const taskLabel = `${airport} | ${dateRange.id}`;
        console.log(`  [${completedTasks}/${totalTasks}] ${taskLabel}`);
        await updateJobProgress(jobId, completedTasks, totalTasks, taskLabel);

        const baseUrl = buildFlightsUrl(airport, dateRange.departDate, dateRange.returnDate);

        let scrapeResults: ScrapeResult[] = [];

        try {
          scrapeResults = await scrapeAirportDate(
            browser!, baseUrl, airport,
            dateRange.departDate, dateRange.returnDate
          );
          console.log(`    Total results: ${scrapeResults.length}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`    ERROR: ${msg}`);
        }

        // Write results for each target city
        const now = new Date().toISOString();
        const runId = process.env.GITHUB_RUN_ID ?? null;

        for (const city of targetCities) {
          if (!AIRPORT_TO_CITIES[airport]?.includes(city)) continue;
          if (scrapeResults.length === 0) continue;

          const optionRows = scrapeResults.map((r) => ({
            date_range_id: dateRange.id,
            origin_city: city,
            category: r.category,
            airport_used: airport,
            price: r.price,
            airline: r.airline,
            outbound_details: apiFlightToLeg(r.outbound),
            return_details: apiFlightToLeg(r.return_),
            google_flights_url: r.googleFlightsUrl,
            is_best: false,
            scraped_at: now,
            run_id: runId,
          }));

          // Delete old staging options for this airport + date range + city + run
          const delQuery = supabase
            .from("flight_options_staging")
            .delete()
            .eq("date_range_id", dateRange.id)
            .eq("origin_city", city)
            .eq("airport_used", airport);
          if (runId) delQuery.eq("run_id", runId);
          await delQuery;

          // Insert in batches of 50
          for (let i = 0; i < optionRows.length; i += 50) {
            const batch = optionRows.slice(i, i + 50);
            const { error } = await supabase.from("flight_options_staging").insert(batch);
            if (error) {
              console.error(`    DB insert error (${city}): ${error.message}`);
            }
          }

          console.log(`    -> ${city}: ${optionRows.length} rows saved`);
        }

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
