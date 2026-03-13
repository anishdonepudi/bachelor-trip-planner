"use client";

import { useState, useRef, useEffect } from "react";
import { CITY_AIRPORTS } from "@/lib/airports";

const ALL_CITIES = Object.keys(CITY_AIRPORTS).sort();

interface CitySelectProps {
  value: string;
  onChange: (city: string) => void;
  excludeCities?: string[];
}

export function CitySelect({ value, onChange, excludeCities = [] }: CitySelectProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = ALL_CITIES.filter(
    (c) =>
      c.toLowerCase().includes(query.toLowerCase()) &&
      !excludeCities.includes(c)
  );

  // Sync query when value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Reset query to current value if nothing was selected
        if (!ALL_CITIES.includes(query)) {
          setQuery(value);
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [query, value]);

  const selectCity = (city: string) => {
    setQuery(city);
    setIsOpen(false);
    onChange(city);
  };

  const airports = CITY_AIRPORTS[value];

  return (
    <div ref={ref} className="flex-1 relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search city..."
        className="w-full bg-[var(--color-surface-elevated)] border border-[var(--border-hover)] rounded-xl px-2 py-1 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[oklch(0.55_0.2_265_/_50%)]"
      />

      {/* Dropdown */}
      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-48 overflow-y-auto rounded-xl bg-[var(--color-surface-base)] border border-[var(--border-hover)] shadow-xl">
          {filtered.map((city) => {
            const apt = CITY_AIRPORTS[city];
            const allAirports = [...apt.primary, ...apt.nearby];
            return (
              <button
                key={city}
                onClick={() => selectCity(city)}
                className="w-full text-left px-3 py-2 hover:bg-[var(--color-surface-elevated)] transition-colors flex items-center justify-between gap-2"
              >
                <span className="text-sm text-[var(--color-text-primary)]">{city}</span>
                <span className="text-[11px] text-[var(--color-text-secondary)] font-mono">
                  {allAirports.join(", ")}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && filtered.length === 0 && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl bg-[var(--color-surface-base)] border border-[var(--border-hover)] shadow-xl px-3 py-2">
          <span className="text-xs text-[var(--color-text-secondary)]">No matching cities</span>
        </div>
      )}

      {/* Airport tags below input */}
      {airports && value && !isOpen && (
        <div className="flex flex-wrap gap-1 mt-1">
          {airports.primary.map((a) => (
            <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-[oklch(0.55_0.2_265_/_15%)] text-[var(--color-indigo)] border border-[oklch(0.55_0.2_265_/_20%)] font-mono">
              {a}
            </span>
          ))}
          {airports.nearby.map((a) => (
            <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-elevated)]/50 text-[var(--color-text-secondary)] border border-[var(--border)] font-mono">
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
