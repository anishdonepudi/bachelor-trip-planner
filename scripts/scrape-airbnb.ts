/**
 * Airbnb Scraper (HTML-embedded JSON — no Puppeteer, no GraphQL API)
 *
 * Airbnb embeds search results as JSON in their server-rendered HTML page.
 * We fetch the page, extract the embedded data, and parse listings.
 * ~1-2 seconds per query vs. 60-90s with Puppeteer.
 *
 * Usage:
 *   Full run:   npx tsx scripts/scrape-airbnb.ts
 *   Local test: npx tsx scripts/scrape-airbnb.ts --test
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";
import { generateDateRanges } from "../src/lib/date-ranges";
import type { BudgetTier, AirbnbListingRow } from "../src/lib/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TOTAL_PEOPLE = 17;
const NIGHTS = 3;
const STALE_THRESHOLD_MS = 12 * 60 * 60 * 1000;
const IS_TEST = process.argv.includes("--test");

interface BudgetTierConfig {
  value: BudgetTier;
  label: string;
  totalMin: number; // total stay price (price_filter_input_type=2)
  totalMax: number;
}

const BUDGET_TIERS: BudgetTierConfig[] = [
  { value: "budget", label: "Budget", totalMin: 2550, totalMax: 3059 },
  { value: "mid", label: "Mid-Range", totalMin: 3060, totalMax: 3569 },
  { value: "premium", label: "Premium", totalMin: 3570, totalMax: 4029 },
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

function randomDelay(minMs = 2000, maxMs = 4000): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Build an Airbnb search URL matching Airbnb's real browser format */
export function buildAirbnbSearchUrl(
  checkin: string,
  checkout: string,
  priceMin: number,
  priceMax: number,
  cursor?: string
): string {
  const params = new URLSearchParams({
    checkin,
    checkout,
    adults: String(Math.min(TOTAL_PEOPLE, 16)), // Airbnb caps search at 16 guests
    currency: "USD",
    place_id: "ChIJPxw3l3IvUI8RKCAPIt8bL-k", // Tulum
    query: "Tulum, Quintana Roo, Mexico",
    search_mode: "regular_search",
    price_filter_input_type: "2", // total stay price (not nightly)
    price_filter_num_nights: String(NIGHTS),
    channel: "EXPLORE",
  });
  if (priceMin > 0) params.set("price_min", String(priceMin));
  if (priceMax > 0) params.set("price_max", String(priceMax));
  params.append("room_types[]", "Entire home/apt");
  params.append("amenities[]", "7"); // Pool
  params.append("refinement_paths[]", "/homes");
  if (cursor) params.set("cursor", cursor);
  return `https://www.airbnb.com/s/Tulum--Quintana-Roo--Mexico/homes?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Scraping: fetch HTML and extract embedded JSON
// ---------------------------------------------------------------------------

export interface ScrapedListing {
  name: string;
  price: number; // total price for the stay (3 nights)
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  imageUrl: string;
  airbnbUrl: string;
  superhost: boolean;
}

/**
 * Fetch a single Airbnb search page and return listings + next-page cursor.
 */
async function fetchAirbnbPage(
  checkin: string,
  checkout: string,
  priceMin: number,
  priceMax: number,
  cursor?: string
): Promise<{ listings: ScrapedListing[]; nextCursor: string | null }> {
  const url = buildAirbnbSearchUrl(checkin, checkout, priceMin, priceMax, cursor);

  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent": pickRandom(USER_AGENTS),
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Cache-Control": "no-cache",
    },
    timeout: 30_000,
  });

  const htmlStr = html as string;

  // Extract the deferred state JSON from the script tag
  const deferredMatch = htmlStr.match(
    /id="data-deferred-state-0"[^>]*>([\s\S]*?)<\/script>/
  );

  if (!deferredMatch) {
    if (
      htmlStr.includes("captcha") ||
      htmlStr.includes("robot") ||
      htmlStr.includes("blocked")
    ) {
      console.warn("    Bot detection hit");
    }
    return { listings: [], nextCursor: null };
  }

  try {
    const json = JSON.parse(deferredMatch[1]);
    const listings = parseEmbeddedResults(json);
    const nextCursor = extractNextCursor(json);
    return { listings, nextCursor };
  } catch (err) {
    console.warn(
      "    Failed to parse embedded JSON:",
      err instanceof Error ? err.message : err
    );
    return { listings: [], nextCursor: null };
  }
}

/**
 * Extract pagination cursor from the embedded JSON.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractNextCursor(json: any): string | null {
  try {
    const niobeData = json?.niobeClientData;
    if (!Array.isArray(niobeData) || niobeData.length === 0) return null;
    const paginationInfo =
      niobeData[0]?.[1]?.data?.presentation?.staysSearch?.results?.paginationInfo;
    return paginationInfo?.nextPageCursor ?? paginationInfo?.cursors?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch all pages of Airbnb search results (up to maxPages).
 */
const MAX_PAGES = 3;

async function fetchAirbnbListings(
  checkin: string,
  checkout: string,
  priceMin: number,
  priceMax: number
): Promise<ScrapedListing[]> {
  const allListings: ScrapedListing[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const { listings, nextCursor } = await fetchAirbnbPage(
      checkin, checkout, priceMin, priceMax, cursor
    );
    allListings.push(...listings);

    if (!nextCursor || listings.length === 0) break;
    cursor = nextCursor;

    // Small delay between pages
    if (page < MAX_PAGES - 1) await randomDelay(1000, 2000);
  }

  return allListings;
}

/**
 * Parse the niobeClientData embedded in the page.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEmbeddedResults(json: any): ScrapedListing[] {
  const results: ScrapedListing[] = [];

  try {
    // Navigate: niobeClientData[0][1].data.presentation.staysSearch.results.searchResults
    const niobeData = json?.niobeClientData;
    if (!Array.isArray(niobeData) || niobeData.length === 0) return [];

    const searchResults =
      niobeData[0]?.[1]?.data?.presentation?.staysSearch?.results
        ?.searchResults ?? [];

    for (const result of searchResults) {
      try {
        // Title
        const name =
          result.title ??
          result.subtitle ??
          "";
        if (!name) continue;

        // Price — from accessibilityLabel: "$6,730 for 3 nights, originally $8,176"
        // or from discountedPrice/price string
        let totalPrice = 0;
        const priceInfo = result.structuredDisplayPrice?.primaryLine;

        if (priceInfo) {
          // Try accessibility label first (most reliable)
          const labelMatch = priceInfo.accessibilityLabel?.match(
            /\$([\d,]+)\s+for/
          );
          if (labelMatch) {
            totalPrice =
              parseInt(labelMatch[1].replace(/,/g, ""), 10) || 0;
          }

          // Fallback to discountedPrice or price fields
          if (totalPrice === 0) {
            const priceStr =
              priceInfo.discountedPrice ?? priceInfo.price ?? "";
            if (typeof priceStr === "string") {
              totalPrice =
                parseInt(priceStr.replace(/[^0-9]/g, ""), 10) || 0;
            }
          }
        }

        // Also try extracting nightly from explanation data
        let pricePerNight = 0;
        const explanationItems =
          result.structuredDisplayPrice?.explanationData?.priceDetails?.[0]
            ?.items ?? [];
        for (const item of explanationItems) {
          const desc = item.description ?? "";
          // "3 nights x $2,725.04"
          const nightlyMatch = desc.match(
            /\d+\s*nights?\s*x\s*\$([\d,.]+)/
          );
          if (nightlyMatch) {
            pricePerNight =
              parseFloat(nightlyMatch[1].replace(/,/g, "")) || 0;
            break;
          }
        }

        if (totalPrice === 0 && pricePerNight > 0) {
          totalPrice = Math.round(pricePerNight * NIGHTS);
        }
        if (totalPrice === 0) continue;

        // Always derive per-night from total (total is the discounted price)
        pricePerNight = Math.round((totalPrice / NIGHTS) * 100) / 100;

        // Rating & reviews from avgRatingLocalized e.g. "4.89 (188)"
        let rating = 0;
        let reviewCount = 0;
        const ratingStr = String(result.avgRatingLocalized ?? "");
        const ratingMatch = ratingStr.match(/^([\d.]+)\s*\((\d+)\)/);
        if (ratingMatch) {
          rating = parseFloat(ratingMatch[1]) || 0;
          reviewCount = parseInt(ratingMatch[2], 10) || 0;
        }

        // Room details from structuredContent.primaryLine
        let bedrooms = 0;
        let bathrooms = 0;
        let maxGuests = 0;
        const primaryLine =
          result.structuredContent?.primaryLine ?? [];
        for (const item of primaryLine) {
          const body = item.body ?? "";
          const bedroomMatch = body.match(/(\d+)\s*bedroom/i);
          if (bedroomMatch) bedrooms = parseInt(bedroomMatch[1], 10);
          const bathMatch = body.match(
            /(\d+(?:\.5)?)\s*bathroom/i
          );
          if (bathMatch) bathrooms = parseFloat(bathMatch[1]);
          const guestMatch = body.match(/(\d+)\s*guest/i);
          if (guestMatch) maxGuests = parseInt(guestMatch[1], 10);
        }

        // Amenities from structuredContent.secondaryLine
        const amenities: string[] = [];
        const secondaryLine =
          result.structuredContent?.secondaryLine ?? [];
        for (const item of secondaryLine) {
          const body = item.body ?? "";
          if (body) amenities.push(body);
        }

        // Image
        const imageUrl =
          result.contextualPictures?.[0]?.picture ?? "";

        // Listing ID from demandStayListing.id (base64 encoded)
        let listingId = "";
        const demandId = result.demandStayListing?.id ?? "";
        if (demandId) {
          try {
            const decoded = Buffer.from(demandId, "base64").toString("utf8");
            // "DemandStayListing:1061667193333229490"
            const idMatch = decoded.match(/:(\d+)/);
            if (idMatch) listingId = idMatch[1];
          } catch {
            // skip
          }
        }
        const airbnbUrl = listingId
          ? `https://www.airbnb.com/rooms/${listingId}`
          : "";

        // Superhost from badges
        const superhost =
          result.badges?.some(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (b: any) =>
              b?.id === "SUPERHOST" ||
              b?.text === "Superhost" ||
              b?.__typename === "SuperhostBadge"
          ) ?? false;

        results.push({
          name: `${name}${result.subtitle && result.subtitle !== name ? ` — ${result.subtitle}` : ""}`,
          price: totalPrice,
          pricePerNight,
          rating,
          reviewCount,
          bedrooms,
          bathrooms,
          maxGuests,
          amenities,
          imageUrl,
          airbnbUrl,
          superhost,
        });
      } catch {
        // Skip malformed entries
      }
    }
  } catch (err) {
    console.error(
      "  Error parsing embedded results:",
      err instanceof Error ? err.message : err
    );
  }

  return results;
}

