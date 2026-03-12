import { CITY_AIRPORTS, DESTINATION_AIRPORT, getAllAirports } from "../airports";

describe("CITY_AIRPORTS", () => {
  it("should have entries for all 10 cities from the plan", () => {
    const expectedCities = [
      "San Francisco",
      "New York City",
      "Philadelphia",
      "Houston",
      "New Orleans",
      "Washington DC",
      "Chicago",
      "Los Angeles",
      "Phoenix",
      "Irvine",
    ];

    for (const city of expectedCities) {
      expect(CITY_AIRPORTS[city]).toBeDefined();
    }
    expect(Object.keys(CITY_AIRPORTS)).toHaveLength(10);
  });

  it("should have correct primary airports for each city", () => {
    expect(CITY_AIRPORTS["San Francisco"].primary).toEqual(["SFO"]);
    expect(CITY_AIRPORTS["New York City"].primary).toEqual(["JFK"]);
    expect(CITY_AIRPORTS["Philadelphia"].primary).toEqual(["PHL"]);
    expect(CITY_AIRPORTS["Houston"].primary).toEqual(["IAH"]);
    expect(CITY_AIRPORTS["New Orleans"].primary).toEqual(["MSY"]);
    expect(CITY_AIRPORTS["Washington DC"].primary).toEqual(["DCA"]);
    expect(CITY_AIRPORTS["Chicago"].primary).toEqual(["ORD"]);
    expect(CITY_AIRPORTS["Los Angeles"].primary).toEqual(["LAX"]);
    expect(CITY_AIRPORTS["Phoenix"].primary).toEqual(["PHX"]);
    expect(CITY_AIRPORTS["Irvine"].primary).toEqual(["SNA"]);
  });

  it("should have correct nearby airports for each city", () => {
    expect(CITY_AIRPORTS["San Francisco"].nearby).toEqual(["OAK", "SJC"]);
    expect(CITY_AIRPORTS["New York City"].nearby).toEqual(["EWR", "LGA"]);
    expect(CITY_AIRPORTS["Philadelphia"].nearby).toEqual([]);
    expect(CITY_AIRPORTS["Houston"].nearby).toEqual(["HOU"]);
    expect(CITY_AIRPORTS["New Orleans"].nearby).toEqual([]);
    expect(CITY_AIRPORTS["Washington DC"].nearby).toEqual(["IAD", "BWI"]);
    expect(CITY_AIRPORTS["Chicago"].nearby).toEqual(["MDW"]);
    expect(CITY_AIRPORTS["Los Angeles"].nearby).toEqual(["BUR", "LGB", "SNA"]);
    expect(CITY_AIRPORTS["Phoenix"].nearby).toEqual(["AZA"]);
    expect(CITY_AIRPORTS["Irvine"].nearby).toEqual(["LAX", "LGB", "ONT"]);
  });

  it("should have LA and Irvine sharing airports (LAX, SNA, LGB)", () => {
    const laAll = [
      ...CITY_AIRPORTS["Los Angeles"].primary,
      ...CITY_AIRPORTS["Los Angeles"].nearby,
    ];
    const irvineAll = [
      ...CITY_AIRPORTS["Irvine"].primary,
      ...CITY_AIRPORTS["Irvine"].nearby,
    ];

    const shared = laAll.filter((a) => irvineAll.includes(a));
    expect(shared).toContain("LAX");
    expect(shared).toContain("SNA");
    expect(shared).toContain("LGB");
  });

  it("should have all airport codes as 3-letter uppercase strings", () => {
    for (const city of Object.values(CITY_AIRPORTS)) {
      for (const code of [...city.primary, ...city.nearby]) {
        expect(code).toMatch(/^[A-Z]{3}$/);
      }
    }
  });
});

describe("DESTINATION_AIRPORT", () => {
  it("should be CUN (Cancun)", () => {
    expect(DESTINATION_AIRPORT).toBe("CUN");
  });
});

describe("getAllAirports", () => {
  it("should return primary + nearby airports combined", () => {
    const sfAirports = getAllAirports("San Francisco");
    expect(sfAirports).toEqual(["SFO", "OAK", "SJC"]);
  });

  it("should return only primary for cities with no nearby airports", () => {
    expect(getAllAirports("Philadelphia")).toEqual(["PHL"]);
    expect(getAllAirports("New Orleans")).toEqual(["MSY"]);
  });

  it("should return empty array for unknown cities", () => {
    expect(getAllAirports("Atlantis")).toEqual([]);
  });
});
