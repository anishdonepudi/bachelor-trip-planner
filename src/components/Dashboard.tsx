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
import { JobsPanel } from "./JobsPanel";
import { ComboSummary } from "./ComboSummary";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Dashboard() {
  const [flightCategory, setFlightCategory] =
    useState<FlightCategory>("nonstop_carryon");
  const [budgetTier, setBudgetTier] = useState<BudgetTier>("budget");
  const [cities, setCities] = useState<CityConfig[]>(DEFAULT_CITIES);

  const [priorityCity, setPriorityCity] = useState("all");
  const [excludedDates, setExcludedDates] = useState<string[]>([]);
  const [destinationAirport, setDestinationAirport] = useState("CUN");
  const [destinationCity, setDestinationCity] = useState("Tulum, Quintana Roo, Mexico");
  const [configChanged, setConfigChanged] = useState(false);
  const [showComboView, setShowComboView] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [scrapeTriggered, setScrapeTriggered] = useState(false);
  const initialLastUpdated = useRef<string | null | undefined>(undefined);

  const { data: weekendData, isLoading: weekendsLoading, mutate: mutateWeekends } = useSWR<WeekendData>(
    "/api/weekends",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 1800000 } // 30 min
  );

  const { data: scrapeData, mutate: mutateScrape } = useSWR<{
    runs: {
      run_id: number;
      status: string;
      created_at: string;
      updated_at: string;
      url: string;
      jobs: { id: number; name: string; status: string; started_at: string | null; completed_at: string | null }[];
    }[];
    lastFlightUpdate: string | null;
  }>("/api/scrape-status", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: scrapeTriggered ? 10000 : 30000,
  });

  // Expected workflow job count: setup(1) + min(unique_airports, 19) flight jobs + airbnb(1) + finalize(1)
  const expectedJobCount = useMemo(() => {
    const uniqueAirports = new Set<string>();
    for (const c of cities) {
      for (const apt of [...c.primaryAirports, ...c.nearbyAirports]) {
        uniqueAirports.add(apt);
      }
    }
    const flightJobs = Math.min(uniqueAirports.size, 19);
    return 1 + flightJobs + 1 + 1; // setup + flights + airbnb + finalize
  }, [cities]);

  const allJobs = scrapeData?.runs?.flatMap((r) => r.jobs) ?? [];
  const runningJobs = allJobs.filter((j) => j.status === "running" || j.status === "queued");
  const isRunning = scrapeTriggered || runningJobs.length > 0;

  // Find active run and compute progress percentage
  const activeRun = scrapeData?.runs?.find((r) =>
    r.jobs.some((j) => j.status === "running" || j.status === "queued")
  );
  const completedJobCount = activeRun?.jobs.filter((j) => j.status === "completed" || j.status === "skipped").length ?? 0;
  const refreshProgress = expectedJobCount > 0 ? Math.round((completedJobCount / expectedJobCount) * 100) : 0;

  // Clear scrapeTriggered once real jobs appear
  useEffect(() => {
    if (scrapeTriggered && runningJobs.length > 0) {
      setScrapeTriggered(false);
    }
  }, [scrapeTriggered, runningJobs.length]);

  const handleScrapeTriggered = useCallback(() => {
    setScrapeTriggered(true);
    // Poll aggressively to pick up the new workflow
    setTimeout(() => mutateScrape(), 5000);
    setTimeout(() => mutateScrape(), 15000);
  }, [mutateScrape]);

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
    setConfigChanged(false);
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
    if (configData?.excluded_dates && Array.isArray(configData.excluded_dates)) {
      setExcludedDates(configData.excluded_dates);
    }
    if (configData?.destination_airport) {
      setDestinationAirport(configData.destination_airport);
    }
    if (configData?.destination_city) {
      setDestinationCity(configData.destination_city);
    }
  }, [configData]);

  const allDateRanges = useMemo(() => generateDateRanges(), []);
  const dateRanges = useMemo(() => {
    if (excludedDates.length === 0) return allDateRanges;
    const excludedSet = new Set(excludedDates);
    return allDateRanges.filter((dr) => {
      // Check if any excluded date falls within this date range
      const start = new Date(dr.departDate + "T00:00:00");
      const end = new Date(dr.returnDate + "T00:00:00");
      const current = new Date(start);
      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        if (excludedSet.has(`${y}-${m}-${d}`)) return false;
        current.setDate(current.getDate() + 1);
      }
      return true;
    });
  }, [allDateRanges, excludedDates]);

  const weekendScores = useMemo(() => {
    if (!weekendData) return [];
    return scoreAllWeekends(
      dateRanges,
      weekendData.flights ?? [],
      weekendData.flightOptions ?? [],
      weekendData.airbnbListings ?? [],
      flightCategory,
      budgetTier,
      cities,
      priorityCity
    );
  }, [weekendData, dateRanges, flightCategory, budgetTier, cities, priorityCity]);


  const hasData =
    weekendData &&
    ((weekendData.flights?.length ?? 0) > 0 ||
      (weekendData.airbnbListings?.length ?? 0) > 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="relative">
            <div className="absolute -left-10 top-1/2 -translate-y-1/2">
              <JobsPanel runs={scrapeData?.runs ?? []} />
            </div>
            <h1 className="text-xl font-bold text-zinc-100">
              TripSync
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {cities.filter(c => c.city).length} cities &middot;{" "}
              {cities.reduce((s, c) => s + c.people, 0)} people
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ScrapeStatus
              lastUpdated={scrapeData?.lastFlightUpdate ?? null}
              isRunning={isRunning}
              onTriggered={handleScrapeTriggered}
            />
            <ConfigModal
              cities={cities}
              excludedDates={excludedDates}
              destinationAirport={destinationAirport}
              destinationCity={destinationCity}
              onSave={(newCities, newExcluded, newDestination, newDestCity) => {
                const citiesChanged = JSON.stringify(newCities) !== JSON.stringify(cities) || newDestination !== destinationAirport || newDestCity !== destinationCity;
                setCities(newCities);
                setExcludedDates(newExcluded);
                setDestinationAirport(newDestination);
                setDestinationCity(newDestCity);
                if (citiesChanged) setConfigChanged(true);
              }}
            />
          </div>
        </div>
      </header>

      {/* Running jobs banner */}
      {isRunning && (
        <div className="bg-sky-950/60 border-b border-sky-800/40">
          <div className="max-w-5xl mx-auto px-4 py-2.5 space-y-2">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-sky-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-sky-300 flex-1">
                {runningJobs.length > 0
                  ? "Data refresh in progress — new prices will appear once all jobs complete."
                  : "Data refresh triggered — waiting for jobs to start..."}
              </span>
              {activeRun && (
                <span className="text-sm font-medium text-sky-300 shrink-0">{refreshProgress}%</span>
              )}
            </div>
            {activeRun && (
              <div className="h-1 rounded-full bg-sky-900/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-400 transition-all duration-500"
                  style={{ width: `${refreshProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Config changed banner */}
      {configChanged && (
        <div className="bg-amber-950/60 border-b border-amber-800/40">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-amber-300">
                Configuration updated — data refresh is in progress with the new configuration. Data shown below is based on the previous configuration.
              </span>
            </div>
            <button
              onClick={() => setConfigChanged(false)}
              className="text-amber-400/60 hover:text-amber-300 transition-colors shrink-0 ml-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {weekendsLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* View toggle */}
            {hasData && (
              <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800 w-fit">
                <button
                  onClick={() => setShowComboView(true)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    showComboView
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setShowComboView(false)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    !showComboView
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Ranked List
                </button>
              </div>
            )}

            {/* Filters */}
            <FilterBar
              flightCategory={flightCategory}
              budgetTier={budgetTier}
              priorityCity={priorityCity}
              cities={cities}
              onFlightCategoryChange={setFlightCategory}
              onBudgetTierChange={setBudgetTier}
              onPriorityCityChange={setPriorityCity}
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
            ) : showComboView ? (
              <ComboSummary
                weekendData={weekendData}
                dateRanges={dateRanges}
                cities={cities}
                priorityCity={priorityCity}
                activeFlightCategory={flightCategory}
                activeBudgetTier={budgetTier}
                onSelectCombo={(fc, bt) => {
                  setFlightCategory(fc);
                  setBudgetTier(bt);
                  setShowComboView(false);
                }}
              />
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-zinc-500">
                  {weekendScores.length} weekends ranked by {priorityCity !== "all" ? `cheapest for ${priorityCity}` : "composite score (per-city z-score)"} &middot; max 10hr one-way flights
                </div>
                {weekendScores.map((weekend, i) => (
                  <WeekendCard
                    key={weekend.dateRange.id}
                    weekend={weekend}
                    rank={i + 1}
                    flightCategory={flightCategory}
                    budgetTier={budgetTier}
                    priorityCity={priorityCity}
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
