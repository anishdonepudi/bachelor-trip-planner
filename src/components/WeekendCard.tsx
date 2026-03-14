"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { WeekendScore, FlightCategory, BudgetTier, RankChangeInfo, CityStats } from "@/lib/types";
import { FLIGHT_CATEGORIES, TOTAL_PEOPLE } from "@/lib/constants";
import { formatDateRangeDisplay } from "@/lib/date-ranges";
import { ScoreBadge } from "./ScoreBadge";
import { FlightSummary } from "./FlightSummary";
import { FlightAllOptions } from "./FlightAllOptions";
import { AirbnbGrid } from "./AirbnbGrid";
import { CostBreakdownTable } from "./CostBreakdown";

interface WeekendCardProps {
  weekend: WeekendScore;
  rank: number;
  flightCategory: FlightCategory;
  budgetTier: BudgetTier;
  priorityCity?: string;
  rankChangeInfo?: RankChangeInfo;
  rankChangeSince?: string | null;
  onCollapsedHeight?: (height: number) => void;
}

type DetailTab = "flights" | "stays" | "costs";

function getTierColor(score: number): string {
  if (score >= 80) return "var(--teal)";
  if (score >= 60) return "var(--blue)";
  if (score >= 40) return "var(--gold)";
  if (score >= 20) return "var(--orange)";
  return "var(--red)";
}

function getTierLabel(score: number): string {
  if (score >= 80) return "Great";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Low";
  return "Poor";
}

