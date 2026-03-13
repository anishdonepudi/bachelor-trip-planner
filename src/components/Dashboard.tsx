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
  // ── State ──
  const [flightCategory, setFlightCategory] = useState<FlightCategory>("nonstop_carryon");
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

  // ── Data fetching ──
  const { data: weekendData, isLoading: weekendsLoading, mutate: mutateWeekends } = useSWR<WeekendData>(
    "/api/weekends", fetcher, { revalidateOnFocus: false, dedupingInterval: 1800000 }
  );

  const { data: scrapeData, mutate: mutateScrape } = useSWR<{
    runs: {
      run_id: number; status: string; created_at: string; updated_at: string; url: string;
      jobs: { id: number; name: string; status: string; started_at: string | null; completed_at: string | null }[];
    }[];
    lastFlightUpdate: string | null;
    scraperProgress: { completed: number; total: number; jobs: number } | null;
  }>("/api/scrape-status", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: (latestData) => {
      if (scrapeTriggered) return 1000;
      const jobs = latestData?.runs?.flatMap((r) => r.jobs) ?? [];
      return jobs.some((j) => j.status === "running" || j.status === "queued") ? 1000 : 30000;
    },
  });

  const expectedJobCount = useMemo(() => {
    const uniqueAirports = new Set<string>();
    for (const c of cities) {
      for (const apt of [...c.primaryAirports, ...c.nearbyAirports]) uniqueAirports.add(apt);
    }
    return 1 + Math.min(uniqueAirports.size, 19) + 1 + 1;
  }, [cities]);

  const allJobs = scrapeData?.runs?.flatMap((r) => r.jobs) ?? [];
  const runningJobs = allJobs.filter((j) => j.status === "running" || j.status === "queued");
  const isRunning = scrapeTriggered || runningJobs.length > 0;

  const activeRun = scrapeData?.runs?.find((r) => r.jobs.some((j) => j.status === "running" || j.status === "queued"));
  const completedJobCount = activeRun?.jobs.filter((j) => j.status === "completed" || j.status === "skipped").length ?? 0;

  // Granular progress: use per-task progress from scrape_jobs when available
  const refreshProgress = useMemo(() => {
    if (!activeRun || expectedJobCount === 0) return 0;
    const sp = scrapeData?.scraperProgress;
    if (sp && sp.total > 0) {
      // Weighted: completed GitHub jobs as 100% + running jobs' internal progress
      const runningJobCount = activeRun.jobs.filter((j) => j.status === "running").length;
      const queuedJobCount = activeRun.jobs.filter((j) => j.status === "queued").length;
      const doneWeight = completedJobCount * 1;
      const runningWeight = runningJobCount > 0 ? (sp.completed / sp.total) * runningJobCount : 0;
      const totalWeight = completedJobCount + runningJobCount + queuedJobCount;
      if (totalWeight === 0) return 0;
      return Math.round(((doneWeight + runningWeight) / totalWeight) * 100);
    }
    // Fallback: job-level only
    return Math.round((completedJobCount / expectedJobCount) * 100);
  }, [activeRun, completedJobCount, expectedJobCount, scrapeData?.scraperProgress]);

  useEffect(() => {
    if (scrapeTriggered && runningJobs.length > 0) setScrapeTriggered(false);
  }, [scrapeTriggered, runningJobs.length]);

  const handleScrapeTriggered = useCallback(() => {
    setScrapeTriggered(true);
    setTimeout(() => mutateScrape(), 5000);
    setTimeout(() => mutateScrape(), 15000);
  }, [mutateScrape]);

  useEffect(() => {
    if (!scrapeData?.lastFlightUpdate) return;
    if (initialLastUpdated.current === undefined) {
      initialLastUpdated.current = scrapeData.lastFlightUpdate;
    } else if (scrapeData.lastFlightUpdate !== initialLastUpdated.current) {
      setShowUpdateModal(true);
    }
  }, [scrapeData?.lastFlightUpdate]);

  const handleDataRefresh = useCallback(() => {
    setShowUpdateModal(false);
    setConfigChanged(false);
    initialLastUpdated.current = scrapeData?.lastFlightUpdate ?? null;
    mutateWeekends();
  }, [scrapeData?.lastFlightUpdate, mutateWeekends]);

  const { data: configData } = useSWR("/api/config", fetcher, { revalidateOnFocus: false });

  useEffect(() => {
    if (configData?.cities && Array.isArray(configData.cities)) setCities(configData.cities);
    if (configData?.excluded_dates && Array.isArray(configData.excluded_dates)) setExcludedDates(configData.excluded_dates);
    if (configData?.destination_airport) setDestinationAirport(configData.destination_airport);
    if (configData?.destination_city) setDestinationCity(configData.destination_city);
  }, [configData]);

  // ── Derived data ──
  const allDateRanges = useMemo(() => generateDateRanges(), []);
  const dateRanges = useMemo(() => {
    if (excludedDates.length === 0) return allDateRanges;
    const excludedSet = new Set(excludedDates);
    return allDateRanges.filter((dr) => {
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
      dateRanges, weekendData.flights ?? [], weekendData.flightOptions ?? [],
      weekendData.airbnbListings ?? [], flightCategory, budgetTier, cities, priorityCity, scoringAlgorithm
    );
  }, [weekendData, dateRanges, flightCategory, budgetTier, cities, priorityCity, scoringAlgorithm]);

  const hasData = weekendData && ((weekendData.flights?.length ?? 0) > 0 || (weekendData.airbnbListings?.length ?? 0) > 0);

  const activeFilterCount = [
    flightCategory !== "nonstop_carryon",
    budgetTier !== "budget",
    priorityCity !== "all",
    scoringAlgorithm !== "zscore",
  ].filter(Boolean).length;

  const handleMobileTab = (tab: "weekends" | "filters" | "settings" | "jobs") => {
    setMobileTab(tab);
    if (tab === "filters") setShowFilterSheet(true);
    else if (tab === "settings") setShowMobileConfig(true);
    else if (tab === "jobs") setShowMobileJobs(true);
    if (tab !== "weekends") setTimeout(() => setMobileTab("weekends"), 100);
  };

  const flightCatLabel = FLIGHT_CATEGORIES.find((c) => c.value === flightCategory)?.label ?? flightCategory;
  const budgetLabel = BUDGET_TIERS.find((t) => t.value === budgetTier)?.label ?? budgetTier;

  const handleConfigSave = useCallback((newCities: CityConfig[], newExcluded: string[], newDest: string, newDestCity: string) => {
    const citiesChanged = JSON.stringify(newCities) !== JSON.stringify(cities) || newDest !== destinationAirport || newDestCity !== destinationCity;
    setCities(newCities);
    setExcludedDates(newExcluded);
    setDestinationAirport(newDest);
    setDestinationCity(newDestCity);
    if (citiesChanged) setConfigChanged(true);
  }, [cities, destinationAirport, destinationCity]);

  // ── Render ──
  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-1)]">

      {/* ── Top bar ── */}
      <header className="glass border-b border-[var(--border-default)] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between gap-3">
          {/* Left: brand */}
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-heading font-bold tracking-tight text-[var(--text-1)]">
              TripSync
            </h1>
            <span className="text-[11px] text-[var(--text-3)] font-mono tabular-nums hidden sm:inline">
              {cities.filter(c => c.city).length} cities &middot; {cities.reduce((s, c) => s + c.people, 0)} people
            </span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5">
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
                onSave={handleConfigSave}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── Progress banner ── */}
      {isRunning && (
        <div className="border-b border-[var(--blue-border)] bg-[var(--blue-soft)]">
          <div className="max-w-5xl mx-auto px-4 py-2 space-y-1.5">
            <div className="flex items-center gap-2.5">
              <svg className="w-3.5 h-3.5 text-[var(--blue)] animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-xs text-[var(--blue)] flex-1">
                {runningJobs.length > 0 ? "Refreshing prices..." : "Starting refresh..."}
              </span>
              {activeRun && (
                <span className="text-xs font-mono font-semibold text-[var(--blue)] tabular-nums">{refreshProgress}%</span>
              )}
            </div>
            {activeRun && (
              <div className="h-[2px] rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--blue)] transition-all duration-500" style={{ width: `${refreshProgress}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Config changed banner ── */}
      {configChanged && (
        <div className="border-b border-[var(--gold-border)] bg-[var(--gold-soft)]">
          <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
              <span className="text-xs text-[var(--gold)]">
                Config updated. Refresh in progress. Showing previous data.
              </span>
            </div>
            <button onClick={() => setConfigChanged(false)} className="text-[var(--gold)] opacity-60 hover:opacity-100 transition-opacity duration-150">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile filter chips ── */}
      {hasData && !weekendsLoading && (
        <div className="md:hidden border-b border-[var(--border-default)] bg-[var(--surface-0)]">
          <div className="flex overflow-x-auto gap-1.5 px-4 py-2 whitespace-nowrap scrollbar-thin">
            <button onClick={() => setShowFilterSheet(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--blue-soft)] text-[var(--blue)] border border-[var(--blue-border)] shrink-0">
              {flightCatLabel}
            </button>
            <button onClick={() => setShowFilterSheet(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--gold-soft)] text-[var(--gold)] border border-[var(--gold-border)] shrink-0">
              {budgetLabel}
            </button>
            {priorityCity !== "all" && (
              <button onClick={() => setShowFilterSheet(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--teal-border)] shrink-0">
                {priorityCity}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="max-w-5xl mx-auto px-4 pt-5 pb-20 md:pb-8 space-y-5">
        {weekendsLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* View toggle + desktop filters */}
            {hasData && (
              <div className="space-y-4">
                {/* View toggle */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)] w-fit">
                  <button
                    onClick={() => setShowComboView(true)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-150 ${
                      showComboView
                        ? "bg-[var(--blue)] text-white shadow-sm"
                        : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setShowComboView(false)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-150 ${
                      !showComboView
                        ? "bg-[var(--blue)] text-white shadow-sm"
                        : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                    }`}
                  >
                    Ranked List
                  </button>
                </div>

                {/* Desktop filters */}
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
              </div>
            )}

            {/* Content area */}
            {!hasData ? (
              <div className="text-center py-20">
                <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-[var(--surface-1)] border border-[var(--border-default)] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--text-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <h2 className="text-base font-heading font-semibold text-[var(--text-1)] mb-1">
                  No Data Yet
                </h2>
                <p className="text-sm text-[var(--text-2)] max-w-sm mx-auto mb-4">
                  Click &quot;Refresh&quot; to trigger the first data scrape, or wait for the scheduled run.
                </p>
                <p className="text-xs text-[var(--text-3)] font-mono tabular-nums">
                  {dateRanges.length} available weekends
                </p>
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
              <div className="space-y-2">
                <div className="text-xs text-[var(--text-2)] font-mono">
                  {weekendScores.length} weekends &middot; {SCORING_ALGORITHMS.find(a => a.value === scoringAlgorithm)?.label ?? scoringAlgorithm}
                  {priorityCity !== "all" ? ` &middot; ${priorityCity}` : ""}
                </div>
                <div className="space-y-1.5">
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
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Modals & overlays ── */}
      <DataUpdateModal open={showUpdateModal} onRefresh={handleDataRefresh} />

      <MobileNav activeTab={mobileTab} onTabChange={handleMobileTab} activeFilterCount={activeFilterCount} />

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

      {/* Mobile config */}
      {showMobileConfig && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileConfig(false)} />
          <div className="absolute inset-0 bg-[var(--surface-0)] overflow-y-auto scrollbar-thin">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-12 glass border-b border-[var(--border-default)]">
              <h2 className="text-sm font-heading font-semibold text-[var(--text-1)]">Settings</h2>
              <button onClick={() => setShowMobileConfig(false)}
                className="p-2 -mr-2 text-[var(--text-3)] hover:text-[var(--text-1)] min-w-[44px] min-h-[44px] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 pb-20">
              <ConfigModal
                cities={cities}
                excludedDates={excludedDates}
                destinationAirport={destinationAirport}
                destinationCity={destinationCity}
                onSave={(newCities, newExcluded, newDest, newDestCity) => {
                  handleConfigSave(newCities, newExcluded, newDest, newDestCity);
                  setShowMobileConfig(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile jobs */}
      {showMobileJobs && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileJobs(false)} />
          <div className="absolute inset-0 bg-[var(--surface-0)] overflow-y-auto scrollbar-thin">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-12 glass border-b border-[var(--border-default)]">
              <h2 className="text-sm font-heading font-semibold text-[var(--text-1)]">Job History</h2>
              <button onClick={() => setShowMobileJobs(false)}
                className="p-2 -mr-2 text-[var(--text-3)] hover:text-[var(--text-1)] min-w-[44px] min-h-[44px] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 pb-20">
              <JobsPanel runs={scrapeData?.runs ?? []} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
