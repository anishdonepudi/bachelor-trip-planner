"use client";

import { useState } from "react";
import { FlightOptionRow, FlightCategory } from "@/lib/types";
import { FLIGHT_CATEGORIES } from "@/lib/constants";

interface FlightAllOptionsProps {
  flightOptions: FlightOptionRow[];
  cities: string[];
}

export function FlightAllOptions({
  flightOptions,
  cities,
}: FlightAllOptionsProps) {
  const [expanded, setExpanded] = useState(false);

  if (flightOptions.length === 0) return null;

  const getCheapest = (city: string, category: FlightCategory) => {
    const options = flightOptions
      .filter((f) => f.origin_city === city && f.category === category)
      .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    return options[0] ?? null;
  };

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
          <table className="w-full text-sm">
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
                  className="border-t border-zinc-800/50 hover:bg-zinc-800/30"
                >
                  <td className="py-2 px-2 text-zinc-300">{city}</td>
                  {FLIGHT_CATEGORIES.map((cat) => {
                    const option = getCheapest(city, cat.value);
                    return (
                      <td
                        key={cat.value}
                        className="text-right py-2 px-2"
                      >
                        {option?.price != null ? (
                          <a
                            href={option.google_flights_url ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-200 hover:text-sky-400 font-mono transition-colors"
                          >
                            ${option.price}
                          </a>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
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
