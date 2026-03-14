/**
 * Estimate scrape duration in minutes based on current configuration.
 *
 * Models the actual GitHub Actions workflow timing:
 *  1. setup-matrix  — fixed overhead
 *  2. scrape-flights — parallel jobs (max 19), each processing airports × date ranges
 *  3. scrape-airbnb  — date range × tier tasks, parallel search + cached detail enrichment
 *  4. finalize       — fixed overhead
 *
 * All timing constants match the values set in .github/workflows/scrape.yml
 * and the script defaults in scripts/scrape-flights.ts / scrape-airbnb.ts.
 */

// ── Workflow-level constants (from scrape.yml + get-airport-matrix.ts) ──
// GitHub Actions allows 20 concurrent jobs; 19 are reserved for Google Flights
// scraping (MAX_JOBS in get-airport-matrix.ts), leaving 1 slot for airbnb/finalize.
const MAX_FLIGHT_JOBS = 19;

// ── Flight scraper constants (from scrape.yml env overrides) ──
const DATE_RANGE_CONCURRENCY = 4;      // scrape.yml: "4" (script default: 2)
const CATEGORY_STAGGER_MS = 1500;      // scrape.yml: "1500" (script default: 2000)
const POST_LOAD_DELAY_MS = 800;        // scrape.yml: "800" (script default: 1000)
const POST_FILTER_DELAY_MS = 1500;     // scrape.yml: "1500" (script default: 2000)
const RETURN_POST_DELAY_MS = 300;      // scrape.yml: "300" (script default: 500)
const TOP_N_PER_CATEGORY = 3;          // hard-coded in scrape-flights.ts
const PAGE_LOAD_MS = 5000;             // avg page.goto + waitForSelector on GitHub runners
const RANDOM_STAGGER_AVG_MS = 500;     // average of Math.random() * 1000

// ── Airbnb scraper constants (from scrape-airbnb.ts) ──
const AIRBNB_SEARCH_CONCURRENCY = 3;   // parallel tasks (date range × tier)
const AIRBNB_MAX_PAGES_PER_TIER = 3;   // max paginated search pages per task
const AIRBNB_BUDGET_TIERS = 3;         // budget, mid, premium
const AIRBNB_PAGE_FETCH_MS = 1500;     // avg time per search page HTTP fetch (Axios, no browser)
const AIRBNB_BATCH_DELAY_MS = 1500;    // avg randomDelay(1000, 2000) between batches
// Detail enrichment is mostly cached (persistent Supabase cache + in-memory),
// adding ~0.5-1s per task on warm runs. Cold runs (first ever) take longer but are rare.
const AIRBNB_DETAIL_OVERHEAD_MS = 800;

interface EstimateInput {
  airportCount: number;
  dateRangeCount: number;
  categoryCount: number;
}

export function estimateRefreshMinutes({ airportCount, dateRangeCount, categoryCount }: EstimateInput): number {
  if (airportCount === 0 || dateRangeCount === 0 || categoryCount === 0) return 0;

  // ── Stage 1: Setup (checkout + npm ci + matrix generation) ──
  const setupMs = 60_000;

  // ── Stage 2: Flights ──
  // Airports distributed round-robin across up to 19 flight jobs
  const jobCount = Math.min(airportCount, MAX_FLIGHT_JOBS);
  const airportsPerJob = Math.ceil(airportCount / jobCount);

  // Per airport+daterange: all categories launch in parallel with stagger
  //   - Page load + DOM wait: PAGE_LOAD_MS
  //   - POST_LOAD_DELAY_MS after load
  //   - ~half categories are carry-on, adding POST_FILTER_DELAY_MS
  //   - Each category fetches TOP_N return flights via POST
  const carryon_categories = Math.ceil(categoryCount / 2);
  const avgCategoryMs =
    PAGE_LOAD_MS +
    POST_LOAD_DELAY_MS +
    (carryon_categories > 0 ? POST_FILTER_DELAY_MS : 0) +
    TOP_N_PER_CATEGORY * (RETURN_POST_DELAY_MS + 400); // ~400ms avg POST roundtrip

  // Categories run in parallel but staggered — wall time is last start + single category time
  const lastCategoryStart = Math.max(0, categoryCount - 1) * (CATEGORY_STAGGER_MS + RANDOM_STAGGER_AVG_MS);
  const taskMs = lastCategoryStart + avgCategoryMs;

  // Date ranges run in batches of DATE_RANGE_CONCURRENCY
  const dateRangeWaves = Math.ceil(dateRangeCount / DATE_RANGE_CONCURRENCY);

  // Per job: airports × date range waves × task time (all jobs run in parallel)
  const flightMs = airportsPerJob * dateRangeWaves * taskMs;

  // ── Stage 3: Airbnb ──
  // Tasks = dateRanges × tiers, processed SEARCH_CONCURRENCY at a time
  const airbnbTasks = dateRangeCount * AIRBNB_BUDGET_TIERS;
  const airbnbWaves = Math.ceil(airbnbTasks / AIRBNB_SEARCH_CONCURRENCY);
  // Per task: fetch MAX_PAGES search pages + detail enrichment (mostly cached)
  const perTaskMs = AIRBNB_MAX_PAGES_PER_TIER * AIRBNB_PAGE_FETCH_MS + AIRBNB_DETAIL_OVERHEAD_MS;
  // Per wave: tasks run in parallel, then batch delay
  const airbnbMs = airbnbWaves * (perTaskMs + AIRBNB_BATCH_DELAY_MS);

  // ── Stage 4: Finalize (snapshot + aggregate + promote + cleanup) ──
  const finalizeMs = 120_000;

  // Stages run sequentially: setup → flights → airbnb → finalize
  const totalMs = setupMs + flightMs + airbnbMs + finalizeMs;
  const totalMin = totalMs / 60_000;

  return Math.max(1, Math.round(totalMin));
}