function getRating(perPerson: number, stats: CityStats): { label: string; cls: string } {
  const z = (perPerson - stats.mean) / stats.std;
  if (z <= -0.5) return { label: "Good", cls: "text-[var(--teal)]" };
  if (z >= 0.5) return { label: "Bad", cls: "text-[var(--red)]" };
  return { label: "Avg", cls: "text-[var(--text-2)]" };
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function DeltaSpan({ value, lowerIsBetter = false, prefix = "$" }: { value: number; lowerIsBetter?: boolean; prefix?: string }) {
  if (value === 0) return null;
  const good = lowerIsBetter ? value < 0 : value > 0;
  return (
    <span className={good ? " text-[var(--teal)]" : " text-[var(--red)]"}>
      {" "}{value > 0 ? "+" : "-"}{prefix}{Math.abs(value).toLocaleString()}
    </span>
  );
}

export function WeekendCard({ weekend, rank, flightCategory, budgetTier, priorityCity, rankChangeInfo, rankChangeSince, onCollapsedHeight }: WeekendCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("flights");
  const [showScoreSheet, setShowScoreSheet] = useState(false);
  const [showRankChangeSheet, setShowRankChangeSheet] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onCollapsedHeight && cardRef.current && !expanded) {
      onCollapsedHeight(cardRef.current.offsetHeight);
    }
  }, [onCollapsedHeight, expanded]);
  const { dateRange, score, totalGroupCost, perCityCosts, cityAverages } = weekend;

  const selectedCityCost = priorityCity && priorityCity !== "all"
    ? perCityCosts.find((c) => c.city === priorityCity)
    : null;

  const categoryLabel = FLIGHT_CATEGORIES.find((c) => c.value === flightCategory)?.label ?? flightCategory;
  const cities = perCityCosts.map((c) => c.city);

  const departDay = new Date(dateRange.departDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
  const returnDay = new Date(dateRange.returnDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });

  const villaCount = weekend.airbnbListings.filter((l) => l.budget_tier === budgetTier).length;
  const avgPerPerson = totalGroupCost !== Infinity ? Math.round(totalGroupCost / TOTAL_PEOPLE) : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const depart = new Date(dateRange.departDate + "T00:00:00");
  const daysUntil = Math.ceil((depart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const tierColor = getTierColor(score);

  const TABS: { id: DetailTab; label: string }[] = [
    { id: "flights", label: "Flights" },
    { id: "stays", label: `Stays (${villaCount})` },
    { id: "costs", label: "Costs" },
  ];

  return (
    <div
      ref={cardRef}
      className={`rounded-lg border border-[var(--border-default)] bg-[var(--surface-0)] hover:border-[var(--border-hover)] transition-all duration-200 ${expanded ? "overflow-hidden" : ""}`}
      style={{ borderLeftWidth: "3px", borderLeftColor: tierColor }}
    >
      {/* Mobile layout — polished compact card */}
      <div className="sm:hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left px-3.5 pt-3 pb-1 hover:bg-[var(--surface-1)] transition-colors duration-150"
        >
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex flex-col items-center justify-center min-w-[24px]" style={{ color: tierColor }}>
              <span className="text-[16px] font-bold font-mono leading-none">{rank}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-heading font-semibold text-[var(--text-1)] truncate leading-snug">
                {formatDateRangeDisplay(dateRange.departDate, dateRange.returnDate)}
              </h3>
              <div className="flex items-center gap-1 mt-0.5 text-[12px] text-[var(--text-3)]">
                <span>{departDay} – {returnDay}</span>
                <span>·</span>
                <span className="font-mono tabular-nums">{daysUntil > 0 ? `${daysUntil}d away` : daysUntil === 0 ? "Today" : "Past"}</span>
              </div>
            </div>
            {avgPerPerson !== null && (
              <div className="text-right shrink-0">
                <div className="text-[17px] font-bold font-mono tabular-nums text-[var(--gold)] leading-tight">${avgPerPerson}</div>
                <div className="text-[10px] text-[var(--text-3)] leading-tight mt-0.5">per person</div>
              </div>
            )}
            <svg className={`w-5 h-5 text-[var(--text-3)] transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Meta pills — outside button to avoid nested buttons */}
        <div className="flex items-center gap-1.5 flex-wrap px-3.5 pb-3 pt-1 ml-[36px]">
          {rankChangeInfo && rankChangeInfo.rankDelta !== 0 && (
            <button
              onClick={() => setShowRankChangeSheet(true)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono tabular-nums border active:scale-95 transition-transform ${
                rankChangeInfo.rankDelta === null
                  ? "bg-[var(--blue-soft)] text-[var(--blue)] border-[var(--blue-border)]"
                  : rankChangeInfo.rankDelta > 0
                    ? "bg-[var(--teal-soft)] text-[var(--teal)] border-[var(--teal-border)]"
                    : "bg-[var(--red-soft)] text-[var(--red)] border-[var(--red-border)]"
              }`}
            >
              {rankChangeInfo.rankDelta === null ? "NEW" : rankChangeInfo.rankDelta > 0 ? `▲${rankChangeInfo.rankDelta}` : `▼${Math.abs(rankChangeInfo.rankDelta)}`}
              <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setShowScoreSheet(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-default)] active:scale-95 transition-transform"
          >
            Score: {score}
            <svg className="w-3 h-3 text-[var(--text-3)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-default)]">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            {villaCount} stays
          </span>
        </div>
      </div>

      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left hover:bg-[var(--surface-1)] transition-colors duration-150"
      >
        {/* Desktop layout - single compact row */}
        <div className="hidden sm:flex items-center gap-4 px-4 py-3">
          <ScoreBadge score={score} rank={rank} totalGroupCost={totalGroupCost} perCityCosts={perCityCosts} cityAverages={cityAverages} />

          <div className="min-w-0">
            <h3 className="text-sm font-heading font-semibold text-[var(--text-1)]">
              {formatDateRangeDisplay(dateRange.departDate, dateRange.returnDate)}
            </h3>
            <span className="text-[11px] text-[var(--text-3)]">{departDay} - {returnDay}</span>
          </div>

          <div className="flex-1" />

          {/* Per-city cost if selected */}
          {selectedCityCost && selectedCityCost.perPersonTotal != null && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[var(--text-3)] font-mono tabular-nums">${selectedCityCost.flightCost ?? 0}</span>
              <span className="text-[var(--text-3)]">+</span>
              <span className="text-[var(--text-3)] font-mono tabular-nums">${Math.round(selectedCityCost.stayCost)}</span>
              <span className="text-[var(--text-3)]">=</span>
              <span className="text-sm font-semibold font-mono tabular-nums text-[var(--gold)]">${Math.round(selectedCityCost.perPersonTotal)}</span>
              <span className="text-[var(--text-3)]">pp</span>
            </div>
          )}

          {/* Avg per person */}
          {avgPerPerson !== null && !selectedCityCost && (
            <span className="text-sm font-semibold font-mono tabular-nums text-[var(--gold)]">${avgPerPerson}/pp</span>
          )}

          {/* Meta pills */}
          <span className="text-[11px] font-mono tabular-nums text-[var(--text-2)] px-2 py-1 rounded bg-[var(--surface-1)]">
            {villaCount} stays
          </span>
          <span className="text-[11px] font-mono tabular-nums text-[var(--text-2)] px-2 py-1 rounded bg-[var(--surface-1)]">
            {daysUntil > 0 ? `${daysUntil}d` : daysUntil === 0 ? "Today" : "Past"}
          </span>

          <svg className={`w-4 h-4 text-[var(--text-3)] transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded detail panel with tabs */}
      {expanded && (
        <div className="border-t border-[var(--border-default)] animate-fade-in-up">
          {/* Tab bar */}
          <div className="flex border-b border-[var(--border-default)] bg-[var(--surface-1)]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 md:py-2 text-sm md:text-xs font-heading font-semibold uppercase tracking-wider transition-colors duration-150 relative min-h-[44px] md:min-h-0 ${
                  activeTab === tab.id
                    ? "text-[var(--text-1)]"
                    : "text-[var(--text-3)] hover:text-[var(--text-2)]"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--blue)]" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4 space-y-6">
            {activeTab === "flights" && (
              <>
                <FlightSummary
                  perCityCosts={perCityCosts}
                  flightCategoryLabel={categoryLabel}
                  selectedCategory={flightCategory}
                />
                <FlightAllOptions
                  flightOptions={weekend.allFlightOptions}
                  cities={cities}
                  perCityCosts={perCityCosts}
                  selectedCategory={flightCategory}
                />
              </>
            )}
            {activeTab === "stays" && (
              <AirbnbGrid
                listings={weekend.airbnbListings}
                budgetTier={budgetTier}
                departDate={dateRange.departDate}
                returnDate={dateRange.returnDate}
                selectedAirbnbUrl={weekend.selectedAirbnbUrl}
              />
            )}
            {activeTab === "costs" && (
              <CostBreakdownTable
                perCityCosts={perCityCosts}
                totalGroupCost={totalGroupCost}
              />
            )}
          </div>
        </div>
      )}

      {/* Score breakdown bottom sheet (mobile only) */}
      {showScoreSheet && createPortal(
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setShowScoreSheet(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-[var(--surface-0)] rounded-t-2xl border-t border-[var(--border-default)] animate-slide-up max-h-[75vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-[var(--text-3)] opacity-30" />
            </div>
            <div className="px-4 pb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-heading font-semibold text-[var(--text-2)] uppercase tracking-wider text-[10px]">
                  Score Breakdown
                </span>
                <span className="font-mono font-semibold text-sm" style={{ color: tierColor }}>
                  {Math.round(score)} — {getTierLabel(score)}
                </span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--text-3)] text-[10px]">
                    <th className="text-left pb-1 font-medium">City</th>
                    <th className="text-right pb-1 font-medium">Cost</th>
                    <th className="text-right pb-1 font-medium">Avg</th>
                    <th className="text-right pb-1 font-medium">vs Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {perCityCosts.map((c) => {
                    const stats = cityAverages[c.city];
                    const rating = c.perPersonTotal !== null && stats
                      ? getRating(c.perPersonTotal, stats)
                      : null;
                    return (
                      <tr key={c.city} className="text-[var(--text-1)]">
                        <td className="py-1.5 text-[var(--text-2)]">
                          {c.city}
                          {c.people > 1 && <span className="text-[var(--text-3)] ml-0.5">x{c.people}</span>}
                        </td>
                        <td className="py-1.5 text-right font-mono tabular-nums">
                          {c.perPersonTotal !== null ? `$${Math.round(c.perPersonTotal)}` : "-"}
                        </td>
                        <td className="py-1.5 text-right font-mono tabular-nums text-[var(--text-2)]">
                          {stats ? `$${Math.round(stats.mean)}` : "-"}
                        </td>
                        <td className="py-1.5 text-right">
                          {rating && <span className={`font-semibold ${rating.cls}`}>{rating.label}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-2 pt-2 border-t border-[var(--border-hover)] flex justify-between text-xs text-[var(--text-1)]">
                <span className="font-semibold">Total</span>
                <span className="font-mono font-semibold tabular-nums">
                  {totalGroupCost !== Infinity ? `$${totalGroupCost.toLocaleString()}` : "N/A"}
                </span>
              </div>
              {avgPerPerson && (
                <div className="flex justify-between text-xs text-[var(--text-2)] mt-0.5">
                  <span>Avg per person</span>
                  <span className="font-mono tabular-nums">${avgPerPerson}</span>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Rank change bottom sheet (mobile only) */}
      {showRankChangeSheet && rankChangeInfo && rankChangeInfo.rankDelta !== 0 && createPortal(
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setShowRankChangeSheet(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-[var(--surface-0)] rounded-t-2xl border-t border-[var(--border-default)] animate-slide-up max-h-[75vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-[var(--text-3)] opacity-30" />
            </div>
            <div className="px-4 pb-6">
              {(() => {
                const isNew = rankChangeInfo.rankDelta === null;
                const scoreDelta = rankChangeInfo.previousScore !== null
                  ? Math.round(rankChangeInfo.currentScore) - Math.round(rankChangeInfo.previousScore)
                  : null;
                const costDelta = rankChangeInfo.previousCost !== null && rankChangeInfo.previousCost !== Infinity && rankChangeInfo.currentCost !== Infinity
                  ? rankChangeInfo.currentCost - rankChangeInfo.previousCost
                  : null;
                const algo = rankChangeInfo.scoringAlgorithm;
                const showMarketAvg = algo === "zscore";
                const showTotalCost = algo === "lowest_total" || algo === "lowest_per_person" || algo === "fairness";

                return (
                  <>
                    <div className="mb-3">
                      <span className="font-heading font-semibold text-[var(--text-2)] uppercase tracking-wider text-[10px]">
                        {isNew ? "New Weekend" : "Why did this change?"}
                      </span>
                      {rankChangeSince && (
                        <div className="text-[var(--text-3)] text-[10px]">
                          Since last viewed {formatTimeAgo(rankChangeSince)}
                        </div>
                      )}
                    </div>

                    {!isNew && (
                      <div className="space-y-1 mb-3 text-xs">
                        {rankChangeInfo.previousRank !== null && (
                          <div className="flex justify-between text-[var(--text-1)]">
                            <span className="text-[var(--text-3)]">Rank</span>
                            <span className="font-mono tabular-nums">
                              #{rankChangeInfo.previousRank} → #{rankChangeInfo.currentRank}
                            </span>
                          </div>
                        )}
                        {scoreDelta !== null && (
                          <div className="flex justify-between text-[var(--text-1)]">
                            <span className="text-[var(--text-3)]">Score</span>
                            <span className="font-mono tabular-nums">
                              {Math.round(rankChangeInfo.previousScore!)} → {Math.round(rankChangeInfo.currentScore)}
                              <DeltaSpan value={scoreDelta} />
                            </span>
                          </div>
                        )}
                        {showTotalCost && costDelta !== null && (
                          <div className="flex justify-between text-[var(--text-1)]">
                            <span className="text-[var(--text-3)]">Total</span>
                            <span className="font-mono tabular-nums">
                              ${Math.round(rankChangeInfo.previousCost!).toLocaleString()} → ${Math.round(rankChangeInfo.currentCost).toLocaleString()}
                              <DeltaSpan value={Math.round(costDelta)} lowerIsBetter />
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {rankChangeInfo.cityChanges.length > 0 && !isNew && (
                      <div className="border-t border-[var(--border-default)] pt-2">
                        <div className="font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider text-[9px] mb-1">
                          Per-city breakdown
                        </div>
                        <div className="space-y-2 text-xs">
                          {rankChangeInfo.cityChanges.map((cc) => {
                            const flightChanged = cc.previousFlightCost !== null && cc.currentFlightCost !== null && cc.previousFlightCost !== cc.currentFlightCost;
                            const stayChanged = cc.previousStayCost !== null && cc.previousStayCost !== cc.currentStayCost;
                            const flightNew = cc.previousFlightCost === null && cc.currentFlightCost !== null;
                            const flightLost = cc.previousFlightCost !== null && cc.currentFlightCost === null;
                            const ppChanged = cc.previousPerPerson !== null && cc.currentPerPerson !== null && Math.round(cc.previousPerPerson) !== Math.round(cc.currentPerPerson!);
                            const avgChanged = cc.previousCityAvg !== null && cc.currentCityAvg !== null && Math.round(cc.previousCityAvg) !== Math.round(cc.currentCityAvg);
                            const showAvg = showMarketAvg && avgChanged;
                            const hasAnyChange = flightChanged || stayChanged || flightNew || flightLost || ppChanged || showAvg;
                            if (!hasAnyChange) return null;

                            return (
                              <div key={cc.city}>
                                <div className="text-[var(--text-2)] font-medium mb-0.5">{cc.city}</div>
                                {flightNew && (
                                  <div className="flex justify-between text-[var(--text-1)] ml-2">
                                    <span className="text-[var(--text-3)]">Flight</span>
                                    <span className="font-mono tabular-nums text-[var(--blue)]">new ${cc.currentFlightCost}</span>
                                  </div>
                                )}
                                {flightLost && (
                                  <div className="flex justify-between text-[var(--text-1)] ml-2">
                                    <span className="text-[var(--text-3)]">Flight</span>
                                    <span className="font-mono tabular-nums text-[var(--red)]">unavailable</span>
                                  </div>
                                )}
                                {flightChanged && (
                                  <div className="flex justify-between text-[var(--text-1)] ml-2">
                                    <span className="text-[var(--text-3)]">Flight</span>
                                    <span className="font-mono tabular-nums">
                                      ${cc.previousFlightCost} → ${cc.currentFlightCost}
                                      <DeltaSpan value={cc.currentFlightCost! - cc.previousFlightCost!} lowerIsBetter />
                                    </span>
                                  </div>
                                )}
                                {stayChanged && (
                                  <div className="flex justify-between text-[var(--text-1)] ml-2">
                                    <span className="text-[var(--text-3)]">Stay</span>
                                    <span className="font-mono tabular-nums">
                                      ${Math.round(cc.previousStayCost!)} → ${Math.round(cc.currentStayCost)}
                                      <DeltaSpan value={Math.round(cc.currentStayCost - cc.previousStayCost!)} lowerIsBetter />
                                    </span>
                                  </div>
                                )}
                                {ppChanged && (
                                  <div className="flex justify-between text-[var(--text-1)] ml-2">
                                    <span className="text-[var(--text-3)]">Per person</span>
                                    <span className="font-mono tabular-nums">
                                      ${Math.round(cc.previousPerPerson!)} → ${Math.round(cc.currentPerPerson!)}
                                      <DeltaSpan value={Math.round(cc.currentPerPerson! - cc.previousPerPerson!)} lowerIsBetter />
                                    </span>
                                  </div>
                                )}
                                {showAvg && (
                                  <div className="flex justify-between text-[var(--text-1)] ml-2">
                                    <span className="text-[var(--text-3)]">Market avg</span>
                                    <span className="font-mono tabular-nums text-[var(--text-3)]">
                                      ${Math.round(cc.previousCityAvg!)} → ${Math.round(cc.currentCityAvg!)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
