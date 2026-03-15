"use client";

import { useState, useEffect, useRef } from "react";

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

interface PopularCity {
  name: string;
  state?: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  population: number;
}

// ── Module-level caches (persist for browser session) ──
let popularCities: PopularCity[] | null = null;
let popularCitiesPromise: Promise<PopularCity[]> | null = null;
const searchCache = new Map<string, CitySuggestion[]>();

async function loadPopularCities(): Promise<PopularCity[]> {
  if (popularCities) return popularCities;
  if (popularCitiesPromise) return popularCitiesPromise;

  popularCitiesPromise = fetch("/api/cities/popular")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load popular cities");
      return res.json() as Promise<PopularCity[]>;
    })
    .then((data) => {
      popularCities = data;
      return data;
    })
    .catch(() => {
      popularCitiesPromise = null;
      return [] as PopularCity[];
    });

  return popularCitiesPromise;
}

export function useCitySearch(query: string, debounceMs = 300) {
  const [apiResults, setApiResults] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cities, setCities] = useState<PopularCity[]>(popularCities ?? []);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);

  // Load popular cities on first use
  useEffect(() => {
    if (!popularCities) {
      loadPopularCities().then((data) => setCities(data));
    }
  }, []);

  // Local instant matches from popular cities
  const localMatches: CitySuggestion[] = query.length > 0
    ? cities
        .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
        .map((c) => ({
          name: c.name,
          state: c.state,
          country: c.country,
          countryCode: c.countryCode,
          lat: c.lat,
          lng: c.lng,
          population: c.population,
          isLocal: true,
        }))
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

    // Check search cache
    const cacheKey = query.trim().toLowerCase();
    const cached = searchCache.get(cacheKey);
    if (cached) {
      setApiResults(cached);
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
          searchCache.set(cacheKey, data);
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
