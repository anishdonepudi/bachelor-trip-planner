import { DateRange, MonthRange, SelectedMonth, TripDuration } from "./types";
import { DEFAULT_TRIP_DURATION } from "./constants";

/**
 * Generate date ranges for a single month range (start→end).
 */
function generateForRange(startDate: Date, endDate: Date, nights: number, departDays: number[]): DateRange[] {
  const ranges: DateRange[] = [];
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

/**
 * Generate all valid trip date ranges.
 * If selectedMonths is provided, generates ranges for each selected month individually.
 * Otherwise falls back to monthRange (start→end contiguous range).
 */
export function generateDateRanges(monthRange?: MonthRange, tripDuration?: TripDuration, selectedMonths?: SelectedMonth[]): DateRange[] {
  const { nights, departDays } = tripDuration ?? DEFAULT_TRIP_DURATION;

  // Use selected months if available — only generate for those specific months
  if (selectedMonths && selectedMonths.length > 0) {
    const seen = new Set<string>();
    const allRanges: DateRange[] = [];
    for (const sm of selectedMonths) {
      const start = new Date(sm.year, sm.month - 1, 1);
      const end = new Date(sm.year, sm.month, 0); // last day of month
      for (const r of generateForRange(start, end, nights, departDays)) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          allRanges.push(r);
        }
      }
    }
    return allRanges.sort((a, b) => a.departDate.localeCompare(b.departDate));
  }

  // Fallback: contiguous month range
  const startDate = monthRange
    ? new Date(monthRange.startYear, monthRange.startMonth - 1, 1)
    : new Date(2026, 5, 1);
  const endDate = monthRange
    ? new Date(monthRange.endYear, monthRange.endMonth, 0)
    : new Date(2026, 7, 31);

  return generateForRange(startDate, endDate, nights, departDays);
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
