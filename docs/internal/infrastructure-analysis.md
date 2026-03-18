# TripSync: Infrastructure Analysis & Data Scraping Strategy
*Last updated: March 2026*
*Based on: release-V3 branch*

---

## 1. Marketing Plan Review (Quick Take)

The marketing strategy doc is solid. The positioning ("which weekend + total cost") is genuinely differentiated. The pricing tiers ($4.99/trip, $9.99/group, $39.99/yr) are well-researched against comps. The P0 action items (rebrand, solo mode, Stripe) are correct priorities.

**One critical gap the doc identifies but underestimates: the entire product depends on scraped data. If scraping breaks, there is no product.** That's what this document addresses.

---

## 2. Current Infrastructure at a Glance

| Component | Current State | Cost (Today) |
|---|---|---|
| **Frontend** | Next.js 16 on Vercel | Free (Hobby) |
| **Database** | Supabase (PostgreSQL + Auth + RLS) | Free tier |
| **Flight Scraping** | Puppeteer + stealth plugin on GitHub Actions | Free tier (public repo) |
| **Airbnb Scraping** | HTTP/axios HTML parsing (no browser) | Free tier |
| **CI/CD** | GitHub Actions (scrape.yml, ci.yml) | Free tier |
| **Scrape Trigger** | GitHub API workflow_dispatch from web app | Free |

**Today's monthly cost: ~$0** (everything on free tiers, 1 trip)

---

## 3. Can This Support 1,000 Customers? No.

Here's the math on why the current architecture collapses at scale:

### 3a. Scraping Cost Explosion

**Current per-trip scrape run:**
- 19 parallel GitHub Actions jobs (flight matrix) x ~45 min avg = 855 min
- 1 Airbnb job x ~25 min = 25 min
- Setup + finalize = ~10 min
- **Total: ~890 min per trip per run**

**At 1,000 customers:**
- ~300 active trips at any time (trips last 2-4 weeks)
- 6 scrape runs/day (every 4 hours)
- **300 trips x 890 min x 6 runs = 1,602,000 min/day = 48M min/month**

GitHub Actions pricing (2026): ~$0.008/min for private repo Linux runners
- **48M x $0.008 = $384,000/month** on scraping alone

Even on a public repo (free runner time), the new $0.002/min cloud platform charge = **$96,000/month**.

### 3b. Other Infrastructure Scaling

| Component | 1,000 Customers | Estimated Cost |
|---|---|---|
| **Vercel** | Pro plan required (commercial TOS) | $20-40/mo |
| **Supabase** | Pro plan (8GB DB, 100K MAU) | $25-75/mo |
| **Domain** | Rebrand needed anyway | ~$15/yr |
| **Total (non-scraping)** | | **~$50-120/mo** |

**The non-scraping infrastructure is fine and cheap. Scraping is 99.9% of the cost problem.**

### 3c. Reliability Risk

Beyond cost, the scrapers are fragile:

| Risk | Flights (Puppeteer) | Airbnb (HTTP) |
|---|---|---|
| **API/HTML changes** | Google's internal `GetShoppingResults` API is undocumented — can break anytime | `data-deferred-state-0` JSON embed could change |
| **Bot detection** | CAPTCHAs already gate data promotion | Bot detection blocks noted in code |
| **Legal** | Scraping Google Flights violates TOS | Airbnb TOS explicitly prohibits scraping |
| **Scale fragility** | 19 parallel browser instances per trip = massive IP exposure | HTTP-only, much lighter footprint |

**At 1,000 customers, we'd be hitting Google Flights with ~17,000 headless Chrome sessions/day. That's a CAPTCHA death spiral.**

---

## 4. Paths to Fix Data Scraping

Five concrete paths, ordered from cheapest to most robust:

### Path A: Optimize Current Scraping + Route Deduplication
**"Make the current system smarter"**

