"use client";

import { useState } from "react";
import { CostBreakdown } from "@/lib/types";
import { FLIGHT_CATEGORIES } from "@/lib/constants";
import { FlightDetails } from "./FlightDetails";

import { FlightCategory } from "@/lib/types";

interface FlightSummaryProps {
  perCityCosts: CostBreakdown[];
  flightCategoryLabel: string;
  selectedCategory: FlightCategory;
}

function getCategoryLabel(value: string): string {
  return FLIGHT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

const CATEGORY_HIERARCHY: FlightCategory[] = [
  "nonstop_carryon",
  "nonstop_no_carryon",
  "onestop_carryon",
  "onestop_no_carryon",
];

function CityFlightRow({ cost, selectedCategory }: { cost: CostBreakdown; selectedCategory: FlightCategory }) {
  const [showAlternates, setShowAlternates] = useState(false);
  const { alternateFlights } = cost;
  const hasAlternates = alternateFlights.length > 1;

  const primaryOption = alternateFlights[0] ?? cost.flight ?? null;

  return (
    <div className="rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors group">
      <div className="flex items-start gap-3 py-2.5 px-3">
        {/* Left: city label */}
        <div className="shrink-0 w-20 sm:w-28 pt-0.5">
          <div className="text-sm font-medium text-zinc-300 truncate">{cost.city}</div>
          {cost.people > 1 && (
            <div className="text-[11px] text-zinc-500">{cost.people} ppl</div>
          )}
        </div>

        {/* Center: flight details */}
        <div className="flex-1 min-w-0">
          {primaryOption ? (
            <FlightDetails flight={primaryOption} />
          ) : (
            <span className="text-xs text-zinc-600">—</span>
          )}
        </div>

        {/* Right: price + fallback tag + chevron */}
        <div className="shrink-0 flex items-center gap-2">
          {cost.fallbackCategory && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 whitespace-nowrap">
              {getCategoryLabel(cost.fallbackCategory)}
            </span>
          )}

          <div className="text-right min-w-[3.5rem] sm:min-w-[4.5rem]">
            {cost.flightCost !== null ? (
              cost.flight?.google_flights_url ? (
                <a
                  href={cost.flight.google_flights_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono font-semibold text-zinc-200 hover:text-sky-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  ${cost.flightCost} <span className="text-xs font-normal text-zinc-500">round trip</span>
                </a>
              ) : (
                <span className="text-sm font-mono font-semibold text-zinc-200">
                  ${cost.flightCost} <span className="text-xs font-normal text-zinc-500">round trip</span>
                </span>
              )
            ) : (
              <span className="text-xs text-zinc-600">—</span>
            )}
          </div>

          <div className="w-4">
            {hasAlternates && (
              <button
                onClick={() => setShowAlternates(!showAlternates)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${showAlternates ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fallback explanation */}
      {cost.fallbackCategory && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-md bg-amber-500/5 border border-amber-500/15">
          <p className="text-xs text-amber-400/90 leading-relaxed">
            No <span className="font-semibold">{getCategoryLabel(selectedCategory)}</span> flights found for {cost.city}.
            Showing the cheapest <span className="font-semibold">{getCategoryLabel(cost.fallbackCategory)}</span> flight instead.
          </p>
          <p className="text-[11px] text-amber-400/60 mt-1.5 leading-relaxed">
            Fallback order:{" "}
            {CATEGORY_HIERARCHY.map((cat, i) => {
              const label = getCategoryLabel(cat);
              const isSelected = cat === selectedCategory;
              const isFallback = cat === cost.fallbackCategory;
              return (
                <span key={cat}>
                  {i > 0 && <span className="mx-1">&rarr;</span>}
                  <span className={
                    isFallback
                      ? "text-amber-400 font-semibold"
                      : isSelected
                        ? "text-amber-400/80 line-through"
                        : "text-amber-400/40"
                  }>
                    {label}
                  </span>
                </span>
              );
            })}
          </p>
        </div>
      )}

      {/* Alternate flights (toggled) */}
      {showAlternates && alternateFlights.length > 1 && (
        <div className="border-t border-zinc-700/30 mx-3 pt-2 pb-2 space-y-2">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
            Other options
          </div>
          {alternateFlights.slice(1).map((alt, i) => (
            <div
              key={i}
              className="flex items-start gap-3 py-1.5 px-2 rounded bg-zinc-800/40"
            >
              <div className="hidden sm:block sm:w-28 shrink-0" />
              <div className="min-w-0 flex-1">
                <FlightDetails flight={alt} />
              </div>
              <div className="shrink-0 min-w-[3.5rem] sm:min-w-[4.5rem] text-right">
                {alt.google_flights_url ? (
                  <a
                    href={alt.google_flights_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-zinc-300 hover:text-sky-400 transition-colors"
                  >
                    ${alt.price} <span className="text-xs text-zinc-500">round trip</span>
                  </a>
                ) : (
                  <span className="text-sm font-mono text-zinc-300">
                    ${alt.price} <span className="text-xs text-zinc-500">round trip</span>
                  </span>
                )}
              </div>
              <div className="w-4" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FlightSummary({
  perCityCosts,
  flightCategoryLabel,
  selectedCategory,
}: FlightSummaryProps) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>Flights</span>
        <span className="text-zinc-600">({flightCategoryLabel})</span>
      </h4>
      <div className="space-y-1">
        {perCityCosts.map((cost) => (
          <CityFlightRow key={cost.city} cost={cost} selectedCategory={selectedCategory} />
        ))}
      </div>
    </div>
  );
}
