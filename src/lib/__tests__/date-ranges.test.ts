import {
  generateDateRanges,
  formatDateDisplay,
  formatDateRangeDisplay,
} from "../date-ranges";

describe("generateDateRanges", () => {
  const selectedMonths = [
    { month: 6, year: 2026 },
    { month: 7, year: 2026 },
    { month: 8, year: 2026 },
  ];
  const ranges = generateDateRanges(undefined, selectedMonths);

  it("should generate a non-empty array of date ranges", () => {
    expect(ranges.length).toBeGreaterThan(0);
  });

  it("should return empty array when no months selected", () => {
    expect(generateDateRanges()).toEqual([]);
    expect(generateDateRanges(undefined, [])).toEqual([]);
  });

  it("should have exactly 3 nights (3 days) between depart and return", () => {
    for (const range of ranges) {
      const depart = new Date(range.departDate + "T00:00:00");
      const ret = new Date(range.returnDate + "T00:00:00");
      const diffDays =
        (ret.getTime() - depart.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(3);
    }
  });

  it("should only include dates between June 1 and August 31, 2026", () => {
    const seasonStart = new Date("2026-06-01T00:00:00");
    const seasonEnd = new Date("2026-08-31T00:00:00");

    for (const range of ranges) {
      const depart = new Date(range.departDate + "T00:00:00");
      const ret = new Date(range.returnDate + "T00:00:00");
      expect(depart.getTime()).toBeGreaterThanOrEqual(seasonStart.getTime());
      expect(ret.getTime()).toBeLessThanOrEqual(seasonEnd.getTime());
    }
  });

  it("should only depart on Thursday or Friday (default departDays)", () => {
    for (const range of ranges) {
      const depart = new Date(range.departDate + "T00:00:00");
      expect([4, 5]).toContain(depart.getDay());
    }
  });

  it("should have unique IDs for each range", () => {
    const ids = ranges.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have IDs in the format YYYY-MM-DD_YYYY-MM-DD", () => {
    const idPattern = /^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/;
    for (const range of ranges) {
      expect(range.id).toMatch(idPattern);
    }
  });

  it("should have IDs matching departDate_returnDate", () => {
    for (const range of ranges) {
      expect(range.id).toBe(`${range.departDate}_${range.returnDate}`);
    }
  });

  it("should respect custom trip duration", () => {
    const customRanges = generateDateRanges(
      { nights: 4, departDays: [5] },
      [{ month: 7, year: 2026 }]
    );
    for (const range of customRanges) {
      const depart = new Date(range.departDate + "T00:00:00");
      const ret = new Date(range.returnDate + "T00:00:00");
      const diffDays = (ret.getTime() - depart.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(4);
      expect(depart.getDay()).toBe(5); // Friday
    }
  });
});

describe("formatDateDisplay", () => {
  it("should format a date as 'Mon D'", () => {
    expect(formatDateDisplay("2026-06-04")).toBe("Jun 4");
    expect(formatDateDisplay("2026-07-15")).toBe("Jul 15");
    expect(formatDateDisplay("2026-08-31")).toBe("Aug 31");
  });
});

describe("formatDateRangeDisplay", () => {
  it("should format same-month range", () => {
    expect(formatDateRangeDisplay("2026-06-04", "2026-06-07")).toBe(
      "June 4 - June 7"
    );
  });

  it("should format cross-month range with both months", () => {
    expect(formatDateRangeDisplay("2026-07-30", "2026-08-02")).toBe(
      "July 30 - August 2"
    );
  });
});
