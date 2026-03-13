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
    <div className="group">
      <div className="flex items-start gap-3 py-2 px-3 rounded-md hover:bg-[var(--surface-1)] transition-colors duration-150">
        {/* City */}
        <div className="shrink-0 w-24 sm:w-32">
          <div className="text-sm font-medium text-[var(--text-1)]">{cost.city}</div>
          {cost.people > 1 && (
            <div className="text-[11px] text-[var(--text-3)]">{cost.people} travelers</div>
          )}
        </div>

        {/* Flight info */}
        <div className="flex-1 min-w-0">
          {primaryOption ? (
            <FlightDetails flight={primaryOption} />
          ) : (
            <span className="text-[11px] text-[var(--text-3)]">No flights found</span>
          )}
        </div>

        {/* Price + badges */}
        <div className="shrink-0 flex items-center gap-2">
          {cost.fallbackCategory && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--orange-soft)] text-[var(--orange)] border border-[var(--orange-border)] whitespace-nowrap font-medium">
              {getCategoryLabel(cost.fallbackCategory)}
            </span>
          )}

          <div className="text-right min-w-[4rem]">
            {cost.flightCost !== null ? (
              cost.flight?.google_flights_url ? (
                <a
                  href={cost.flight.google_flights_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono font-semibold tabular-nums text-[var(--gold)] hover:text-[var(--blue)] transition-colors duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  ${cost.flightCost}
                </a>
              ) : (
                <span className="text-sm font-mono font-semibold tabular-nums text-[var(--gold)]">
                  ${cost.flightCost}
                </span>
              )
            ) : (
              <span className="text-xs text-[var(--text-3)]">-</span>
            )}
          </div>

          <div className="w-4">
            {hasAlternates && (
              <button
                onClick={() => setShowAlternates(!showAlternates)}
                className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${showAlternates ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fallback explanation */}
      {cost.fallbackCategory && (
        <div className="mx-3 mb-1 px-3 py-2 rounded-md bg-[var(--orange-soft)] border border-[var(--orange-border)]">
          <p className="text-[11px] text-[var(--orange)] leading-relaxed">
            No <span className="font-semibold">{getCategoryLabel(selectedCategory)}</span> found.
            Showing <span className="font-semibold">{getCategoryLabel(cost.fallbackCategory)}</span> instead.
          </p>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-[var(--text-3)]">
            {CATEGORY_HIERARCHY.map((cat, i) => {
              const label = getCategoryLabel(cat);
              const isSelected = cat === selectedCategory;
              const isFallback = cat === cost.fallbackCategory;
              return (
                <span key={cat} className="flex items-center gap-1">
                  {i > 0 && <span>&rarr;</span>}
                  <span className={
                    isFallback ? "text-[var(--orange)] font-semibold"
                      : isSelected ? "line-through"
                        : ""
                  }>{label}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Alternate flights */}
      {showAlternates && alternateFlights.length > 1 && (
        <div className="ml-3 mr-3 mb-1 pl-3 border-l-2 border-[var(--border-default)] space-y-1.5">
          <div className="text-[10px] text-[var(--text-3)] uppercase tracking-wider font-medium pt-1">
            Other options
          </div>
          {alternateFlights.slice(1).map((alt, i) => (
            <div key={i} className="flex items-start gap-3 py-1">
              <div className="flex-1 min-w-0">
                <FlightDetails flight={alt} />
              </div>
              <div className="shrink-0 min-w-[4rem] text-right">
                {alt.google_flights_url ? (
                  <a
                    href={alt.google_flights_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono tabular-nums text-[var(--text-1)] hover:text-[var(--blue)] transition-colors duration-150"
                  >
                    ${alt.price}
                  </a>
                ) : (
                  <span className="text-sm font-mono tabular-nums text-[var(--text-1)]">${alt.price}</span>
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
    <section>
      <div className="flex items-center gap-2 mb-2">
        <h4 className="font-heading text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">
          Flights
        </h4>
        <span className="text-[11px] text-[var(--text-3)] font-mono">{flightCategoryLabel}</span>
      </div>
      <div className="divide-y divide-[var(--border-default)]">
        {perCityCosts.map((cost) => (
          <CityFlightRow key={cost.city} cost={cost} selectedCategory={selectedCategory} />
        ))}
      </div>
    </section>
  );
}
