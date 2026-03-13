"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import useSWR from "swr";
import {
  FlightCategory,
  BudgetTier,
  ScoringAlgorithm,
  CityConfig,
  WeekendData,
} from "@/lib/types";
import { generateDateRanges } from "@/lib/date-ranges";
import { scoreAllWeekends } from "@/lib/scoring";
import { DEFAULT_CITIES } from "@/config/default-config";
import { SCORING_ALGORITHMS, FLIGHT_CATEGORIES, BUDGET_TIERS } from "@/lib/constants";
import { FilterBar } from "./FilterBar";
import { FilterSheet } from "./FilterSheet";
import { WeekendCard } from "./WeekendCard";
import { ScrapeStatus } from "./ScrapeStatus";
import { ConfigModal } from "./ConfigModal";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { DataUpdateModal } from "./DataUpdateModal";
import { JobsPanel } from "./JobsPanel";
import { ComboSummary } from "./ComboSummary";
import { MobileNav } from "./MobileNav";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Dashboard() {
  const [flightCategory, setFlightCategory] =
    useState<FlightCategory>("nonstop_carryon");
  const [budgetTier, setBudgetTier] = useState<BudgetTier>("budget");
  const [cities, setCities] = useState<CityConfig[]>(DEFAULT_CITIES);

  const [priorityCity, setPriorityCity] = useState("all");
  const [scoringAlgorithm, setScoringAlgorithm] = useState<ScoringAlgorithm>("zscore");
  const [excludedDates, setExcludedDates] = useState<string[]>([]);
  const [destinationAirport, setDestinationAirport] = useState("CUN");
  const [destinationCity, setDestinationCity] = useState("Tulum, Quintana Roo, Mexico");
  const [configChanged, setConfigChanged] = useState(false);
  const [showComboView, setShowComboView] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [scrapeTriggered, setScrapeTriggered] = useState(false);
  const [mobileTab, setMobileTab] = useState<"weekends" | "filters" | "settings" | "jobs">("weekends");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showMobileConfig, setShowMobileConfig] = useState(false);
  const [showMobileJobs, setShowMobileJobs] = useState(false);
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
      priorityCity,
      scoringAlgorithm
    );
  }, [weekendData, dateRanges, flightCategory, budgetTier, cities, priorityCity, scoringAlgorithm]);


  const hasData =
    weekendData &&
    ((weekendData.flights?.length ?? 0) > 0 ||
      (weekendData.airbnbListings?.length ?? 0) > 0);

  // Count active filters (non-default selections)
  const activeFilterCount = [
    flightCategory !== "nonstop_carryon",
    budgetTier !== "budget",
    priorityCity !== "all",
    scoringAlgorithm !== "zscore",
  ].filter(Boolean).length;

  const handleMobileTab = (tab: "weekends" | "filters" | "settings" | "jobs") => {
    setMobileTab(tab);
    if (tab === "filters") {
      setShowFilterSheet(true);
    } else if (tab === "settings") {
      setShowMobileConfig(true);
    } else if (tab === "jobs") {
      setShowMobileJobs(true);
    }
    // Always reset to weekends tab after opening a panel
    if (tab !== "weekends") {
      setTimeout(() => setMobileTab("weekends"), 100);
    }
  };

  const flightCatLabel = FLIGHT_CATEGORIES.find((c) => c.value === flightCategory)?.label ?? flightCategory;
  const budgetLabel = BUDGET_TIERS.find((t) => t.value === budgetTier)?.label ?? budgetTier;

  return (
    <div className="min-h-screen bg-[var(--color-surface-deep)] text-[var(--color-text-primary)]">
      {/* Header */}
      <header className="glass border-b border-[var(--border)] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] font-heading">
              TripSync
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {cities.filter(c => c.city).length} cities &middot;{" "}
              {cities.reduce((s, c) => s + c.people, 0)} people
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden md:block">
              <JobsPanel runs={scrapeData?.runs ?? []} />
            </div>
            <ScrapeStatus
              lastUpdated={scrapeData?.lastFlightUpdate ?? null}
              isRunning={isRunning}
              onTriggered={handleScrapeTriggered}
            />
            <div className="hidden md:block">
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
        </div>
      </header>

      {/* Running jobs banner */}
      {isRunning && (
        <div className="bg-[oklch(0.55_0.2_265_/_8%)] border-b border-[oklch(0.55_0.2_265_/_15%)]">
          <div className="max-w-5xl mx-auto px-4 py-2.5 space-y-2">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-[var(--color-indigo)] animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-[oklch(0.7_0.15_265)] flex-1">
                {runningJobs.length > 0
                  ? "Data refresh in progress — new prices will appear once all jobs complete."
                  : "Data refresh triggered — waiting for jobs to start..."}
              </span>
              {activeRun && (
                <span className="text-sm font-medium text-[oklch(0.7_0.15_265)] shrink-0">{refreshProgress}%</span>
              )}
            </div>
            {activeRun && (
              <div className="h-1 rounded-full bg-[oklch(0.55_0.2_265_/_15%)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--color-indigo)] transition-all duration-500"
                  style={{ width: `${refreshProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Config changed banner */}
      {configChanged && (
        <div className="bg-[oklch(0.75_0.18_85_/_8%)] border-b border-[oklch(0.75_0.18_85_/_15%)]">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-[var(--color-amber)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-[oklch(0.8_0.15_85)]">
                Configuration updated — data refresh is in progress with the new configuration. Data shown below is based on the previous configuration.
              </span>
            </div>
            <button
              onClick={() => setConfigChanged(false)}
              className="text-[oklch(0.75_0.18_85_/_60%)] hover:text-[oklch(0.8_0.15_85)] transition-colors shrink-0 ml-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mobile quick filter chips */}
      {hasData && !weekendsLoading && (
        <div className="md:hidden border-b border-[var(--border)] glass">
          <div className="flex overflow-x-auto gap-2 px-4 py-2.5 whitespace-nowrap scrollbar-thin">
            <button
              onClick={() => setShowFilterSheet(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[oklch(0.55_0.2_265_/_15%)] text-[oklch(0.7_0.15_265)] border border-[oklch(0.55_0.2_265_/_30%)] shrink-0"
            >
              {flightCatLabel}
            </button>
            <button
              onClick={() => setShowFilterSheet(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0"
            >
              {budgetLabel}
            </button>
            {priorityCity !== "all" && (
              <button
                onClick={() => setShowFilterSheet(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0"
              >
                {priorityCity}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8 pb-24 md:pb-8 space-y-8">
        {weekendsLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* View toggle */}
            {hasData && (
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--color-surface-base)] border border-[var(--border)] w-fit">
                <button
                  onClick={() => setShowComboView(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    showComboView
                      ? "bg-[var(--color-indigo)] text-white shadow-[var(--glow-indigo)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setShowComboView(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    !showComboView
                      ? "bg-[var(--color-indigo)] text-white shadow-[var(--glow-indigo)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  Ranked List
                </button>
              </div>
            )}

            {/* Filters — desktop only */}
            <div className="hidden md:block">
              <FilterBar
                flightCategory={flightCategory}
                budgetTier={budgetTier}
                priorityCity={priorityCity}
                scoringAlgorithm={scoringAlgorithm}
                cities={cities}
                onFlightCategoryChange={setFlightCategory}
                onBudgetTierChange={setBudgetTier}
                onPriorityCityChange={setPriorityCity}
                onScoringAlgorithmChange={setScoringAlgorithm}
              />
            </div>

            {/* Weekend Cards */}
            {!hasData ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">&#9992;</div>
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                  No Data Yet
                </h2>
                <p className="text-[var(--color-text-secondary)] max-w-md mx-auto mb-6">
                  Flight and Airbnb data hasn&apos;t been scraped yet. Click
                  &quot;Refresh Data&quot; to trigger the first scrape, or wait
                  for the scheduled GitHub Actions run.
                </p>
                <div className="space-y-3">
                  <p className="text-sm text-[var(--color-text-tertiary)]">
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
                scoringAlgorithm={scoringAlgorithm}
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
                <div className="text-sm text-[var(--color-text-secondary)]">
                  {weekendScores.length} weekends ranked by {SCORING_ALGORITHMS.find(a => a.value === scoringAlgorithm)?.label ?? scoringAlgorithm}{priorityCity !== "all" ? ` for ${priorityCity}` : ""} &middot; max 10hr one-way flights
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

      {/* Mobile bottom nav */}
      <MobileNav
        activeTab={mobileTab}
        onTabChange={handleMobileTab}
        activeFilterCount={activeFilterCount}
      />

      {/* Mobile filter sheet */}
      <FilterSheet
        open={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        flightCategory={flightCategory}
        budgetTier={budgetTier}
        priorityCity={priorityCity}
        scoringAlgorithm={scoringAlgorithm}
        cities={cities}
        onFlightCategoryChange={setFlightCategory}
        onBudgetTierChange={setBudgetTier}
        onPriorityCityChange={setPriorityCity}
        onScoringAlgorithmChange={setScoringAlgorithm}
      />

      {/* Mobile config — full-screen modal */}
      {showMobileConfig && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileConfig(false)} />
          <div className="absolute inset-0 bg-[var(--color-surface-deep)] overflow-y-auto scrollbar-thin">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 glass border-b border-[var(--border)]">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Settings</h2>
              <button onClick={() => setShowMobileConfig(false)} className="p-2 -mr-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] min-w-[44px] min-h-[44px] flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 pb-24">
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
                  setShowMobileConfig(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile jobs panel — full-screen */}
      {showMobileJobs && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileJobs(false)} />
          <div className="absolute inset-0 bg-[var(--color-surface-deep)] overflow-y-auto scrollbar-thin">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 glass border-b border-[var(--border)]">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Data Refresh Runs</h2>
              <button onClick={() => setShowMobileJobs(false)} className="p-2 -mr-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] min-w-[44px] min-h-[44px] flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 pb-24">
              <JobsPanel runs={scrapeData?.runs ?? []} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
