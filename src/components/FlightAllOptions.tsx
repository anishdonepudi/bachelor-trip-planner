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

function FlightCell({ options, isSelected }: { options: FlightOptionRow[]; isSelected: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = options.filter((f) => f.price != null).sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  const cheapest = sorted[0] ?? null;
  const alternates = sorted.slice(1, 3);
  const hasAlternates = alternates.length > 0;

  if (!cheapest) {
    return <td className="text-right py-2.5 px-3 align-top"><span className="text-[var(--text-3)] text-xs">-</span></td>;
  }

  return (
    <td className={`py-2.5 px-3 align-top ${isSelected ? "bg-[var(--teal-soft)]" : ""}`}>
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1.5">
          {isSelected && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--teal-border)] font-medium">
              Active
            </span>
          )}
          <a
            href={cheapest.google_flights_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--gold)] hover:text-[var(--blue)] font-mono font-semibold text-sm tabular-nums transition-colors duration-150"
          >
            ${cheapest.price}
          </a>
          {hasAlternates && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150"
            >
              <svg className={`w-3 h-3 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
        <div className="text-right"><FlightDetails flight={cheapest} /></div>
        {expanded && alternates.map((alt, i) => (
          <div key={i} className="mt-1.5 pt-1.5 border-t border-[var(--border-default)] text-right w-full">
            <a href={alt.google_flights_url ?? "#"} target="_blank" rel="noopener noreferrer"
              className="text-[var(--text-1)] hover:text-[var(--blue)] font-mono text-sm tabular-nums transition-colors duration-150">
              ${alt.price}
            </a>
            <FlightDetails flight={alt} />
          </div>
        ))}
      </div>
    </td>
  );
}

export function FlightAllOptions({ flightOptions, cities, perCityCosts, selectedCategory }: FlightAllOptionsProps) {
  const [expanded, setExpanded] = useState(false);

  if (flightOptions.length === 0 && perCityCosts.every((c) => !c.flight)) return null;

  const selectedKeys = new Set<string>();
  for (const cost of perCityCosts) {
    if (cost.flight) {
      const effectiveCat = cost.fallbackCategory ?? selectedCategory;
      selectedKeys.add(`${cost.city}|${effectiveCat}`);
    }
  }

  return (
    <section>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors duration-150"
      >
        <svg className={`w-3 h-3 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-heading uppercase tracking-wider">All Flight Options</span>
      </button>

      {expanded && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border-default)]">
          <table className="min-w-[600px] w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface-1)] text-[10px] text-[var(--text-3)] uppercase tracking-wider font-heading">
                <th className="text-left py-2.5 px-3 font-semibold">City</th>
                {FLIGHT_CATEGORIES.map((cat) => (
                  <th key={cat.value} className="text-right py-2.5 px-3 font-semibold">{cat.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {cities.map((city) => (
                <tr key={city} className="hover:bg-[var(--surface-1)] transition-colors duration-100">
                  <td className="py-2.5 px-3 text-[var(--text-1)] font-medium align-top">{city}</td>
                  {FLIGHT_CATEGORIES.map((cat) => {
                    const options = flightOptions.filter(
                      (f) => f.origin_city === city && f.category === cat.value
                    );
                    const isSelected = selectedKeys.has(`${city}|${cat.value}`);
                    return <FlightCell key={cat.value} options={options} isSelected={isSelected} />;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
