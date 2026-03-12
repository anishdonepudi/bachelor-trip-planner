/**
 * Airbnb Scraper
 *
 * For each weekend date range and budget tier, scrapes the first page of
 * Airbnb search results for Tulum, Mexico (17 adults, pool, entire home).
 * Extracts listing details and upserts into Supabase.
 *
 * Usage: npx ts-node scripts/scrape-airbnb.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { generateDateRanges } from "../src/lib/date-ranges";
import type { BudgetTier, AirbnbListingRow, DateRange } from "../src/lib/types";

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

const TOTAL_PEOPLE = 17;
const NIGHTS = 3;
const STALE_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 hours

interface BudgetTierConfig {
  value: BudgetTier;
  label: string;
  totalMin: number;
  totalMax: number;
}

const BUDGET_TIERS: BudgetTierConfig[] = [
  { value: "budget", label: "Budget", totalMin: 850, totalMax: 1020 },
  { value: "mid", label: "Mid-Range", totalMin: 1020, totalMax: 1190 },
  { value: "premium", label: "Premium", totalMin: 1190, totalMax: 1360 },
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

function buildAirbnbUrl(
  checkin: string,
  checkout: string,
  totalMin: number,
  totalMax: number
): string {
  const params = new URLSearchParams({
    tab_id: "home_tab",
    checkin,
    checkout,
    adults: String(TOTAL_PEOPLE),
    currency: "USD",
    price_min: String(totalMin),
    price_max: String(totalMax),
  });

  // Array params need manual append
  params.append("property_type_id[]", "4"); // Entire home
  params.append("amenities[]", "7"); // Pool

  return `https://www.airbnb.com/s/Tulum--Quintana-Roo--Mexico/homes?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function isDataFresh(
  dateRangeId: string,
  tier: BudgetTier
): Promise<boolean> {
  const { data, error } = await supabase
    .from("airbnb_listings")
    .select("scraped_at")
    .eq("date_range_id", dateRangeId)
    .eq("budget_tier", tier)
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

interface ScrapedListing {
  name: string;
  price: number; // per night (total for the house)
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

async function scrapeAirbnbPage(
  page: Page,
  url: string
): Promise<ScrapedListing[]> {
  await page.setUserAgent(pickRandom(USER_AGENTS));

  // Set language/locale headers
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
  });

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });

  // Wait for listing cards to appear
  try {
    await page.waitForSelector('[itemprop="itemListElement"], [data-testid="card-container"], .cy5jw6o', {
      timeout: 15_000,
    });
  } catch {
    // Check for CAPTCHA or bot detection
    const pageContent = await page.content();
    if (
      pageContent.includes("captcha") ||
      pageContent.includes("robot") ||
      pageContent.includes("blocked")
    ) {
      console.warn("    CAPTCHA/bot detection hit, skipping this page");
      return [];
    }
    console.warn("    No listing results found on page, skipping");
    return [];
  }

  // Extra wait for lazy-loaded content
  await new Promise((r) => setTimeout(r, 3000));

  // Scroll down to trigger lazy loading of images
  await page.evaluate(async () => {
    for (let i = 0; i < 5; i++) {
      window.scrollBy(0, 800);
      await new Promise((r) => setTimeout(r, 500));
    }
    window.scrollTo(0, 0);
  });

  await new Promise((r) => setTimeout(r, 2000));

  const listings: ScrapedListing[] = await page.evaluate(() => {
    const results: ScrapedListing[] = [];

    const cards = document.querySelectorAll(
      '[itemprop="itemListElement"], [data-testid="card-container"], .cy5jw6o, .g1qv1ctd'
    );

    for (const card of cards) {
      try {
        // Name
        const nameEl = card.querySelector(
          '[data-testid="listing-card-title"], [id^="title_"], .t1jojoys'
        );
        const name = nameEl?.textContent?.trim() ?? "";
        if (!name) continue;

        // Price per night
        const priceEl = card.querySelector(
          '[data-testid="price-availability-row"] span._11jcbg2, ._tyxjp1, .a8jt5op, ._1y74zjx'
        );
        let priceText = priceEl?.textContent ?? "";
        // Try broader price search
        if (!priceText) {
          const allSpans = card.querySelectorAll("span");
          for (const span of allSpans) {
            const t = span.textContent ?? "";
            if (t.startsWith("$") && /^\$[\d,]+$/.test(t.trim())) {
              priceText = t;
              break;
            }
          }
        }
        const priceMatch = priceText.replace(/[^0-9]/g, "");
        const price = parseInt(priceMatch, 10);
        if (isNaN(price) || price === 0) continue;

        // Rating
        const ratingEl = card.querySelector(
          '[aria-label*="rating"], .r1dxllyb, .ru0q88m'
        );
        const ratingText = ratingEl?.textContent ?? "";
        const ratingMatch = ratingText.match(/([\d.]+)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

        // Review count
        const reviewEl = card.querySelector(
          '[aria-label*="review"], .r1dxllyb, .ru0q88m'
        );
        const reviewText = reviewEl?.textContent ?? "";
        const reviewMatch = reviewText.match(/\((\d+)\)/);
        const reviewCount = reviewMatch ? parseInt(reviewMatch[1], 10) : 0;

        // Listing details (bedrooms, bathrooms, guests)
        const detailEls = card.querySelectorAll(
          '[data-testid="listing-card-subtitle"] span, .f15liw5s span, .s1cjsi4j'
        );
        let bedrooms = 0;
        let bathrooms = 0;
        let maxGuests = 0;

        const detailText = Array.from(detailEls)
          .map((el) => el.textContent ?? "")
          .join(" ");

        // Also check full card text for details
        const fullText = card.textContent ?? "";
        const textToSearch = detailText || fullText;

        const bedroomMatch = textToSearch.match(/(\d+)\s*bedroom/i);
        if (bedroomMatch) bedrooms = parseInt(bedroomMatch[1], 10);

        const bathroomMatch = textToSearch.match(/(\d+(?:\.5)?)\s*bathroom/i);
        if (bathroomMatch) bathrooms = parseFloat(bathroomMatch[1]);

        const guestMatch = textToSearch.match(/(\d+)\s*guest/i);
        if (guestMatch) maxGuests = parseInt(guestMatch[1], 10);

        // Amenities (from listing subtitle or tags)
        const amenities: string[] = [];
        if (/pool/i.test(fullText)) amenities.push("Pool");
        if (/wifi|wi-fi/i.test(fullText)) amenities.push("WiFi");
        if (/kitchen/i.test(fullText)) amenities.push("Kitchen");
        if (/parking/i.test(fullText)) amenities.push("Parking");
        if (/air condition/i.test(fullText)) amenities.push("AC");
        if (/beach/i.test(fullText)) amenities.push("Beach access");
        if (/hot tub|jacuzzi/i.test(fullText)) amenities.push("Hot tub");

        // Image
        const imgEl = card.querySelector("img");
        const imageUrl = imgEl?.src ?? "";

        // URL
        const linkEl = card.querySelector("a[href*='/rooms/']");
        const href = linkEl?.getAttribute("href") ?? "";
        const airbnbUrl = href.startsWith("http")
          ? href
          : href
            ? `https://www.airbnb.com${href}`
            : "";

        // Superhost
        const superhost =
          /superhost/i.test(fullText) ||
          !!card.querySelector('[data-testid="superhost-badge"]');

        results.push({
          name,
          price,
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

    return results;
  });

  return listings;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== Airbnb Scraper ===");
  console.log(`Started at ${new Date().toISOString()}`);

  const dateRanges = generateDateRanges();
  const jobId = await createScrapeJob();

  const totalTasks = dateRanges.length * BUDGET_TIERS.length;
  let completedTasks = 0;

  console.log(`Date ranges: ${dateRanges.length}, Tiers: ${BUDGET_TIERS.length}`);
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

    for (const dateRange of dateRanges) {
      console.log(`\nDate range: ${dateRange.id} (${dateRange.format})`);

      for (const tier of BUDGET_TIERS) {
        completedTasks++;
        const taskLabel = `${dateRange.id} | ${tier.label}`;

        // Check freshness
        if (await isDataFresh(dateRange.id, tier.value)) {
          console.log(`  [${completedTasks}/${totalTasks}] ${taskLabel} - FRESH, skipping`);
          await updateJobProgress(jobId, completedTasks, totalTasks, `${taskLabel} (skipped)`);
          continue;
        }

        console.log(`  [${completedTasks}/${totalTasks}] ${taskLabel} - scraping...`);
        await updateJobProgress(jobId, completedTasks, totalTasks, taskLabel);

        const url = buildAirbnbUrl(
          dateRange.departDate,
          dateRange.returnDate,
          tier.totalMin,
          tier.totalMax
        );

        try {
          const page = await browser!.newPage();
          await page.setViewport({ width: 1920, height: 1080 });

          const listings = await scrapeAirbnbPage(page, url);
          console.log(`    Found ${listings.length} listings`);

          await page.close();

          if (listings.length > 0) {
            const now = new Date().toISOString();

            const rows: AirbnbListingRow[] = listings.map((l) => ({
              date_range_id: dateRange.id,
              listing_name: l.name,
              price_per_night: l.price,
              price_per_person_per_night: parseFloat(
                (l.price / TOTAL_PEOPLE).toFixed(2)
              ),
              total_stay_cost: l.price * NIGHTS,
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

            // Delete old listings for this date range + tier, then insert fresh
            await supabase
              .from("airbnb_listings")
              .delete()
              .eq("date_range_id", dateRange.id)
              .eq("budget_tier", tier.value);

            // Insert in batches of 20
            for (let i = 0; i < rows.length; i += 20) {
              const batch = rows.slice(i, i + 20);
              const { error } = await supabase
                .from("airbnb_listings")
                .insert(batch);
              if (error) {
                console.error(`    DB insert error: ${error.message}`);
              }
            }

            console.log(`    Saved ${rows.length} listings to DB`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`    ERROR: ${msg}`);
        }

        // Random delay between page loads
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
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