// ---------------------------------------------------------------------------
// Supabase helpers (only used in full mode)
// ---------------------------------------------------------------------------

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars");
  }
  supabase = createClient(url, key);
  return supabase;
}

async function isDataFresh(
  dateRangeId: string,
  tier: BudgetTier
): Promise<boolean> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("airbnb_listings")
    .select("scraped_at")
    .eq("date_range_id", dateRangeId)
    .eq("budget_tier", tier)
    .order("scraped_at", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return false;
  return Date.now() - new Date(data[0].scraped_at).getTime() < STALE_THRESHOLD_MS;
}

async function createScrapeJob(): Promise<number> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("scrape_jobs")
    .insert({
      job_type: "airbnb",
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
  await getSupabase()
    .from("scrape_jobs")
    .update({ progress: { completed, total, current } })
    .eq("id", jobId);
}

async function completeJob(jobId: number, errorMsg?: string): Promise<void> {
  await getSupabase()
    .from("scrape_jobs")
    .update({
      status: errorMsg ? "failed" : "completed",
      completed_at: new Date().toISOString(),
      error_message: errorMsg ?? null,
    })
    .eq("id", jobId);
}

// ---------------------------------------------------------------------------
// Test mode
// ---------------------------------------------------------------------------

async function runTest(): Promise<void> {
  console.log("=== Airbnb Scraper — LOCAL TEST MODE ===\n");

  const dateRanges = generateDateRanges();
  const testRange = dateRanges[0];

  console.log(`Search parameters:`);
  console.log(`  Dates: ${testRange.departDate} → ${testRange.returnDate}`);
  console.log(`  Location: Tulum, Mexico`);
  console.log(`  Guests: ${TOTAL_PEOPLE}`);
  console.log(`  Filters: Entire home, Pool, ${Math.min(TOTAL_PEOPLE, 16)}+ guests\n`);

  // Test all tiers + no-filter baseline
  const allListings: ScrapedListing[] = [];

  for (const tier of BUDGET_TIERS) {
    const startTime = Date.now();
    const listings = await fetchAirbnbListings(
      testRange.departDate,
      testRange.returnDate,
      tier.totalMin,
      tier.totalMax
    );
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ${tier.label} ($${tier.totalMin}-$${tier.totalMax}/night): ${listings.length} listings (${elapsed}s)`);
    for (const l of listings) {
      console.log(`    ${l.name} — $${l.price} total ($${l.pricePerNight}/night, $${(l.pricePerNight / TOTAL_PEOPLE).toFixed(0)}/person/night)`);
      if (l.airbnbUrl) console.log(`      ${l.airbnbUrl}`);
    }
    allListings.push(...listings);
    if (tier !== BUDGET_TIERS[BUDGET_TIERS.length - 1]) await randomDelay(1500, 2500);
  }

  // Also try no price filter to see total available
  console.log("");
  const noFilterStart = Date.now();
  const noFilterListings = await fetchAirbnbListings(
    testRange.departDate,
    testRange.returnDate,
    0,
    0
  );
  const noFilterElapsed = ((Date.now() - noFilterStart) / 1000).toFixed(1);
  console.log(`  No price filter: ${noFilterListings.length} listings (${noFilterElapsed}s)`);
  for (const l of noFilterListings) {
    console.log(`    ${l.name} — $${l.price} total ($${l.pricePerNight}/night)`);
  }

  console.log("\n" + "─".repeat(70));
  console.log(`\nSummary:`);
  console.log(`  Total across tiers: ${allListings.length} listings`);
  console.log(`  Total available (no filter): ${noFilterListings.length} listings`);
  const prices = noFilterListings.map((l) => l.pricePerNight).filter((p) => p > 0);
  if (prices.length > 0) {
    console.log(`  Nightly range: $${Math.min(...prices)}-$${Math.max(...prices)}`);
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    console.log(`  Average: $${avg.toFixed(0)}/night ($${(avg / TOTAL_PEOPLE).toFixed(0)}/person/night)`);
  }
}

// ---------------------------------------------------------------------------
// Full mode
// ---------------------------------------------------------------------------

async function runFull(): Promise<void> {
  console.log("=== Airbnb Scraper (HTML Parser) ===");
  console.log(`Started at ${new Date().toISOString()}`);

  const dateRanges = generateDateRanges();
  const jobId = await createScrapeJob();

  const totalTasks = dateRanges.length * BUDGET_TIERS.length;
  let completedTasks = 0;

  console.log(`Date ranges: ${dateRanges.length}, Tiers: ${BUDGET_TIERS.length}`);
  console.log(`Total tasks: ${totalTasks}`);

  try {
    for (const dateRange of dateRanges) {
      console.log(`\nDate range: ${dateRange.id} (${dateRange.format})`);

      for (const tier of BUDGET_TIERS) {
        completedTasks++;
        const taskLabel = `${dateRange.id} | ${tier.label}`;

        if (await isDataFresh(dateRange.id, tier.value)) {
          console.log(`  [${completedTasks}/${totalTasks}] ${taskLabel} - FRESH, skipping`);
          await updateJobProgress(jobId, completedTasks, totalTasks, `${taskLabel} (skipped)`);
          continue;
        }

        console.log(`  [${completedTasks}/${totalTasks}] ${taskLabel} - fetching...`);
        await updateJobProgress(jobId, completedTasks, totalTasks, taskLabel);

        try {
          const listings = await fetchAirbnbListings(
            dateRange.departDate,
            dateRange.returnDate,
            tier.totalMin,
            tier.totalMax
          );
          if (listings.length > 0) {
            // Deduplicate by airbnb_url
            const seen = new Set<string>();
            const uniqueListings = listings.filter((l) => {
              if (!l.airbnbUrl || seen.has(l.airbnbUrl)) return false;
              seen.add(l.airbnbUrl);
              return true;
            });

            const duped = listings.length - uniqueListings.length;
            console.log(`    Found ${uniqueListings.length} listings${duped > 0 ? ` (${duped} duplicates removed)` : ""}`);

            const now = new Date().toISOString();
            const sb = getSupabase();

            const rows: AirbnbListingRow[] = uniqueListings.map((l) => ({
              date_range_id: dateRange.id,
              listing_name: l.name,
              price_per_night: l.pricePerNight,
              price_per_person_per_night: parseFloat(
                (l.pricePerNight / TOTAL_PEOPLE).toFixed(2)
              ),
              total_stay_cost: l.price,
              rating: l.rating,
              review_count: l.reviewCount,
              bedrooms: l.bedrooms,
              bathrooms: l.bathrooms,
              max_guests: l.maxGuests,
              amenities: l.amenities,
              image_url: l.imageUrl,
              airbnb_url: l.airbnbUrl,
              superhost: l.superhost,
              budget_tier: tier.value,
              scraped_at: now,
            }));

            await sb
              .from("airbnb_listings")
              .delete()
              .eq("date_range_id", dateRange.id)
              .eq("budget_tier", tier.value);

            for (let i = 0; i < rows.length; i += 20) {
              const batch = rows.slice(i, i + 20);
              const { error } = await sb.from("airbnb_listings").insert(batch);
              if (error) console.error(`    DB insert error: ${error.message}`);
            }
            console.log(`    Saved ${rows.length} listings to DB`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`    ERROR: ${msg}`);
        }

        await randomDelay();
      }
    }

    await completeJob(jobId);
    console.log(`\nCompleted at ${new Date().toISOString()}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Fatal error: ${msg}`);
    await completeJob(jobId, msg);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

if (IS_TEST) {
  runTest().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
} else {
  runFull().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
