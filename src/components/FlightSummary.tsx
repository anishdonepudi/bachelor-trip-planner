"use client";

import { CostBreakdown } from "@/lib/types";

interface FlightSummaryProps {
  perCityCosts: CostBreakdown[];
  flightCategoryLabel: string;
}

export function FlightSummary({
  perCityCosts,
  flightCategoryLabel,
}: FlightSummaryProps) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>Flights</span>
        <span className="text-zinc-600">({flightCategoryLabel})</span>
      </h4>
      <div className="space-y-1">
        {perCityCosts.map((cost) => (
          <div
            key={cost.city}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-zinc-300 truncate">
                {cost.city}
              </span>
              {cost.people > 1 && (
                <span className="text-xs text-zinc-500 shrink-0">
                  ({cost.people} ppl)
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {cost.flightCost !== null ? (
                <>
                  <span className="text-sm font-mono font-semibold text-zinc-200">
                    ${cost.flightCost}
                  </span>
                  <span className="text-xs text-zinc-500">RT</span>
                  {cost.flight?.google_flights_url && (
                    <a
                      href={cost.flight.google_flights_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-500 hover:text-sky-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Book
                    </a>
                  )}
                </>
              ) : (
                <span className="text-xs text-zinc-600 italic">
                  No data
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
