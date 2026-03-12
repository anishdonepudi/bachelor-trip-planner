/**
 * Google Flights Scraper
 *
 * Reads city/airport config from Supabase, scrapes Google Flights for each
 * (weekend date range x city x airport) combination, categorizes results,
 * picks the cheapest per category, and upserts into Supabase.
 *
 * Usage: npx ts-node scripts/scrape-flights.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { generateDateRanges } from "../src/lib/date-ranges";
import type {
  CityConfig,
  DateRange,
  FlightCategory,
  FlightLeg,
  FlightOptionRow,
  Flight,
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
const STALE_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 hours

const FLIGHT_CATEGORIES: FlightCategory[] = [
  "nonstop_carryon",
  "nonstop_no_carryon",
  "onestop_carryon",
  "onestop_no_carryon",
];

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

async function fetchCityConfigs(): Promise<CityConfig[]> {
  const { data, error } = await supabase
    .from("config")
    .select("cities")
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch config: ${error?.message}`);
  }

  return data.cities as CityConfig[];
}

async function isDataFresh(
  dateRangeId: string,
  city: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("flights")
    .select("scraped_at")
    .eq("date_range_id", dateRangeId)
    .eq("origin_city", city)
    .order("scraped_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return false;

  const scrapedAt = new Date(data[0].scraped_at).getTime();
  return Date.now() - scrapedAt < STALE_THRESHOLD_MS;
}

async function createScrapeJob(): Promise<number> {
  const { data, error } = await supabase
    .from("scrape_jobs")
    .insert({
      job_type: "flights",
      status: "running",
      started_at: new Date().toISOString(),
      github_run_id: process.env.GITHUB_RUN_ID ?? null,
      progress: { completed: 0, total: 0, current: "initializing" },
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
  returnLayoverAirport?: string;
  hasBaggage: boolean;
}

async function scrapeFlightsPage(
  page: Page,
  url: string
): Promise<ScrapedFlight[]> {
  await page.setUserAgent(pickRandom(USER_AGENTS));
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });

  // Wait for flight results to load
  try {
    await page.waitForSelector('[role="list"] [role="listitem"], .pIav2d, .Rk10dc', {
      timeout: 15_000,
    });
  } catch {
    // Check for CAPTCHA
    const captcha = await page.$('iframe[src*="recaptcha"], #captcha-form, .g-recaptcha');
    if (captcha) {
      console.warn("    CAPTCHA detected, skipping this page");
      return [];
    }
    console.warn("    No flight results found on page, skipping");
    return [];
  }

  // Extra wait for dynamic content
  await new Promise((r) => setTimeout(r, 2000));

  const flights: ScrapedFlight[] = await page.evaluate(() => {
    const results: ScrapedFlight[] = [];

    // Google Flights renders results as list items
    const items = document.querySelectorAll(
      'li.pIav2d, [role="listitem"], ul.Rk10dc > li'
    );

    for (const item of items) {
      try {
        // Price
        const priceEl = item.querySelector('[data-test-id="price"] span, .YMlIz span, .BVAVmf');
        if (!priceEl) continue;
        const priceText = priceEl.textContent?.replace(/[^0-9]/g, "");
        if (!priceText) continue;
        const price = parseInt(priceText, 10);
        if (isNaN(price) || price === 0) continue;

        // Airline
        const airlineEl = item.querySelector('.Ir0Voe .sSHqwe, .h1fkLb, [data-test-id="airline"]');
        const airline = airlineEl?.textContent?.trim() ?? "Unknown";

        // Stops
        const stopsEl = item.querySelector('.EfT7Ae .ogfYpf, .BbR8Ec .ogfYpf, [data-test-id="stops"]');
        const stopsText = stopsEl?.textContent?.trim() ?? "";
        let stops = 0;
        if (/nonstop/i.test(stopsText)) {
          stops = 0;
        } else {
          const m = stopsText.match(/(\d+)\s*stop/i);
          stops = m ? parseInt(m[1], 10) : 0;
        }

        // Duration
        const durationEl = item.querySelector('.Ak5kof .gvkrdb, [data-test-id="duration"]');
        const duration = durationEl?.textContent?.trim() ?? "";

        // Times
        const timeEls = item.querySelectorAll('.zxVSec span, .mv1WYe span, [data-test-id="departure-time"], [data-test-id="arrival-time"]');
        const departTime = timeEls[0]?.textContent?.trim() ?? "";
        const arriveTime = timeEls[1]?.textContent?.trim() ?? "";

        // Layover info
        const layoverEl = item.querySelector('.BbR8Ec .sSHqwe, .EfT7Ae .sSHqwe');
        const layoverAirport = layoverEl?.textContent?.trim();

        // Bag info - check if carry-on is included
        const bagText = item.textContent ?? "";
        const hasBaggage =
          /carry-on/i.test(bagText) ||
          /cabin bag/i.test(bagText) ||
          /personal item and carry-on/i.test(bagText);

        results.push({
          price,
          airline,
          stops,
          duration,
          departTime,
          arriveTime,
          returnDepartTime: "", // Return leg parsed separately if visible
          returnArriveTime: "",
          returnDuration: "",
          returnStops: stops, // Approximate with same stops
          hasBaggage,
          layoverAirport: stops > 0 ? layoverAirport : undefined,
        });
      } catch {
        // Skip malformed entries
      }
    }

    return results;
  });

  return flights;
}

function categorizeFlight(flight: ScrapedFlight): FlightCategory {
  const isNonstop = flight.stops === 0;
  const hasCarryOn = flight.hasBaggage;

  if (isNonstop && hasCarryOn) return "nonstop_carryon";
  if (isNonstop && !hasCarryOn) return "nonstop_no_carryon";
  if (!isNonstop && hasCarryOn) return "onestop_carryon";
  return "onestop_no_carryon";
}

// ---------------------------------------------------------------------------
// Main orchestration
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== Google Flights Scraper ===");
  console.log(`Started at ${new Date().toISOString()}`);

  const cities = await fetchCityConfigs();
  const dateRanges = generateDateRanges();
  const jobId = await createScrapeJob();

  const totalTasks = cities.length * dateRanges.length;
  let completedTasks = 0;

  console.log(`Cities: ${cities.length}, Date ranges: ${dateRanges.length}`);
  console.log(`Total tasks: ${totalTasks}`);

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

    // Process cities sequentially
    for (const city of cities) {
      const allAirports = [...city.primaryAirports, ...city.nearbyAirports];
      console.log(
        `\nProcessing ${city.city} (airports: ${allAirports.join(", ")})`
      );

      for (const dateRange of dateRanges) {
        completedTasks++;
        const taskLabel = `${city.city} | ${dateRange.id}`;

        // Check freshness
        if (await isDataFresh(dateRange.id, city.city)) {
          console.log(`  [${completedTasks}/${totalTasks}] ${taskLabel} - FRESH, skipping`);
          await updateJobProgress(jobId, completedTasks, totalTasks, `${taskLabel} (skipped)`);
          continue;
        }

        console.log(`  [${completedTasks}/${totalTasks}] ${taskLabel} - scraping...`);
        await updateJobProgress(jobId, completedTasks, totalTasks, taskLabel);

        // Collect all flight options across airports for this city+dateRange
        const allOptions: {
          airport: string;
          category: FlightCategory;
          flight: ScrapedFlight;
          url: string;
        }[] = [];

        for (const airport of allAirports) {
          const url = buildFlightsUrl(
            airport,
            dateRange.departDate,
            dateRange.returnDate
          );

          try {
            const page = await browser!.newPage();
            await page.setViewport({ width: 1920, height: 1080 });

            const flights = await scrapeFlightsPage(page, url);
            console.log(`    ${airport}: ${flights.length} results`);

            for (const f of flights) {
              allOptions.push({
                airport,
                category: categorizeFlight(f),
                flight: f,
                url,
              });
            }

            await page.close();
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`    ${airport}: ERROR - ${msg}`);
          }

          // Random delay between airport queries
          await randomDelay();
        }

        // Find cheapest per category across all airports
        const now = new Date().toISOString();
        const bestByCategory = new Map<
          FlightCategory,
          { airport: string; flight: ScrapedFlight; url: string }
        >();

        for (const opt of allOptions) {
          const existing = bestByCategory.get(opt.category);
          if (!existing || opt.flight.price < existing.flight.price) {
            bestByCategory.set(opt.category, {
              airport: opt.airport,
              flight: opt.flight,
              url: opt.url,
            });
          }
        }

        // Build flight_options rows (all options)
        const optionRows: FlightOptionRow[] = allOptions.map((opt) => ({
          date_range_id: dateRange.id,
          origin_city: city.city,
          category: opt.category,
          airport_used: opt.airport,
          price: opt.flight.price,
          airline: opt.flight.airline,
          outbound_details: {
            departTime: opt.flight.departTime,
            arriveTime: opt.flight.arriveTime,
            duration: opt.flight.duration,
            stops: opt.flight.stops,
            layoverAirport: opt.flight.layoverAirport,
          } as FlightLeg,
          return_details: {
            departTime: opt.flight.returnDepartTime,
            arriveTime: opt.flight.returnArriveTime,
            duration: opt.flight.returnDuration,
            stops: opt.flight.returnStops,
          } as FlightLeg,
          google_flights_url: opt.url,
          is_best: false,
          scraped_at: now,
        }));

        // Mark best options
        for (const [category, best] of bestByCategory.entries()) {
          const match = optionRows.find(
            (r) =>
              r.category === category &&
              r.airport_used === best.airport &&
              r.price === best.flight.price
          );
          if (match) match.is_best = true;
        }

        // Upsert into flights table (best per category)
        for (const category of FLIGHT_CATEGORIES) {
          const best = bestByCategory.get(category);

          const flightRow: Flight = {
            date_range_id: dateRange.id,
            trip_format: dateRange.format,
            depart_date: dateRange.departDate,
            return_date: dateRange.returnDate,
            origin_city: city.city,
            category,
            airport_used: best?.airport ?? "",
            price: best?.flight.price ?? null,
            airline: best?.flight.airline ?? null,
            outbound_details: best
              ? ({
                  departTime: best.flight.departTime,
                  arriveTime: best.flight.arriveTime,
                  duration: best.flight.duration,
                  stops: best.flight.stops,
                  layoverAirport: best.flight.layoverAirport,
                } as FlightLeg)
              : null,
            return_details: best
              ? ({
                  departTime: best.flight.returnDepartTime,
                  arriveTime: best.flight.returnArriveTime,
                  duration: best.flight.returnDuration,
                  stops: best.flight.returnStops,
                } as FlightLeg)
              : null,
            google_flights_url: best?.url ?? null,
            scraped_at: now,
          };

          const { error } = await supabase
            .from("flights")
            .upsert(flightRow, {
              onConflict: "date_range_id,origin_city,category",
            });

          if (error) {
            console.error(
              `    DB upsert error (flights, ${category}): ${error.message}`
            );
          }
        }

        // Insert all options into flight_options table
        if (optionRows.length > 0) {
          // Delete old options for this city+dateRange, then insert fresh
          await supabase
            .from("flight_options")
            .delete()
            .eq("date_range_id", dateRange.id)
            .eq("origin_city", city.city);

          // Insert in batches of 50
          for (let i = 0; i < optionRows.length; i += 50) {
            const batch = optionRows.slice(i, i + 50);
            const { error } = await supabase.from("flight_options").insert(batch);
            if (error) {
              console.error(`    DB insert error (flight_options): ${error.message}`);
            }
          }
        }

        console.log(
          `    Saved: ${bestByCategory.size} best flights, ${optionRows.length} total options`
        );
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
    if (browser) {
      await browser.close();
    }
  }
}

main();
