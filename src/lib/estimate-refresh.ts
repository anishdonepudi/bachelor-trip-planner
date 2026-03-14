/**
 * Estimate scrape duration in minutes based on current configuration.
 *
 * Models the actual GitHub Actions workflow timing:
 *  1. setup-matrix  — fixed overhead
 *  2. scrape-flights — parallel jobs (max 19), each processing airports × date ranges
 *  3. scrape-airbnb  — sequential tiers, parallel date ranges
 *  4. finalize       — fixed overhead
 *
 * All timing constants match the values set in .github/workflows/scrape.yml
 * and the script defaults in scripts/scrape-flights.ts / scrape-airbnb.ts.
 */

// ── Workflow-level constants (from scrape.yml) ──
const MAX_PARALLEL_JOBS = 19;

// ── Flight scraper constants (from scrape.yml env overrides) ──
const DATE_RANGE_CONCURRENCY = 4;      // scrape.yml: "4" (script default: 2)
const CATEGORY_STAGGER_MS = 1500;      // scrape.yml: "1500" (script default: 2000)
const POST_LOAD_DELAY_MS = 800;        // scrape.yml: "800" (script default: 1000)
const POST_FILTER_DELAY_MS = 1500;     // scrape.yml: "1500" (script default: 2000)
const RETURN_POST_DELAY_MS = 300;      // scrape.yml: "300" (script default: 500)
const TOP_N_PER_CATEGORY = 3;          // hard-coded in scrape-flights.ts
const PAGE_LOAD_MS = 8000;             // avg page.goto + waitForSelector
const RANDOM_STAGGER_AVG_MS = 500;     // average of Math.random() * 1000

// ── Airbnb scraper constants (from scrape-airbnb.ts) ──
const AIRBNB_SEARCH_CONCURRENCY = 3;
const AIRBNB_MAX_PAGES_PER_TIER = 3;
const AIRBNB_BUDGET_TIERS = 3;
const AIRBNB_DETAIL_CONCURRENCY_COLD = 3;
const AIRBNB_DETAIL_STAGGER_MS = 400;
const AIRBNB_DETAIL_FETCH_AVG_MS = 5000; // avg detail page fetch
const AIRBNB_AVG_LISTINGS_PER_TIER = 15; // avg unique listings per tier-daterange

interface EstimateInput {
  airportCount: number;
  dateRangeCount: number;
  categoryCount: number;
}

export function estimateRefreshMinutes({ airportCount, dateRangeCount, categoryCount }: EstimateInput): number {
  if (airportCount === 0 || dateRangeCount === 0 || categoryCount === 0) return 0;

  // ── Stage 1: Setup (~1-2 min) ──
  const setupMs = 90_000;

  // ── Stage 2: Flights ──
  // Each job processes ceil(airports / min(airports, 19)) airports
  const jobCount = Math.min(airportCount, MAX_PARALLEL_JOBS);
  const airportsPerJob = Math.ceil(airportCount / jobCount);

  // Per airport+daterange: all categories launch in parallel with stagger
  // Time for one airport-daterange task:
  //   - Page load + DOM wait: PAGE_LOAD_MS
  //   - POST_LOAD_DELAY_MS after load
  //   - Categories launch staggered: last category starts at (n-1) * (CATEGORY_STAGGER + random)
  //   - Each category: if carryon, add POST_FILTER_DELAY_MS
  //   - Each category fetches TOP_N return flights: TOP_N * (POST request + RETURN_POST_DELAY)
  const carryon_categories = Math.ceil(categoryCount / 2); // roughly half are carry-on
  const avgCategoryMs =
    PAGE_LOAD_MS +
    POST_LOAD_DELAY_MS +
    (carryon_categories > 0 ? POST_FILTER_DELAY_MS : 0) +
    TOP_N_PER_CATEGORY * (RETURN_POST_DELAY_MS + 800); // 800ms avg POST roundtrip

  // All categories run in parallel but staggered — total wall time is:
  // last category start + single category time
  const lastCategoryStart = Math.max(0, categoryCount - 1) * (CATEGORY_STAGGER_MS + RANDOM_STAGGER_AVG_MS);
  const taskMs = lastCategoryStart + avgCategoryMs;

  // Date ranges run in batches of DATE_RANGE_CONCURRENCY
  const dateRangeWaves = Math.ceil(dateRangeCount / DATE_RANGE_CONCURRENCY);

  // Per job: airports × date range waves × task time
  const flightJobMs = airportsPerJob * dateRangeWaves * taskMs;

  // All jobs run in parallel — wall time is the slowest job
  const flightMs = flightJobMs;

  // ── Stage 3: Airbnb ──
  // Search phase: 3 tiers × MAX_PAGES pages, with SEARCH_CONCURRENCY parallel date ranges
  const searchWaves = Math.ceil(dateRangeCount / AIRBNB_SEARCH_CONCURRENCY);
  const searchPerWaveMs = AIRBNB_BUDGET_TIERS * AIRBNB_MAX_PAGES_PER_TIER * 2000; // ~2s per page fetch
  const searchMs = searchWaves * searchPerWaveMs;

  // Detail enrichment: avg listings per date range, cold concurrency
  const detailsPerDateRange = AIRBNB_AVG_LISTINGS_PER_TIER * AIRBNB_BUDGET_TIERS;
  const detailBatches = Math.ceil(detailsPerDateRange / AIRBNB_DETAIL_CONCURRENCY_COLD);
  const detailMs = searchWaves * detailBatches * (AIRBNB_DETAIL_FETCH_AVG_MS + AIRBNB_DETAIL_STAGGER_MS * AIRBNB_DETAIL_CONCURRENCY_COLD);

  const airbnbMs = searchMs + detailMs;

  // ── Stage 4: Finalize (~3-4 min) ──
  const finalizeMs = 210_000;

  // Stages run sequentially: setup → flights → airbnb → finalize
  const totalMs = setupMs + flightMs + airbnbMs + finalizeMs;
  const totalMin = totalMs / 60_000;

  return Math.max(1, Math.round(totalMin));
}
