"use client";

import { useEffect, useState } from "react";

export interface MonthEvent {
  name: string;
  description?: string;
  date?: string; // YYYY-MM-DD if known
  type?: "holiday" | "festival";
}

export interface YearWeather {
  year: number;
  highC: number;
  lowC: number;
  precipMm: number;
}

export interface MonthInsight {
  month: number;
  label: string;
  avgHighC: number;
  avgLowC: number;
  avgHighF: number;
  avgLowF: number;
  precipitationMm: number;
  yearly?: YearWeather[];
  crowd: number;
  season: "peak" | "shoulder" | "off" | "unknown";
  events: MonthEvent[];
  score: number;
  recommendation: "great" | "good" | "okay" | "avoid";
}

export interface DailyAvg {
  highC: number;
  lowC: number;
}

export interface InsightsData {
  months: MonthInsight[];
  dailyAverages?: Record<string, DailyAvg>; // "MM-DD" → 3-year avg
  notes?: string;
  hasWeatherData: boolean;
  hasTourismData: boolean;
}

export function useTravelInsights(lat: number | null, lng: number | null, cityName: string, countryCode?: string, countryName?: string, stateName?: string) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lng || !cityName) return;

    setLoading(true);
    setError(null);

    let url = `/api/travel-insights?lat=${lat}&lng=${lng}&city=${encodeURIComponent(cityName)}`;
    if (countryCode) url += `&country=${encodeURIComponent(countryCode)}`;
    if (countryName) url += `&countryName=${encodeURIComponent(countryName)}`;
    if (stateName) url += `&stateName=${encodeURIComponent(stateName)}`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [lat, lng, cityName, countryCode, countryName, stateName]);

  return { data, loading, error };
}
