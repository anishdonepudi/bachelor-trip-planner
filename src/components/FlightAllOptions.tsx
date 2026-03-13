"use client";

import { useState } from "react";
import { FlightOptionRow, FlightCategory, CostBreakdown } from "@/lib/types";
import { FLIGHT_CATEGORIES } from "@/lib/constants";
import { FlightDetails } from "./FlightDetails";

interface FlightAllOptionsProps {
  flightOptions: FlightOptionRow[];
  cities: string[];
  perCityCosts: CostBreakdown[];
  selectedCategory: FlightCategory;
}

function FlightCell({
  options,
  isSelected,
}: {
  options: FlightOptionRow[];
  isSelected: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = options
    .filter((f) => f.price != null)
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

  const cheapest = sorted[0] ?? null;
  const alternates = sorted.slice(1, 3);
  const hasAlternates = alternates.length > 0;

  if (!cheapest) {
    return <td className="text-right py-2 px-2 align-top"><span className="text-zinc-600">—</span></td>;
  }

  return (
    <td className={`py-2 px-2 align-top ${isSelected ? "bg-emerald-500/5" : ""}`}>
      <div className="flex flex-col items-end gap-0.5">
        {/* Price row */}
        <div className="flex items-center gap-1.5">
          {isSelected && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              Selected
            </span>
          )}
          <a
            href={cheapest.google_flights_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-200 hover:text-sky-400 font-mono font-semibold text-sm transition-colors"
          >
            ${cheapest.price}
          </a>
          {hasAlternates && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Cheapest flight details */}
        <div className="text-right">
          <FlightDetails flight={cheapest} />
        </div>

        {/* Alternates (toggled) */}
        {expanded && alternates.map((alt, i) => (
          <div key={i} className="mt-1.5 pt-1.5 border-t border-zinc-700/30 text-right w-full">
            <a
              href={alt.google_flights_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 hover:text-sky-400 font-mono text-sm transition-colors"
            >
              ${alt.price}
            </a>
            <FlightDetails flight={alt} />
          </div>
        ))}
      </div>
    </td>
  );
}

export function FlightAllOptions({
  flightOptions,
  cities,
  perCityCosts,
  selectedCategory,
}: FlightAllOptionsProps) {
  const [expanded, setExpanded] = useState(false);

  if (flightOptions.length === 0 && perCityCosts.every((c) => !c.flight)) return null;

  // Build a set of (city, category) pairs that are the "selected" flight for cost calc
  const selectedKeys = new Set<string>();
  for (const cost of perCityCosts) {
    if (cost.flight) {
      const effectiveCat = cost.fallbackCategory ?? selectedCategory;
      selectedKeys.add(`${cost.city}|${effectiveCat}`);
    }
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        View All Flight Options
      </button>

      {expanded && (
        <div className="mt-3 overflow-x-auto">
          <p className="text-xs text-zinc-500 mb-2 sm:hidden">Scroll to see all options &rarr;</p>
          <table className="min-w-[600px] w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 uppercase">
                <th className="text-left py-2 px-2">City</th>
                {FLIGHT_CATEGORIES.map((cat) => (
                  <th key={cat.value} className="text-right py-2 px-2">
                    {cat.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cities.map((city) => (
                <tr
                  key={city}
                  className="border-t border-zinc-800/50"
                >
                  <td className="py-2 px-2 text-zinc-300 align-top">{city}</td>
                  {FLIGHT_CATEGORIES.map((cat) => {
                    const options = flightOptions.filter(
                      (f) => f.origin_city === city && f.category === cat.value
                    );
                    const isSelected = selectedKeys.has(`${city}|${cat.value}`);
                    return (
                      <FlightCell
                        key={cat.value}
                        options={options}
                        isSelected={isSelected}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
