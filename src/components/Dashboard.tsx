"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import useSWR from "swr";
import {
  FlightCategory,
  BudgetTier,
  CityConfig,
  WeekendData,
} from "@/lib/types";
import { generateDateRanges } from "@/lib/date-ranges";
import { scoreAllWeekends } from "@/lib/scoring";
import { DEFAULT_CITIES } from "@/config/default-config";
import { FilterBar } from "./FilterBar";
import { WeekendCard } from "./WeekendCard";
import { ScrapeStatus } from "./ScrapeStatus";
import { ConfigModal } from "./ConfigModal";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { DataUpdateModal } from "./DataUpdateModal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Dashboard() {
  const [flightCategory, setFlightCategory] =
    useState<FlightCategory>("nonstop_carryon");
  const [budgetTier, setBudgetTier] = useState<BudgetTier>("budget");
  const [selectedWeekend, setSelectedWeekend] = useState<string | null>(null);
  const [cities, setCities] = useState<CityConfig[]>(DEFAULT_CITIES);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const initialLastUpdated = useRef<string | null | undefined>(undefined);

  const { data: weekendData, isLoading: weekendsLoading, mutate: mutateWeekends } = useSWR<WeekendData>(
    "/api/weekends",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 1800000 } // 30 min
  );

  const { data: scrapeData } = useSWR<{
    lastFlightUpdate: string | null;
  }>("/api/scrape-status", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60000,
  });

  // Track initial lastFlightUpdate and show modal when it changes
  useEffect(() => {
    if (!scrapeData?.lastFlightUpdate) return;

    if (initialLastUpdated.current === undefined) {
      // First load — store the baseline
      initialLastUpdated.current = scrapeData.lastFlightUpdate;
    } else if (scrapeData.lastFlightUpdate !== initialLastUpdated.current) {
      // Data has been updated since page load
      setShowUpdateModal(true);
    }
  }, [scrapeData?.lastFlightUpdate]);

  const handleDataRefresh = useCallback(() => {
    setShowUpdateModal(false);
    initialLastUpdated.current = scrapeData?.lastFlightUpdate ?? null;
    mutateWeekends();
  }, [scrapeData?.lastFlightUpdate, mutateWeekends]);

  const { data: configData } = useSWR("/api/config", fetcher, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (configData?.cities && Array.isArray(configData.cities)) {
      setCities(configData.cities);
    }
  }, [configData]);

  const dateRanges = useMemo(() => generateDateRanges(), []);

  const weekendScores = useMemo(() => {
    if (!weekendData) return [];
    return scoreAllWeekends(
      dateRanges,
      weekendData.flights ?? [],
      weekendData.flightOptions ?? [],
      weekendData.airbnbListings ?? [],
      flightCategory,
      budgetTier,
      cities
    );
  }, [weekendData, dateRanges, flightCategory, budgetTier, cities]);

  const filteredWeekendScores = useMemo(() => {
    if (!selectedWeekend) return weekendScores;
    return weekendScores.filter((w) => w.dateRange.id === selectedWeekend);
  }, [weekendScores, selectedWeekend]);

  const hasData =
    weekendData &&
    ((weekendData.flights?.length ?? 0) > 0 ||
      (weekendData.airbnbListings?.length ?? 0) > 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              Tulum Bachelor Trip Planner
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {cities.length} cities &middot;{" "}
              {cities.reduce((s, c) => s + c.people, 0)} people &middot; Summer
              2026
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ScrapeStatus
              lastUpdated={scrapeData?.lastFlightUpdate ?? null}
            />
            <ConfigModal cities={cities} onSave={setCities} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {weekendsLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Filters */}
            <FilterBar
              flightCategory={flightCategory}
              budgetTier={budgetTier}
              selectedWeekend={selectedWeekend}
              dateRanges={dateRanges}
              onFlightCategoryChange={setFlightCategory}
              onBudgetTierChange={setBudgetTier}
              onWeekendChange={setSelectedWeekend}
            />

            {/* Weekend Cards */}
            {!hasData ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">&#9992;</div>
                <h2 className="text-xl font-semibold text-zinc-300 mb-2">
                  No Data Yet
                </h2>
                <p className="text-zinc-500 max-w-md mx-auto mb-6">
                  Flight and Airbnb data hasn&apos;t been scraped yet. Click
                  &quot;Refresh Data&quot; to trigger the first scrape, or wait
                  for the scheduled GitHub Actions run.
                </p>
                <div className="space-y-3">
                  <p className="text-sm text-zinc-600">
                    Available weekends: {dateRanges.length} date ranges
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-zinc-500">
                  {filteredWeekendScores.length} weekends ranked by total group cost
                </div>
                {filteredWeekendScores.map((weekend, i) => (
                  <WeekendCard
                    key={weekend.dateRange.id}
                    weekend={weekend}
                    rank={i + 1}
                    flightCategory={flightCategory}
                    budgetTier={budgetTier}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <DataUpdateModal
        open={showUpdateModal}
        onRefresh={handleDataRefresh}
      />
    </div>
  );
}
