"use client";

import { useState, useRef, useEffect } from "react";
import { useCitySearch, CitySuggestion } from "@/lib/hooks/use-city-search";
import { findNearestAirports } from "@/lib/airport-lookup";

interface CitySelectProps {
  value: string;
  onChange: (city: string, airports?: { primary: string[]; nearby: string[] }) => void;
  excludeCities?: string[];
  placeholder?: string;
  currentAirports?: { primary: string[]; nearby: string[] };
  onCoordinates?: (lat: number, lng: number, geo?: { countryCode?: string; country?: string; state?: string }) => void;
}

export function CitySelect({ value, onChange, excludeCities = [], placeholder = "Search city...", currentAirports, onCoordinates }: CitySelectProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [resolving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const displayCache = useRef<Record<string, string>>({});

  const getDisplay = (city: string) => displayCache.current[city] ?? city;

  const { suggestions, loading } = useCitySearch(query);

  // Filter out excluded cities
  const filtered = suggestions.filter(
    (s) => !excludeCities.includes(s.name)
  );

  useEffect(() => { setQuery(getDisplay(value)); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (query !== getDisplay(value)) setQuery(getDisplay(value));
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [query, value]);

  const formatFullLocation = (s: CitySuggestion): string => {
    const parts = [s.name];
    if (s.state) parts.push(s.state);
    if (s.countryCode) parts.push(s.countryCode);
    else if (s.country) parts.push(s.country);
    return parts.join(", ");
  };

  const selectCity = async (suggestion: CitySuggestion) => {
    // Track selection (fire-and-forget, non-blocking)
    fetch('/api/cities/track-selection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: suggestion.name,
        countryCode: suggestion.countryCode ?? '',
        lat: suggestion.lat,
        lng: suggestion.lng,
        state: suggestion.state,
        country: suggestion.country,
        population: suggestion.population,
      }),
    }).catch(() => {});

    const display = formatFullLocation(suggestion);
    displayCache.current[suggestion.name] = display;
    setQuery(display);
    setIsOpen(false);

    // Resolve airports client-side (instant, no API call)
    if (suggestion.lat != null && suggestion.lng != null) {
      onCoordinates?.(suggestion.lat, suggestion.lng, { countryCode: suggestion.countryCode, country: suggestion.country, state: suggestion.state });
      const airports = findNearestAirports(suggestion.lat, suggestion.lng);
      onChange(suggestion.name, airports);
    } else {
      onChange(suggestion.name, { primary: [], nearby: [] });
    }
  };

  // Get airports for display (from props only)
  const airports = currentAirports;

  // Format subtitle for a suggestion
  const formatSubtitle = (s: CitySuggestion) => {
    const parts: string[] = [];
    if (s.state) parts.push(s.state);
    if (s.country && s.country !== "United States") parts.push(s.country);
    return parts.join(", ");
  };

  return (
    <div ref={ref} className="flex-1 relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-[var(--surface-2)] border border-[var(--border-default)] rounded-md px-2.5 py-1.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--border-active)] transition-colors duration-150"
        />
        {(loading || resolving) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <svg className="w-3.5 h-3.5 text-[var(--text-3)] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-48 overflow-y-auto rounded-md bg-[var(--surface-2)] border border-[var(--border-hover)] shadow-xl scrollbar-thin">
          {filtered.map((suggestion, i) => (
            <button
              key={`${suggestion.name}-${suggestion.state ?? ""}-${suggestion.countryCode ?? ""}-${i}`}
              onClick={() => selectCity(suggestion)}
              className="w-full text-left px-3 py-2 hover:bg-[var(--surface-3)] transition-colors duration-100 flex items-center justify-between gap-2"
            >
              <span className="text-sm text-[var(--text-1)] truncate">{formatFullLocation(suggestion)}</span>
              <span className="text-[10px] text-[var(--text-3)] font-mono shrink-0 text-right max-w-[45%] truncate">
                {formatSubtitle(suggestion)}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && filtered.length === 0 && query.length > 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md bg-[var(--surface-2)] border border-[var(--border-hover)] shadow-xl px-3 py-2">
          <span className="text-xs text-[var(--text-3)]">No matching cities</span>
        </div>
      )}

      {airports && value && !isOpen && (
        <div className="flex flex-wrap gap-1 mt-1">
          {airports.primary.map((a) => (
            <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--blue-soft)] text-[var(--blue)] border border-[var(--blue-border)] font-mono font-medium">
              {a}
            </span>
          ))}
          {airports.nearby.map((a) => (
            <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-3)] border border-[var(--border-default)] font-mono">
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
