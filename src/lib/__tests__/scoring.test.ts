import { calculateWeekendScore, scoreAllWeekends } from "../scoring";
import type {
  DateRange,
  Flight,
  AirbnbListingRow,
  CityConfig,
  FlightOptionRow,
} from "../types";

// ---------------------------------------------------------------------------
// Helpers to create test fixtures
// ---------------------------------------------------------------------------

function makeWeekend(overrides?: Partial<DateRange>): DateRange {
  return {
    id: "2026-07-02_2026-07-05",
    departDate: "2026-07-02",
    returnDate: "2026-07-05",
    format: "Thu-Sun",
    ...overrides,
  };
}

function makeFlight(overrides?: Partial<Flight>): Flight {
  return {
    date_range_id: "2026-07-02_2026-07-05",
    trip_format: "Thu-Sun",
    depart_date: "2026-07-02",
    return_date: "2026-07-05",
    origin_city: "San Francisco",
    category: "nonstop_carryon",
    airport_used: "SFO",
    price: 300,
    airline: "United",
    outbound_details: null,
    return_details: null,
    google_flights_url: null,
    scraped_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeAirbnb(overrides?: Partial<AirbnbListingRow>): AirbnbListingRow {
  return {
    date_range_id: "2026-07-02_2026-07-05",
    listing_name: "Test Villa",
    price_per_night: 850,
    price_per_person_per_night: 50,
    total_stay_cost: 2550,
    rating: 4.9,
    review_count: 100,
    bedrooms: 6,
    bathrooms: 5,
    max_guests: 17,
    amenities: ["Pool", "WiFi"],
    image_url: "https://example.com/img.jpg",
    airbnb_url: "https://airbnb.com/rooms/123",
    superhost: true,
    budget_tier: "budget",
    scraped_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeCity(overrides?: Partial<CityConfig>): CityConfig {
  return {
    city: "San Francisco",
    people: 8,
    primaryAirports: ["SFO"],
    nearbyAirports: ["OAK", "SJC"],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateWeekendScore tests
// ---------------------------------------------------------------------------

describe("calculateWeekendScore", () => {
  const weekend = makeWeekend();

  it("should return Infinity cost and empty perCityCosts when no airbnb matches the tier", () => {
    const result = calculateWeekendScore(
      weekend,
      [makeFlight()],
      [],
      [], // no airbnbs
      "nonstop_carryon",
      "budget",
      [makeCity()]
    );
    expect(result.totalGroupCost).toBe(Infinity);
    expect(result.perCityCosts).toHaveLength(0);
    expect(result.score).toBe(0);
  });

  it("should calculate correct per-person total (flight + stay)", () => {
    const flight = makeFlight({ price: 300 });
    const airbnb = makeAirbnb({ price_per_person_per_night: 50 });
    const city = makeCity({ people: 1 });

    const result = calculateWeekendScore(
      weekend,
      [flight],
      [],
      [airbnb],
      "nonstop_carryon",
      "budget",
      [city]
    );

    // stay = 50 * 3 nights = 150; total = 300 + 150 = 450
    expect(result.perCityCosts[0].stayCost).toBe(150);
    expect(result.perCityCosts[0].flightCost).toBe(300);
    expect(result.perCityCosts[0].perPersonTotal).toBe(450);
  });

  it("should multiply per-person cost by number of people for city total", () => {
    const flight = makeFlight({ price: 300 });
    const airbnb = makeAirbnb({ price_per_person_per_night: 50 });
    const city = makeCity({ people: 8 });

    const result = calculateWeekendScore(
      weekend,
      [flight],
      [],
      [airbnb],
      "nonstop_carryon",
      "budget",
      [city]
    );

    // perPerson = 300 + 150 = 450; cityTotal = 450 * 8 = 3600
    expect(result.perCityCosts[0].cityTotal).toBe(3600);
  });

  it("should sum city totals for totalGroupCost", () => {
    const flights = [
      makeFlight({ origin_city: "San Francisco", price: 300 }),
      makeFlight({ origin_city: "Houston", price: 200 }),
    ];
    const airbnb = makeAirbnb({ price_per_person_per_night: 50 });
    const cities = [
      makeCity({ city: "San Francisco", people: 8 }),
      makeCity({ city: "Houston", people: 1 }),
    ];

    const result = calculateWeekendScore(
      weekend,
      flights,
      [],
      [airbnb],
      "nonstop_carryon",
      "budget",
      cities
    );

    // SF: (300 + 150) * 8 = 3600
    // HOU: (200 + 150) * 1 = 350
    // Total: 3950
    expect(result.totalGroupCost).toBe(3950);
  });

  it("should handle missing flights for a city (null flightCost)", () => {
    const airbnb = makeAirbnb({ price_per_person_per_night: 50 });
    const city = makeCity({ city: "Phoenix", people: 1 });

    const result = calculateWeekendScore(
      weekend,
      [], // no flights
      [],
      [airbnb],
      "nonstop_carryon",
      "budget",
      [city]
    );

    expect(result.perCityCosts[0].flightCost).toBeNull();
    expect(result.perCityCosts[0].perPersonTotal).toBeNull();
    expect(result.perCityCosts[0].cityTotal).toBeNull();
  });

  it("should use the cheapest airbnb in the selected budget tier", () => {
    const airbnbs = [
      makeAirbnb({ price_per_person_per_night: 60, budget_tier: "budget" }),
      makeAirbnb({ price_per_person_per_night: 50, budget_tier: "budget" }),
      makeAirbnb({ price_per_person_per_night: 70, budget_tier: "mid" }),
    ];
    const flight = makeFlight({ price: 300 });
    const city = makeCity({ people: 1 });

    const result = calculateWeekendScore(
      weekend,
      [flight],
      [],
      airbnbs,
      "nonstop_carryon",
      "budget",
      [city]
    );

    // Should pick $50/pp/night, so stay = 50 * 3 = 150
    expect(result.perCityCosts[0].stayCost).toBe(150);
  });

  it("should pick the cheapest flight per city and category", () => {
    const flights = [
      makeFlight({
        origin_city: "San Francisco",
        price: 400,
        airport_used: "SFO",
      }),
      makeFlight({
        origin_city: "San Francisco",
        price: 280,
        airport_used: "OAK",
      }),
    ];
    const airbnb = makeAirbnb({ price_per_person_per_night: 50 });
    const city = makeCity({ people: 1 });

    const result = calculateWeekendScore(
      weekend,
      flights,
      [],
      [airbnb],
      "nonstop_carryon",
      "budget",
      [city]
    );

    expect(result.perCityCosts[0].flightCost).toBe(280);
  });

  it("should only match flights of the selected category", () => {
    const flights = [
      makeFlight({ category: "nonstop_carryon", price: 400 }),
      makeFlight({ category: "onestop_no_carryon", price: 150 }),
    ];
    const airbnb = makeAirbnb({ price_per_person_per_night: 50 });
    const city = makeCity({ people: 1 });

    const result = calculateWeekendScore(
      weekend,
      flights,
      [],
      [airbnb],
      "nonstop_carryon",
      "budget",
      [city]
    );

    // Should pick the nonstop_carryon at $400, not the $150 onestop
    expect(result.perCityCosts[0].flightCost).toBe(400);
  });

  it("should produce one cost breakdown entry per city", () => {
    const cities = [
      makeCity({ city: "San Francisco", people: 8 }),
      makeCity({ city: "Houston", people: 1 }),
      makeCity({ city: "Chicago", people: 1 }),
    ];
    const airbnb = makeAirbnb({ price_per_person_per_night: 50 });

    const result = calculateWeekendScore(
      weekend,
      [],
      [],
      [airbnb],
      "nonstop_carryon",
      "budget",
      cities
    );

    expect(result.perCityCosts).toHaveLength(3);
    expect(result.perCityCosts.map((c) => c.city)).toEqual([
      "San Francisco",
      "Houston",
      "Chicago",
    ]);
  });
});

// ---------------------------------------------------------------------------
// scoreAllWeekends tests
// ---------------------------------------------------------------------------

describe("scoreAllWeekends", () => {
  const cities = [makeCity({ city: "San Francisco", people: 1 })];

  it("should sort weekends by totalGroupCost ascending (cheapest first)", () => {
    const weekends = [
      makeWeekend({ id: "w1", departDate: "2026-07-02", returnDate: "2026-07-05" }),
      makeWeekend({ id: "w2", departDate: "2026-07-09", returnDate: "2026-07-12" }),
    ];
    const flights = [
      makeFlight({ date_range_id: "w1", price: 500 }),
      makeFlight({ date_range_id: "w2", price: 200 }),
    ];
    const airbnbs = [
      makeAirbnb({ date_range_id: "w1", price_per_person_per_night: 50 }),
      makeAirbnb({ date_range_id: "w2", price_per_person_per_night: 50 }),
    ];

    const result = scoreAllWeekends(
      weekends,
      flights,
      [],
      airbnbs,
      "nonstop_carryon",
      "budget",
      cities
    );

    expect(result[0].dateRange.id).toBe("w2"); // $200 flight = cheaper
    expect(result[1].dateRange.id).toBe("w1"); // $500 flight = more expensive
    expect(result[0].totalGroupCost).toBeLessThan(result[1].totalGroupCost);
  });

  it("should assign score 100 to cheapest weekend and lower scores to more expensive ones", () => {
    const weekends = [
      makeWeekend({ id: "w1" }),
      makeWeekend({ id: "w2" }),
      makeWeekend({ id: "w3" }),
    ];
    const flights = [
      makeFlight({ date_range_id: "w1", price: 300 }),
      makeFlight({ date_range_id: "w2", price: 200 }),
      makeFlight({ date_range_id: "w3", price: 500 }),
    ];
    const airbnbs = [
      makeAirbnb({ date_range_id: "w1", price_per_person_per_night: 50 }),
      makeAirbnb({ date_range_id: "w2", price_per_person_per_night: 50 }),
      makeAirbnb({ date_range_id: "w3", price_per_person_per_night: 50 }),
    ];

    const result = scoreAllWeekends(
      weekends,
      flights,
      [],
      airbnbs,
      "nonstop_carryon",
      "budget",
      cities
    );

    // Cheapest gets 100
    expect(result[0].score).toBe(100);
    // Most expensive gets 1
    expect(result[result.length - 1].score).toBe(1);
    // Scores are in descending order (since sorted by cost asc)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].score).toBeGreaterThanOrEqual(result[i + 1].score);
    }
  });

  it("should assign score 100 to all weekends when costs are identical", () => {
    const weekends = [makeWeekend({ id: "w1" }), makeWeekend({ id: "w2" })];
    const flights = [
      makeFlight({ date_range_id: "w1", price: 300 }),
      makeFlight({ date_range_id: "w2", price: 300 }),
    ];
    const airbnbs = [
      makeAirbnb({ date_range_id: "w1", price_per_person_per_night: 50 }),
      makeAirbnb({ date_range_id: "w2", price_per_person_per_night: 50 }),
    ];

    const result = scoreAllWeekends(
      weekends,
      flights,
      [],
      airbnbs,
      "nonstop_carryon",
      "budget",
      cities
    );

    expect(result[0].score).toBe(100);
    expect(result[1].score).toBe(100);
  });

  it("should assign score 0 to weekends with Infinity cost (no airbnb data)", () => {
    const weekends = [makeWeekend({ id: "w1" }), makeWeekend({ id: "w2" })];
    const flights = [
      makeFlight({ date_range_id: "w1", price: 300 }),
      makeFlight({ date_range_id: "w2", price: 300 }),
    ];
    // Only w1 has airbnb data
    const airbnbs = [
      makeAirbnb({ date_range_id: "w1", price_per_person_per_night: 50 }),
    ];

    const result = scoreAllWeekends(
      weekends,
      flights,
      [],
      airbnbs,
      "nonstop_carryon",
      "budget",
      cities
    );

    const w2 = result.find((r) => r.dateRange.id === "w2");
    expect(w2!.score).toBe(0);
    expect(w2!.totalGroupCost).toBe(Infinity);
  });

  it("should correctly filter flight options by date range", () => {
    const weekends = [makeWeekend({ id: "w1" }), makeWeekend({ id: "w2" })];
    const flightOptions: FlightOptionRow[] = [
      {
        date_range_id: "w1",
        origin_city: "San Francisco",
        category: "nonstop_carryon",
        airport_used: "SFO",
        price: 300,
        airline: "United",
        outbound_details: null,
        return_details: null,
        google_flights_url: null,
        is_best: true,
        scraped_at: new Date().toISOString(),
      },
      {
        date_range_id: "w2",
        origin_city: "San Francisco",
        category: "nonstop_carryon",
        airport_used: "OAK",
        price: 250,
        airline: "Southwest",
        outbound_details: null,
        return_details: null,
        google_flights_url: null,
        is_best: true,
        scraped_at: new Date().toISOString(),
      },
    ];
    const flights = [
      makeFlight({ date_range_id: "w1", price: 300 }),
      makeFlight({ date_range_id: "w2", price: 250 }),
    ];
    const airbnbs = [
      makeAirbnb({ date_range_id: "w1", price_per_person_per_night: 50 }),
      makeAirbnb({ date_range_id: "w2", price_per_person_per_night: 50 }),
    ];

    const result = scoreAllWeekends(
      weekends,
      flights,
      flightOptions,
      airbnbs,
      "nonstop_carryon",
      "budget",
      cities
    );

    // w1 should only have w1 flight options
    const w1 = result.find((r) => r.dateRange.id === "w1");
    expect(w1!.allFlightOptions).toHaveLength(1);
    expect(w1!.allFlightOptions[0].airport_used).toBe("SFO");

    const w2 = result.find((r) => r.dateRange.id === "w2");
    expect(w2!.allFlightOptions).toHaveLength(1);
    expect(w2!.allFlightOptions[0].airport_used).toBe("OAK");
  });

  it("should return scores between 0 and 100", () => {
    const weekends = Array.from({ length: 10 }, (_, i) =>
      makeWeekend({ id: `w${i}` })
    );
    const flights = weekends.map((w, i) =>
      makeFlight({ date_range_id: w.id, price: 200 + i * 50 })
    );
    const airbnbs = weekends.map((w) =>
      makeAirbnb({ date_range_id: w.id, price_per_person_per_night: 50 })
    );

    const result = scoreAllWeekends(
      weekends,
      flights,
      [],
      airbnbs,
      "nonstop_carryon",
      "budget",
      cities
    );

    for (const r of result) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
});
