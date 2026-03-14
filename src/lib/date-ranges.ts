import { DateRange, MonthRange, TripDuration } from "./types";
import { DEFAULT_TRIP_DURATION } from "./constants";

/**
 * Generate all valid trip date ranges.
 * Uses configured departure days and trip duration (nights).
 * Defaults to Thu→Sun and Fri→Mon, 3 nights.
 */
export function generateDateRanges(monthRange?: MonthRange, tripDuration?: TripDuration): DateRange[] {
  const ranges: DateRange[] = [];
  const { nights, departDays } = tripDuration ?? DEFAULT_TRIP_DURATION;

  const startDate = monthRange
    ? new Date(monthRange.startYear, monthRange.startMonth - 1, 1)
    : new Date(2026, 5, 1); // June 1, 2026
  const endDate = monthRange
    ? new Date(monthRange.endYear, monthRange.endMonth, 0) // last day of endMonth
    : new Date(2026, 7, 31); // August 31, 2026

  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();

    if (departDays.includes(dayOfWeek)) {
      const depart = new Date(current);
      const returnDate = new Date(current);
      returnDate.setDate(returnDate.getDate() + nights);

      if (returnDate <= endDate) {
        const departStr = formatDate(depart);
        const returnStr = formatDate(returnDate);
        ranges.push({
          id: `${departStr}_${returnStr}`,
          departDate: departStr,
          returnDate: returnStr,
          format: formatDateRangeDisplay(departStr, returnStr),
        });
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
