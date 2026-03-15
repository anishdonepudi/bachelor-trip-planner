import { FlightTimeFilters } from "./types";
import { DEFAULT_TIME_FILTERS } from "./constants";

/**
 * Migrate old 4-field time filters to new 2-field destination-centric format.
 * Runs on read — no DB migration needed.
 */
export function migrateTimeFilters(raw: any): FlightTimeFilters {
  if (!raw || typeof raw !== "object") return DEFAULT_TIME_FILTERS;

  // Already new format
  if ("destinationArrival" in raw && "destinationDeparture" in raw) {
    return {
      destinationArrival: raw.destinationArrival,
      destinationDeparture: raw.destinationDeparture,
      maxDuration: raw.maxDuration ?? DEFAULT_TIME_FILTERS.maxDuration,
    };
  }

  // Old format: convert center±hours to from/to range
  if ("outboundArrival" in raw || "returnDeparture" in raw) {
    const convert = (old: any): { from: string; to: string } => {
      if (!old || typeof old !== "object" || !old.time) {
        return { from: "00:00", to: "23:30" };
      }
      const parts = old.time.split(":");
      const centerMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      const tolerance = (old.plusMinus ?? 12) * 60;
      const fromMin = Math.max(0, centerMin - tolerance);
      const toMin = Math.min(23 * 60 + 30, centerMin + tolerance);
      const fmt = (m: number) => {
        const h = Math.floor(m / 60);
        const min = m % 60;
        // Snap to nearest 30-minute increment
        const snapped = min >= 15 ? 30 : 0;
        return `${String(h).padStart(2, "0")}:${String(snapped).padStart(2, "0")}`;
      };
      return { from: fmt(fromMin), to: fmt(toMin) };
    };

    return {
      destinationArrival: convert(raw.outboundArrival),
      destinationDeparture: convert(raw.returnDeparture),
      maxDuration: raw.maxDuration ?? DEFAULT_TIME_FILTERS.maxDuration,
    };
  }

  return DEFAULT_TIME_FILTERS;
}