| Change | Impact |
|---|---|
| Route-level deduplication | If Trip A and Trip B both fly SFO->CUN, scrape it once and share results |
| Reduce frequency | 2x/day instead of 6x (prices don't change every 4 hours) |
| Self-hosted runners | Hetzner VPS ($40/mo) instead of GitHub Actions |
| Smart scheduling | Only re-scrape routes where prices are likely stale |

**Cost estimate (300 active trips):**
- ~400 unique routes x 8 date ranges = 3,200 scrape tasks per run
- 2 runs/day on 3-4 Hetzner VPS boxes running Chrome: **$120-200/mo**

| Pros | Cons |
|---|---|
| No code rewrite needed | Still scraping (fragile, TOS violation) |
| Cheapest short-term path | CAPTCHAs will increase with volume |
| Same data quality | Google could block IP ranges |
| | Doesn't solve legal risk |

**Monthly cost: ~$170-270**
**Implementation effort: 1-2 weeks**

---

### Path B: Replace Flights Scraping with SerpApi
**"Let someone else scrape Google Flights for you"**

SerpApi (https://serpapi.com/google-flights-api) provides a managed Google Flights API — they handle browsers, CAPTCHAs, proxies, and IP rotation. You get structured JSON back.

**Pricing:**
- Developer: $75/mo for 5,000 searches
- Production: $150/mo for 15,000 searches
- Big Data: $275/mo for 30,000 searches ($0.009/search)
- Enterprise reserved: $2.75 per 1,000 searches ($0.00275/search)

**Cost estimate (300 active trips, deduplicated):**
- 3,200 unique tasks x 2 runs/day = 6,400/day = ~192,000 searches/month
- Enterprise reserved: 192 x $2.75 = **$528/mo**
- Big Data plan: 192,000 x $0.009 = **$1,728/mo**

| Pros | Cons |
|---|---|
| Same Google Flights data | SerpApi is a dependency (vendor lock) |
| No browser infrastructure to manage | Still scraping Google (SerpApi's problem, but still) |
| CAPTCHAs are SerpApi's problem | $500-1,700/mo vs $0 today |
| Structured JSON response | Search volume could exceed estimates |
| Legal liability shifts to SerpApi | |

**Monthly cost: ~$530-1,730 + Supabase $25 + Vercel $20 = $575-1,775**
**Implementation effort: 1-2 weeks** (replace Puppeteer calls with SerpApi HTTP calls)

---

### Path C: Switch to Affiliate Flight APIs (Skyscanner / Travelpayouts)
**"Use free APIs and earn revenue from bookings"**

| API | Cost | Rate Limit | Coverage | Catch |
|---|---|---|---|---|
| Skyscanner Flights API | **Free** | 100/min live, 500/min cache | 1,200+ airlines | Must be approved as affiliate partner |
| Travelpayouts/Aviasales | **Free** | 200 queries/hour | 700+ airlines | Must join affiliate program |
| Kiwi Tequila | **Free** | Unknown | 750+ airlines | Invitation-only for new partners |

**Cost estimate:** Effectively **$0/mo** for the API itself. Just need a small VPS to run the scheduled queries (~$10-20/mo).

**Revenue opportunity:** Affiliate commissions (1-5% of booking value) when users click through to book. The marketing doc already plans for this as Phase 2 revenue.

**The trade-off is data format:**
- These APIs return **their own** flight results, not Google Flights results
- Prices may differ slightly from Google Flights
- You lose the Google Flights URL deep-link

| Pros | Cons |
|---|---|
| **$0 API cost** | Different data than Google Flights |
| Legal and TOS-compliant | Must apply and get approved |
| Revenue from affiliate commissions | May not cover all routes |
| Reliable, uptime-guaranteed | Skyscanner approval can take weeks |
| Structured data, no parsing needed | Data format migration needed |

**Monthly cost: ~$30-55** (VPS + Supabase + Vercel)
**Implementation effort: 2-3 weeks** (new API integration, data model adjustments)

---

### Path D: Amadeus Self-Service API
**"Use the industry-standard GDS"**

Amadeus (https://developers.amadeus.com/) provides access to real airline inventory through the Global Distribution System. This is what professional travel agencies use.

**Pricing:**
- Free: 2,000 searches/month (test environment)
- Production: Usage-based (pricing is opaque — requires contacting sales)
- Estimated: $0.05-0.20 per search based on volume

**Cost estimate (300 active trips, deduplicated):**
- 192,000 searches/month
- At $0.05/search: **$9,600/mo**
- At $0.10/search: **$19,200/mo**
- With negotiated startup rate: potentially **$3,000-5,000/mo**

| Pros | Cons |
|---|---|
| Real GDS data (most accurate prices) | Most expensive option |
| Industry standard, fully legal | Opaque pricing, must negotiate |
| Direct booking integration possible | Enterprise-focused onboarding |
| Best data quality | Free tier is tiny (2K/mo) |

**Monthly cost: ~$3,000-19,200**
**Implementation effort: 3-4 weeks** (new API integration + Amadeus certification)

---

### Path E: Hybrid (Recommended)
**"Free APIs for flights + keep lightweight Airbnb scraper + smart caching"**

This combines the best elements:

| Component | Approach | Cost |
|---|---|---|
| **Flights** | Skyscanner or Travelpayouts API (free, affiliate) | $0/mo |
| **Airbnb** | Keep current HTTP scraper (it's lightweight, no Puppeteer) + add proxy rotation | $10-30/mo |
| **Caching** | Route-level deduplication + 12-hour refresh cycle | $0 |
| **Compute** | Small VPS for scheduled scraping jobs (replaces GH Actions) | $10-20/mo |
| **Database** | Supabase Pro | $25/mo |
| **Hosting** | Vercel Pro | $20/mo |
| **Proxy** | Rotating residential proxies for Airbnb (when blocked) | $20-50/mo |

**If Skyscanner/Travelpayouts approval is delayed**, use SerpApi as a bridge:
- SerpApi Enterprise: ~$530/mo for the interim
- Switch to free API once approved

| Pros | Cons |
|---|---|
| Lowest sustainable cost ($85-145/mo) | Must apply to affiliate programs |
| Legal for flights (API) | Airbnb scraping still has TOS risk |
| Revenue from affiliate links | Different data source than Google Flights |
| Airbnb scraper is already fast & working | Proxy costs if Airbnb blocks increase |
| Route deduplication scales well | 2-3 week migration |

**Monthly cost: ~$85-145/mo** (steady state) or **~$625/mo** (with SerpApi bridge)
**Implementation effort: 2-3 weeks**

---

## 5. Cost Comparison Summary

| Path | Monthly Cost (300 active trips) | Reliability | Legal Risk | Implementation |
|---|---|---|---|---|
| **Current (do nothing)** | $96,000-384,000 | Low (CAPTCHAs) | High | None |
| **A: Optimize scraping** | $170-270 | Medium | High | 1-2 weeks |
| **B: SerpApi** | $575-1,775 | High | Medium | 1-2 weeks |
| **C: Free affiliate APIs** | $30-55 | High | None | 2-3 weeks |
| **D: Amadeus GDS** | $3,000-19,200 | Highest | None | 3-4 weeks |
| **E: Hybrid (recommended)** | $85-145 | High | Low | 2-3 weeks |

---

## 6. Recommendation

**Go with Path E (Hybrid) in two phases:**

### Phase 1 (Week 1-2): Immediate
1. Apply to Skyscanner Partner API (https://www.partners.skyscanner.net/product/travel-api) and Travelpayouts (https://www.travelpayouts.com/) today
2. Build route-level deduplication into the scraping architecture
3. Reduce scrape frequency to 2x/day
4. Move scraping from GitHub Actions to a cheap VPS ($10-20/mo)

### Phase 2 (Week 2-3): API Migration
1. Once approved for Skyscanner/Travelpayouts, replace Puppeteer flight scraping with API calls
2. Keep the Airbnb HTTP scraper (it works well and costs almost nothing)
3. Add rotating proxy support for Airbnb ($20-50/mo) as a safety net
4. Implement affiliate deep-links (this becomes a revenue stream)

**Fallback:** If affiliate API approval is slow, use SerpApi ($530/mo) as a bridge. It's the same Google Flights data, just managed by someone else.

**Steady-state cost for 1,000 customers: ~$85-145/month** — a 99.96% reduction from the current architecture at scale.

---

## Sources

- Amadeus Self-Service Pricing: https://developers.amadeus.com/pricing
- SerpApi Plans and Pricing: https://serpapi.com/pricing
- SerpApi Google Flights API: https://serpapi.com/google-flights-api
- Skyscanner Partner API: https://www.partners.skyscanner.net/product/travel-api
- Travelpayouts Flight APIs: https://www.travelpayouts.com/blog/flight-apis-and-travel-project-ideas/
- Kiwi Tequila API: https://kiwicom.github.io/margarita/docs/tequila-api
- Duffel Pricing: https://duffel.com/pricing
- FlightAPI.io: https://www.flightapi.io/
- ScrapingBee Pricing: https://www.scrapingbee.com/pricing/
- GitHub Actions 2026 Pricing Changes: https://resources.github.com/actions/2026-pricing-changes-for-github-actions/
- GitHub Actions Runner Pricing: https://docs.github.com/en/billing/reference/actions-runner-pricing
- Supabase Pricing: https://supabase.com/pricing
- Vercel Pricing: https://vercel.com/pricing
- Top 5 Flight APIs in 2026 (ScrapingBee): https://www.scrapingbee.com/blog/top-flights-apis-for-travel-apps/
- Best Airbnb Data Providers 2026: https://brightdata.com/blog/web-data/best-airbnb-data-providers
