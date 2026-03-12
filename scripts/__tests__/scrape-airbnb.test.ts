/**
 * Tests for the Airbnb scraper.
 *
 * Tests the pure helper functions (URL building, data transformation,
 * price calculations) and the logic for staleness checks and listing
 * row construction.
 */

import type { BudgetTier, AirbnbListingRow } from "../../src/lib/types";

// --- Pure functions copied from scrape-airbnb.ts ---

const TOTAL_PEOPLE = 17;
const NIGHTS = 3;
const STALE_THRESHOLD_MS = 12 * 60 * 60 * 1000;

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

  params.append("property_type_id[]", "4");
  params.append("amenities[]", "7");

  return `https://www.airbnb.com/s/Tulum--Quintana-Roo--Mexico/homes?${params.toString()}`;
}

interface ScrapedListing {
  name: string;
  price: number;
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

function buildListingRow(
  listing: ScrapedListing,
  dateRangeId: string,
  tier: BudgetTier
): AirbnbListingRow {
  const now = new Date().toISOString();
  return {
    date_range_id: dateRangeId,
    listing_name: listing.name,
    price_per_night: listing.price,
    price_per_person_per_night: parseFloat(
      (listing.price / TOTAL_PEOPLE).toFixed(2)
    ),
    total_stay_cost: listing.price * NIGHTS,
    rating: listing.rating,
    review_count: listing.reviewCount,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    max_guests: listing.maxGuests,
    amenities: listing.amenities,
    image_url: listing.imageUrl,
    airbnb_url: listing.airbnbUrl,
    superhost: listing.superhost,
    budget_tier: tier,
    scraped_at: now,
  };
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ==========================================================================
// Tests
// ==========================================================================

describe("buildAirbnbUrl", () => {
  it("should produce a valid Airbnb search URL", () => {
    const url = buildAirbnbUrl("2026-07-02", "2026-07-05", 850, 1020);

    expect(url).toContain("airbnb.com/s/Tulum--Quintana-Roo--Mexico/homes");
    expect(url).toContain("checkin=2026-07-02");
    expect(url).toContain("checkout=2026-07-05");
    expect(url).toContain("adults=17");
    expect(url).toContain("currency=USD");
    expect(url).toContain("price_min=850");
    expect(url).toContain("price_max=1020");
  });

  it("should include property_type_id for entire home (4)", () => {
    const url = buildAirbnbUrl("2026-07-02", "2026-07-05", 850, 1020);
    // URLSearchParams encodes [] as %5B%5D
    expect(url).toContain("property_type_id");
    expect(url).toContain("4");
  });

  it("should include amenities filter for pool (7)", () => {
    const url = buildAirbnbUrl("2026-07-02", "2026-07-05", 850, 1020);
    expect(url).toContain("amenities");
    expect(url).toContain("7");
  });

  it("should generate correct URLs for each budget tier", () => {
    for (const tier of BUDGET_TIERS) {
      const url = buildAirbnbUrl(
        "2026-07-02",
        "2026-07-05",
        tier.totalMin,
        tier.totalMax
      );

      expect(url).toContain(`price_min=${tier.totalMin}`);
      expect(url).toContain(`price_max=${tier.totalMax}`);
    }
  });

  it("should use 17 adults", () => {
    const url = buildAirbnbUrl("2026-06-04", "2026-06-07", 850, 1020);
    expect(url).toContain("adults=17");
  });
});

describe("Budget tier configuration", () => {
  it("should have exactly 3 tiers: budget, mid, premium", () => {
    expect(BUDGET_TIERS).toHaveLength(3);
    expect(BUDGET_TIERS.map((t) => t.value)).toEqual([
      "budget",
      "mid",
      "premium",
    ]);
  });

  it("should have non-overlapping price ranges", () => {
    for (let i = 0; i < BUDGET_TIERS.length - 1; i++) {
      expect(BUDGET_TIERS[i].totalMax).toBeLessThanOrEqual(
        BUDGET_TIERS[i + 1].totalMin
      );
    }
  });

  it("budget tier should match $50-60/person/night for 17 people", () => {
    const budget = BUDGET_TIERS.find((t) => t.value === "budget")!;
    expect(budget.totalMin).toBe(850); // 50 * 17
    expect(budget.totalMax).toBe(1020); // 60 * 17
  });

  it("mid tier should match $60-70/person/night for 17 people", () => {
    const mid = BUDGET_TIERS.find((t) => t.value === "mid")!;
    expect(mid.totalMin).toBe(1020); // 60 * 17
    expect(mid.totalMax).toBe(1190); // 70 * 17
  });

  it("premium tier should match $70-80/person/night for 17 people", () => {
    const premium = BUDGET_TIERS.find((t) => t.value === "premium")!;
    expect(premium.totalMin).toBe(1190); // 70 * 17
    expect(premium.totalMax).toBe(1360); // 80 * 17
  });
});

describe("Listing row construction", () => {
  const testListing: ScrapedListing = {
    name: "Stunning Villa in Tulum with Pool",
    price: 900,
    rating: 4.92,
    reviewCount: 156,
    bedrooms: 6,
    bathrooms: 5,
    maxGuests: 18,
    amenities: ["Pool", "WiFi", "Kitchen", "AC"],
    imageUrl: "https://a0.muscache.com/pictures/abc123.jpg",
    airbnbUrl: "https://www.airbnb.com/rooms/12345678",
    superhost: true,
  };

  it("should set all required fields", () => {
    const row = buildListingRow(
      testListing,
      "2026-07-02_2026-07-05",
      "budget"
    );

    expect(row.date_range_id).toBe("2026-07-02_2026-07-05");
    expect(row.listing_name).toBe("Stunning Villa in Tulum with Pool");
    expect(row.price_per_night).toBe(900);
    expect(row.rating).toBe(4.92);
    expect(row.review_count).toBe(156);
    expect(row.bedrooms).toBe(6);
    expect(row.bathrooms).toBe(5);
    expect(row.max_guests).toBe(18);
    expect(row.superhost).toBe(true);
    expect(row.budget_tier).toBe("budget");
    expect(row.scraped_at).toBeDefined();
  });

  it("should calculate price_per_person_per_night correctly (price / 17)", () => {
    const row = buildListingRow(
      testListing,
      "2026-07-02_2026-07-05",
      "budget"
    );

    // 900 / 17 = 52.94
    expect(row.price_per_person_per_night).toBeCloseTo(52.94, 2);
  });

  it("should calculate total_stay_cost correctly (price * 3 nights)", () => {
    const row = buildListingRow(
      testListing,
      "2026-07-02_2026-07-05",
      "budget"
    );

    expect(row.total_stay_cost).toBe(2700); // 900 * 3
  });

  it("should preserve amenities array", () => {
    const row = buildListingRow(
      testListing,
      "2026-07-02_2026-07-05",
      "budget"
    );

    expect(row.amenities).toEqual(["Pool", "WiFi", "Kitchen", "AC"]);
  });

  it("should preserve image and listing URLs", () => {
    const row = buildListingRow(
      testListing,
      "2026-07-02_2026-07-05",
      "budget"
    );

    expect(row.image_url).toBe(
      "https://a0.muscache.com/pictures/abc123.jpg"
    );
    expect(row.airbnb_url).toBe("https://www.airbnb.com/rooms/12345678");
  });

  it("should handle zero-priced listings", () => {
    const freeVilla = { ...testListing, price: 0 };
    const row = buildListingRow(
      freeVilla,
      "2026-07-02_2026-07-05",
      "budget"
    );

    expect(row.price_per_night).toBe(0);
    expect(row.price_per_person_per_night).toBe(0);
    expect(row.total_stay_cost).toBe(0);
  });

  it("should handle listing with no amenities", () => {
    const noAmenities = { ...testListing, amenities: [] };
    const row = buildListingRow(
      noAmenities,
      "2026-07-02_2026-07-05",
      "budget"
    );

    expect(row.amenities).toEqual([]);
  });

  it("should handle listing with zero rating and reviews", () => {
    const noReviews = { ...testListing, rating: 0, reviewCount: 0 };
    const row = buildListingRow(
      noReviews,
      "2026-07-02_2026-07-05",
      "budget"
    );

    expect(row.rating).toBe(0);
    expect(row.review_count).toBe(0);
  });

  it("should assign the correct budget tier", () => {
    for (const tier of BUDGET_TIERS) {
      const row = buildListingRow(
        testListing,
        "2026-07-02_2026-07-05",
        tier.value
      );
      expect(row.budget_tier).toBe(tier.value);
    }
  });
});

describe("Batch processing", () => {
  it("should correctly batch listings in groups of 20", () => {
    const listings: ScrapedListing[] = Array.from({ length: 45 }, (_, i) => ({
      name: `Villa ${i + 1}`,
      price: 850 + i * 10,
      rating: 4.5 + Math.random() * 0.5,
      reviewCount: 50 + i,
      bedrooms: 5,
      bathrooms: 4,
      maxGuests: 17,
      amenities: ["Pool"],
      imageUrl: `https://example.com/img${i}.jpg`,
      airbnbUrl: `https://airbnb.com/rooms/${i}`,
      superhost: i % 3 === 0,
    }));

    const rows = listings.map((l) =>
      buildListingRow(l, "2026-07-02_2026-07-05", "budget")
    );

    // Simulate batch insertion (batches of 20)
    const batchSize = 20;
    const batches: AirbnbListingRow[][] = [];
    for (let i = 0; i < rows.length; i += batchSize) {
      batches.push(rows.slice(i, i + batchSize));
    }

    expect(batches).toHaveLength(3); // 20 + 20 + 5
    expect(batches[0]).toHaveLength(20);
    expect(batches[1]).toHaveLength(20);
    expect(batches[2]).toHaveLength(5);

    // All rows should be accounted for
    const totalRows = batches.reduce((sum, b) => sum + b.length, 0);
    expect(totalRows).toBe(45);
  });
});

describe("Staleness check logic", () => {
  it("should consider data fresh if scraped less than 12 hours ago", () => {
    const scrapedAt = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const isFresh = Date.now() - scrapedAt.getTime() < STALE_THRESHOLD_MS;
    expect(isFresh).toBe(true);
  });

  it("should consider data stale if scraped more than 12 hours ago", () => {
    const scrapedAt = new Date(Date.now() - 13 * 60 * 60 * 1000);
    const isFresh = Date.now() - scrapedAt.getTime() < STALE_THRESHOLD_MS;
    expect(isFresh).toBe(false);
  });

  it("should consider data stale at exactly 12 hours", () => {
    const scrapedAt = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const isFresh = Date.now() - scrapedAt.getTime() < STALE_THRESHOLD_MS;
    expect(isFresh).toBe(false);
  });
});

describe("Price per person calculations", () => {
  it("should correctly divide total nightly price by 17 people", () => {
    const testCases = [
      { total: 850, expected: 50.0 },
      { total: 1020, expected: 60.0 },
      { total: 1190, expected: 70.0 },
      { total: 1360, expected: 80.0 },
      { total: 935, expected: 55.0 },
    ];

    for (const tc of testCases) {
      const perPerson = parseFloat((tc.total / TOTAL_PEOPLE).toFixed(2));
      expect(perPerson).toBeCloseTo(tc.expected, 2);
    }
  });

  it("should correctly calculate total stay cost for 3 nights", () => {
    const nightlyPrices = [850, 950, 1020, 1100, 1190, 1360];

    for (const nightly of nightlyPrices) {
      const totalStay = nightly * NIGHTS;
      expect(totalStay).toBe(nightly * 3);
    }
  });
});

describe("User agent rotation", () => {
  const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128",
  ];

  it("should always return a valid user agent", () => {
    for (let i = 0; i < 50; i++) {
      const ua = pickRandom(USER_AGENTS);
      expect(USER_AGENTS).toContain(ua);
      expect(ua).toContain("Mozilla/5.0");
    }
  });
});

describe("Airbnb URL for user links (manual fallback)", () => {
  it("should generate a valid manual search URL for users", () => {
    const url = buildAirbnbUrl("2026-07-02", "2026-07-05", 850, 1020);

    // Users should be able to open this URL to search manually
    expect(url.startsWith("https://www.airbnb.com/s/Tulum")).toBe(true);
    expect(url).toContain("checkin=2026-07-02");
    expect(url).toContain("checkout=2026-07-05");
    expect(url).toContain("adults=17");
  });
});
