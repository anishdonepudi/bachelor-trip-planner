"use client";

import { useState, useEffect, useRef } from "react";
import { CITY_AIRPORTS } from "@/lib/airports";

const ALL_CITIES = Object.keys(CITY_AIRPORTS).sort();

export interface CitySuggestion {
  name: string;
  state?: string;
  country?: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
  population?: number;
  isLocal?: boolean;
}

export function useCitySearch(query: string, debounceMs = 300) {
  const [apiResults, setApiResults] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);

  // Local instant matches
  const localMatches: CitySuggestion[] = query.length > 0
    ? ALL_CITIES
        .filter((c) => c.toLowerCase().includes(query.toLowerCase()))
        .map((name) => ({ name, country: "United States", countryCode: "US", isLocal: true }))
    : [];

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (query.length < 2) {
      setApiResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/cities/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Search failed");
        const data: CitySuggestion[] = await res.json();
        if (!controller.signal.aborted) {
          setApiResults(data);
          setError(null);
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          setError(e.message);
          setApiResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query, debounceMs]);

  // Merge: local first, then API results (deduplicated)
  const localNames = new Set(localMatches.map((m) => m.name.toLowerCase()));
  const dedupedApi = apiResults.filter(
    (r) => !localNames.has(r.name.toLowerCase())
  );

  const suggestions = [...localMatches, ...dedupedApi];

  return { suggestions, loading, error };
}
