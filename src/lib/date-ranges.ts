import { DateRange } from "./types";

/**
 * Generate all valid weekend date ranges for the bachelor trip.
 * Season: June 1 – August 31, 2026
 * Formats: Thursday→Sunday (3 nights) OR Friday→Monday (3 nights)
 * Excluded: 2nd weekend of June (Jun 11-14 / Jun 12-15)
 *           3rd weekend of June (Jun 18-21 / Jun 19-22)
 */
export function generateDateRanges(): DateRange[] {
  const ranges: DateRange[] = [];
  const startDate = new Date(2026, 5, 1); // June 1, 2026
  const endDate = new Date(2026, 7, 31); // August 31, 2026

  // Excluded date ranges (depart dates to exclude)
  const excludedDepartDates = new Set([
    "2026-06-11", // Thu of 2nd weekend
    "2026-06-12", // Fri of 2nd weekend
    "2026-06-18", // Thu of 3rd weekend
    "2026-06-19", // Fri of 3rd weekend
  ]);

  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();

    // Thursday (4) → Sunday
    if (dayOfWeek === 4) {
      const depart = new Date(current);
      const returnDate = new Date(current);
      returnDate.setDate(returnDate.getDate() + 3); // Sunday

      if (returnDate <= endDate) {
        const departStr = formatDate(depart);
        if (!excludedDepartDates.has(departStr)) {
          ranges.push({
            id: `${departStr}_${formatDate(returnDate)}`,
            departDate: departStr,
            returnDate: formatDate(returnDate),
            format: formatDateRangeDisplay(departStr, formatDate(returnDate)),
          });
        }
      }
    }

    // Friday (5) → Monday
    if (dayOfWeek === 5) {
      const depart = new Date(current);
      const returnDate = new Date(current);
      returnDate.setDate(returnDate.getDate() + 3); // Monday

      if (returnDate <= endDate) {
        const departStr = formatDate(depart);
        if (!excludedDepartDates.has(departStr)) {
          ranges.push({
            id: `${departStr}_${formatDate(returnDate)}`,
            departDate: departStr,
            returnDate: formatDate(returnDate),
            format: formatDateRangeDisplay(departStr, formatDate(returnDate)),
          });
        }
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return ranges;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format a date string for display (e.g., "Jun 4")
 */
export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Format a date range for display (e.g., "Jun 4-7")
 */
export function formatDateRangeDisplay(
  departDate: string,
  returnDate: string
): string {
  const depart = new Date(departDate + "T00:00:00");
  const ret = new Date(returnDate + "T00:00:00");

  const departMonth = depart.toLocaleDateString("en-US", { month: "long" });
  const returnMonth = ret.toLocaleDateString("en-US", { month: "long" });

  return `${departMonth} ${depart.getDate()} - ${returnMonth} ${ret.getDate()}`;
}
