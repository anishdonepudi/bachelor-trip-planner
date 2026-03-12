import {
  generateDateRanges,
  formatDateDisplay,
  formatDateRangeDisplay,
} from "../date-ranges";

describe("generateDateRanges", () => {
  const ranges = generateDateRanges();

  it("should generate a non-empty array of date ranges", () => {
    expect(ranges.length).toBeGreaterThan(0);
  });

  it("should generate between 22 and 26 valid weekends", () => {
    // Plan specifies ~22-26 weekend date ranges
    expect(ranges.length).toBeGreaterThanOrEqual(22);
    expect(ranges.length).toBeLessThanOrEqual(26);
  });

  it("should only contain Thu-Sun or Fri-Mon formats", () => {
    for (const range of ranges) {
      expect(["Thu-Sun", "Fri-Mon"]).toContain(range.format);
    }
  });

  it("should have Thu-Sun ranges starting on Thursday", () => {
    const thuSun = ranges.filter((r) => r.format === "Thu-Sun");
    for (const range of thuSun) {
      const depart = new Date(range.departDate + "T00:00:00");
      expect(depart.getDay()).toBe(4); // Thursday
    }
  });

  it("should have Fri-Mon ranges starting on Friday", () => {
    const friMon = ranges.filter((r) => r.format === "Fri-Mon");
    for (const range of friMon) {
      const depart = new Date(range.departDate + "T00:00:00");
      expect(depart.getDay()).toBe(5); // Friday
    }
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

  it("should exclude the 2nd weekend of June (Jun 11-14 / Jun 12-15)", () => {
    const excludedDepartDates = ["2026-06-11", "2026-06-12"];
    for (const range of ranges) {
      expect(excludedDepartDates).not.toContain(range.departDate);
    }
  });

  it("should exclude the 3rd weekend of June (Jun 18-21 / Jun 19-22)", () => {
    const excludedDepartDates = ["2026-06-18", "2026-06-19"];
    for (const range of ranges) {
      expect(excludedDepartDates).not.toContain(range.departDate);
    }
  });

  it("should include the 1st weekend of June (Jun 4-7 Thu-Sun)", () => {
    const firstWeekend = ranges.find((r) => r.departDate === "2026-06-04");
    expect(firstWeekend).toBeDefined();
    expect(firstWeekend!.returnDate).toBe("2026-06-07");
    expect(firstWeekend!.format).toBe("Thu-Sun");
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

  it("should have Thu-Sun return on Sunday (day 0)", () => {
    const thuSun = ranges.filter((r) => r.format === "Thu-Sun");
    for (const range of thuSun) {
      const ret = new Date(range.returnDate + "T00:00:00");
      expect(ret.getDay()).toBe(0); // Sunday
    }
  });

  it("should have Fri-Mon return on Monday (day 1)", () => {
    const friMon = ranges.filter((r) => r.format === "Fri-Mon");
    for (const range of friMon) {
      const ret = new Date(range.returnDate + "T00:00:00");
      expect(ret.getDay()).toBe(1); // Monday
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
  it("should format same-month range as 'Mon D-D'", () => {
    expect(formatDateRangeDisplay("2026-06-04", "2026-06-07")).toBe("Jun 4-7");
    expect(formatDateRangeDisplay("2026-07-09", "2026-07-12")).toBe("Jul 9-12");
  });

  it("should format cross-month range with both months", () => {
    expect(formatDateRangeDisplay("2026-07-30", "2026-08-02")).toBe(
      "Jul 30 - Aug 2"
    );
  });
});
