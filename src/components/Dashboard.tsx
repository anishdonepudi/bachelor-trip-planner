"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import useSWR from "swr";
import {
  FlightCategory,
  BudgetTier,
  ScoringAlgorithm,
  CityConfig,
  WeekendData,
  RankChangeMap,
} from "@/lib/types";
import { generateDateRanges } from "@/lib/date-ranges";
import { scoreAllWeekends } from "@/lib/scoring";
import {
  savePreviousWeekendData,
  loadPreviousWeekendData,
  getPreviousDataTimestamp,
  isLocalStorageStale,
  fetchPreviousWeekendDataFromDB,
} from "@/lib/rank-history";
import { computeRankChanges } from "@/lib/rank-changes";
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
import { RankChangeIndicator } from "./ScoreBadge";

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
  const [mobileTab, setMobileTab] = useState<"overview" | "ranked" | "configure">("overview");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showMobileConfig, setShowMobileConfig] = useState(false);
  const [rankChangeVersion, setRankChangeVersion] = useState(0);
  const [collapsedCardHeight, setCollapsedCardHeight] = useState(0);
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
    const runningJobCount = activeRun.jobs.filter((j) => j.status === "running").length;
    const queuedJobCount = activeRun.jobs.filter((j) => j.status === "queued").length;
    const sp = scrapeData?.scraperProgress;

    let progress: number;
    if (sp && sp.total > 0 && runningJobCount > 0) {
      // Weighted: completed jobs as 100% + running jobs' internal progress
      // Use expectedJobCount as denominator so unstarted jobs (finalize, etc.) are accounted for
      const internalRatio = sp.completed / sp.total;
      const doneWeight = completedJobCount;
      const runningWeight = internalRatio * runningJobCount;
      progress = Math.round(((doneWeight + runningWeight) / expectedJobCount) * 100);
    } else {
      // Fallback: job-level only
      progress = Math.round((completedJobCount / expectedJobCount) * 100);
    }

    // Never show 100% while jobs are still running or queued
    if ((runningJobCount > 0 || queuedJobCount > 0) && progress >= 100) {
      progress = 99;
    }
    return progress;
  }, [activeRun, completedJobCount, expectedJobCount, scrapeData?.scraperProgress]);

  useEffect(() => {
    if (scrapeTriggered && runningJobs.length > 0) setScrapeTriggered(false);
  }, [scrapeTriggered, runningJobs.length]);

  const handleScrapeTriggered = useCallback(() => {
    setScrapeTriggered(true);
    setTimeout(() => mutateScrape(), 5000);
    setTimeout(() => mutateScrape(), 15000);
  }, [mutateScrape]);

  const modalCooldownUntil = useRef<number>(0);

  useEffect(() => {
    if (!scrapeData?.lastFlightUpdate) return;
    if (Date.now() < modalCooldownUntil.current) return;
    if (initialLastUpdated.current === undefined) {
      initialLastUpdated.current = scrapeData.lastFlightUpdate;
    } else if (scrapeData.lastFlightUpdate !== initialLastUpdated.current) {
      if (weekendData) {
        savePreviousWeekendData(weekendData);
        setRankChangeVersion((v) => v + 1);
      }
      setShowUpdateModal(true);
    }
  }, [scrapeData?.lastFlightUpdate, weekendData]);

  const handleDataRefresh = useCallback(async () => {
    setConfigChanged(false);
    setScrapeTriggered(false);
    initialLastUpdated.current = scrapeData?.lastFlightUpdate ?? null;
    modalCooldownUntil.current = Date.now() + 60_000; // ignore changes for 60s after dismissing
    // Await the data fetch — modal stays visible until data is ready,
    // then fades out to reveal the new content underneath
    await mutateWeekends();
    mutateScrape();
    // Don't setShowUpdateModal(false) here — modal handles its own fade-out
    // and calls onDismissed when the transition completes
  }, [scrapeData?.lastFlightUpdate, mutateWeekends, mutateScrape]);

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

  // Rank changes: load previous data and compute deltas
  // Synchronous path: localStorage (instant, same render cycle)
  const localPreviousData = useMemo(() => {
    void rankChangeVersion; // re-read when data is saved
    if (!weekendData) return null;
    const localData = loadPreviousWeekendData();
    if (!localData) return null;
    if (isLocalStorageStale(weekendData, localData)) return null;
    return localData;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankChangeVersion, weekendData]);

  const localRankChangeSince = useMemo(() => {
    void rankChangeVersion;
    if (!localPreviousData) return null;
    return getPreviousDataTimestamp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankChangeVersion, localPreviousData]);

  // Async fallback: DB fetch only when localStorage is stale/missing
  const [dbPreviousData, setDbPreviousData] = useState<{ data: WeekendData; timestamp: string } | null>(null);
  const dbFetchedRef = useRef(false);

  useEffect(() => {
    if (localPreviousData || !weekendData) return; // localStorage worked, skip DB
    if (dbFetchedRef.current) {
      // DB already fetched with no result — seed localStorage for next session
      if (!loadPreviousWeekendData()) {
        savePreviousWeekendData(weekendData);
        setRankChangeVersion((v) => v + 1);
      }
      return;
    }
    dbFetchedRef.current = true;
    fetchPreviousWeekendDataFromDB().then((result) => {
      if (result && !isLocalStorageStale(weekendData, result.data)) {
        setDbPreviousData(result);
      } else if (!loadPreviousWeekendData()) {
        savePreviousWeekendData(weekendData);
        setRankChangeVersion((v) => v + 1);
      }
    });
  }, [weekendData, localPreviousData]);

  // Use whichever source has data (localStorage is preferred — instant)
  const previousWeekendData = localPreviousData ?? dbPreviousData?.data ?? null;
  const rankChangeSince = localRankChangeSince ?? dbPreviousData?.timestamp ?? null;

  const rankChangeMap: RankChangeMap = useMemo(() => {
    if (!previousWeekendData || !weekendScores.length) return {};
    return computeRankChanges(
      previousWeekendData, weekendScores, dateRanges,
      flightCategory, budgetTier, cities, priorityCity, scoringAlgorithm
    );
  }, [previousWeekendData, weekendScores, dateRanges, flightCategory, budgetTier, cities, priorityCity, scoringAlgorithm]);

  const hasRankChanges = useMemo(() => {
    const values = Object.values(rankChangeMap);
    return values.length > 0 && values.some((v) => v.rankDelta !== 0);
  }, [rankChangeMap]);


  const hasData = weekendData && ((weekendData.flights?.length ?? 0) > 0 || (weekendData.airbnbListings?.length ?? 0) > 0);

  const handleMobileTab = (tab: "overview" | "ranked" | "configure") => {
    if (tab === "configure") {
      setShowMobileConfig(true);
    } else {
      setMobileTab(tab);
      setShowComboView(tab === "overview");
    }
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

      {/* ── Mobile filter chips (hidden on desktop) ── */}

      {/* ── Main content ── */}
      <main className="max-w-5xl mx-auto px-4 pt-2 md:pt-5 pb-20 md:pb-8 space-y-2 md:space-y-5">
        {weekendsLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* View toggle + desktop filters */}
            {hasData && (
              <div className="md:space-y-4">
                {/* View toggle (desktop only — mobile uses bottom nav) */}
                <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)] w-fit">
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
              <div key="overview" className="animate-fade-in-up" style={{ animationDuration: "200ms" }}>
              <ComboSummary
                weekendData={weekendData}
                dateRanges={dateRanges}
                cities={cities}
                priorityCity={priorityCity}
                scoringAlgorithm={scoringAlgorithm}
                activeFlightCategory={flightCategory}
                activeBudgetTier={budgetTier}
                previousWeekendData={previousWeekendData}
                rankChangeSince={rankChangeSince}
                onSelectCombo={(fc, bt) => {
                  setFlightCategory(fc);
                  setBudgetTier(bt);
                  setShowComboView(false);
                  setMobileTab("ranked");
                }}
              />
              </div>
            ) : (
              <div key="ranked" className="space-y-2 animate-fade-in-up" style={{ animationDuration: "200ms" }}>
                <div className="text-xs text-[var(--text-2)] font-mono">
                  {weekendScores.length} weekends &middot; {SCORING_ALGORITHMS.find(a => a.value === scoringAlgorithm)?.label ?? scoringAlgorithm}
                  {priorityCity !== "all" ? ` &middot; ${priorityCity}` : ""}
                </div>
                <div className={`grid gap-y-1.5 ${hasRankChanges ? "grid-cols-1 md:grid-cols-[2rem_1fr] md:gap-x-1.5 md:-ml-[calc(2rem+0.375rem)]" : "grid-cols-1"}`}>
                  {weekendScores.map((weekend, i) => (
                    <React.Fragment key={weekend.dateRange.id}>
                      {hasRankChanges && (
                        <div className="relative self-stretch hidden md:block">
                          {collapsedCardHeight > 0 && (
                            <div
                              className="absolute inset-x-0 top-0 flex justify-end items-center"
                              style={{ height: collapsedCardHeight }}
                            >
                              <RankChangeIndicator info={rankChangeMap[weekend.dateRange.id]} sinceTimestamp={rankChangeSince} />
                            </div>
                          )}
                        </div>
                      )}
                      <WeekendCard
                        weekend={weekend}
                        rank={i + 1}
                        flightCategory={flightCategory}
                        budgetTier={budgetTier}
                        priorityCity={priorityCity}
                        rankChangeInfo={rankChangeMap[weekend.dateRange.id]}
                        rankChangeSince={rankChangeSince}
                        onCollapsedHeight={i === 0 ? setCollapsedCardHeight : undefined}
                      />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Modals & overlays ── */}
      <DataUpdateModal open={showUpdateModal} onRefresh={handleDataRefresh} onDismissed={() => setShowUpdateModal(false)} />

      {/* Mobile filter badge — floating above bottom nav */}
      {hasData && !weekendsLoading && (
        <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 md:hidden pointer-events-none">
          <div className="flex justify-center pb-2 pointer-events-auto">
            <button
              onClick={() => setShowFilterSheet(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium bg-[var(--surface-0)] text-[var(--text-1)] border border-[var(--border-hover)] shadow-lg backdrop-blur-sm min-h-[40px] transition-all duration-200 active:scale-95"
            >
              <svg className="w-4 h-4 text-[var(--text-2)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              <span>{flightCatLabel}</span>
              <span className="text-[var(--text-3)]">&middot;</span>
              <span>{budgetLabel}</span>
              {priorityCity !== "all" && (
                <>
                  <span className="text-[var(--text-3)]">&middot;</span>
                  <span>{priorityCity}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <MobileNav activeTab={mobileTab} onTabChange={handleMobileTab} />

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

      {/* Mobile configure — bottom sheet style */}
      {showMobileConfig && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowMobileConfig(false)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-xl bg-[var(--surface-0)] border-t border-[var(--border-default)] shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="w-8 h-1 rounded-full bg-[var(--surface-3)]" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2.5 border-b border-[var(--border-default)] shrink-0">
              <h2 className="text-sm font-heading font-semibold text-[var(--text-1)]">Configure</h2>
              <button onClick={() => setShowMobileConfig(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors duration-150"
                aria-label="Close configure">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] scrollbar-thin">
              <ConfigModal
                cities={cities}
                excludedDates={excludedDates}
                destinationAirport={destinationAirport}
                destinationCity={destinationCity}
                onSave={(newCities, newExcluded, newDest, newDestCity) => {
                  handleConfigSave(newCities, newExcluded, newDest, newDestCity);
                  setShowMobileConfig(false);
                }}
                inlineMode
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
