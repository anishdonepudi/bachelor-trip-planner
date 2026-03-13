"use client";

import { useMemo, useState } from "react";
import {
  CityConfig,
  WeekendData,
  DateRange,
  WeekendScore,
  FlightCategory,
  BudgetTier,
  ScoringAlgorithm,
} from "@/lib/types";
import { FLIGHT_CATEGORIES, BUDGET_TIERS, TOTAL_PEOPLE } from "@/lib/constants";
import { scoreAllWeekends } from "@/lib/scoring";
import { formatDateRangeDisplay } from "@/lib/date-ranges";
import { ScoreBadge } from "./ScoreBadge";

interface ComboSummaryProps {
  weekendData: WeekendData;
  dateRanges: DateRange[];
  cities: CityConfig[];
  priorityCity: string;
  scoringAlgorithm: ScoringAlgorithm;
  activeFlightCategory: FlightCategory;
  activeBudgetTier: BudgetTier;
  onSelectCombo: (flightCategory: FlightCategory, budgetTier: BudgetTier) => void;
}

function getTierColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-[var(--color-indigo)]";
  if (score >= 40) return "text-amber-400";
  if (score >= 20) return "text-orange-400";
  return "text-red-400";
}

function getRankIcon(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export function ComboSummary({
  weekendData,
  dateRanges,
  cities,
  priorityCity,
  scoringAlgorithm,
  activeFlightCategory,
  activeBudgetTier,
  onSelectCombo,
}: ComboSummaryProps) {
  const [mobileFlightCat, setMobileFlightCat] = useState<FlightCategory>(activeFlightCategory);

  const comboResults = useMemo(() => {
    const results: {
      flightCategory: FlightCategory;
      flightLabel: string;
      budgetTier: BudgetTier;
      budgetLabel: string;
      budgetRange: string;
      top3: WeekendScore[];
    }[] = [];

    for (const fc of FLIGHT_CATEGORIES) {
      for (const bt of BUDGET_TIERS) {
        const scored = scoreAllWeekends(
          dateRanges,
          weekendData.flights ?? [],
          weekendData.flightOptions ?? [],
          weekendData.airbnbListings ?? [],
          fc.value,
          bt.value,
          cities,
          priorityCity,
          scoringAlgorithm
        );
        results.push({
          flightCategory: fc.value,
          flightLabel: fc.label,
          budgetTier: bt.value,
          budgetLabel: bt.label,
          budgetRange: bt.range,
          top3: scored.slice(0, 3),
        });
      }
    }

    return results;
  }, [weekendData, dateRanges, cities, priorityCity, scoringAlgorithm]);

  const mobileFilteredCombos = comboResults.filter(
    (r) => r.flightCategory === mobileFlightCat
  );

  const [showPopular, setShowPopular] = useState(false);

  // Count how many times each weekend appears across all combo top-3 lists
  const popularWeekends = useMemo(() => {
    const counts = new Map<string, { dateRange: DateRange; count: number }>();
    for (const combo of comboResults) {
      for (const ws of combo.top3) {
        const id = ws.dateRange.id;
        const existing = counts.get(id);
        if (existing) {
          existing.count++;
        } else {
          counts.set(id, { dateRange: ws.dateRange, count: 1 });
        }
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [comboResults]);

  const totalCombos = FLIGHT_CATEGORIES.length * BUDGET_TIERS.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <span>
          Top 3 weekends for every flight &times; stay combo
          {priorityCity !== "all" && (
            <span> &middot; ranked by {priorityCity}</span>
          )}
        </span>
        <button
          onClick={() => setShowPopular(!showPopular)}
          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
            showPopular
              ? "bg-[oklch(0.55_0.2_265_/_15%)] text-[oklch(0.7_0.15_265)] border border-[oklch(0.55_0.2_265_/_30%)]"
              : "bg-[var(--color-surface-elevated)]/60 text-[var(--color-text-secondary)] border border-[var(--border)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          Most Popular
        </button>
      </div>

      {/* Popular weekends panel */}
      {showPopular && (
        <div className="rounded-2xl border border-[oklch(0.55_0.2_265_/_30%)] bg-[oklch(0.55_0.2_265_/_5%)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[oklch(0.55_0.2_265_/_10%)] border-b border-[oklch(0.55_0.2_265_/_20%)] flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[oklch(0.7_0.15_265)] uppercase tracking-wider font-heading">
              Weekends by frequency across {totalCombos} combos
            </h3>
            <button onClick={() => setShowPopular(false)} className="text-[oklch(0.55_0.2_265_/_60%)] hover:text-[oklch(0.7_0.15_265)] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="divide-y divide-[oklch(0.55_0.2_265_/_10%)]">
            {popularWeekends.map(({ dateRange, count }) => {
              const departDay = new Date(dateRange.departDate + "T00:00:00")
                .toLocaleDateString("en-US", { weekday: "short" });
              const returnDay = new Date(dateRange.returnDate + "T00:00:00")
                .toLocaleDateString("en-US", { weekday: "short" });
              return (
                <div key={dateRange.id} className="flex items-center gap-3 px-4 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[var(--color-text-primary)]">
                      {formatDateRangeDisplay(dateRange.departDate, dateRange.returnDate)}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)] ml-2">
                      {departDay} – {returnDay}
                    </span>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className="text-sm font-bold font-mono text-[oklch(0.7_0.15_265)]">{count}</span>
                    <span className="text-[10px] text-[oklch(0.55_0.2_265_/_70%)]">/ {totalCombos}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== MOBILE LAYOUT ===== */}
      <div className="sm:hidden space-y-4">
        {/* Flight category tabs */}
        <div className="flex overflow-x-auto gap-2 -mx-4 px-4 pb-1 scrollbar-thin">
          {FLIGHT_CATEGORIES.map((fc) => (
            <button
              key={fc.value}
              onClick={() => setMobileFlightCat(fc.value)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                mobileFlightCat === fc.value
                  ? "bg-[oklch(0.55_0.2_265_/_15%)] text-[oklch(0.7_0.15_265)] border border-[oklch(0.55_0.2_265_/_30%)]"
                  : "bg-[var(--color-surface-elevated)]/60 text-[var(--color-text-secondary)] border border-[var(--border)]"
              }`}
            >
              {fc.label}
            </button>
          ))}
        </div>

        {/* Budget tier sections */}
        {mobileFilteredCombos.map((combo) => (
          <div
            key={combo.budgetTier}
            className="rounded-2xl border border-[var(--border)] bg-[var(--color-surface-base)]/30 overflow-hidden"
          >
            {/* Budget tier header */}
            <button
              className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                combo.flightCategory === activeFlightCategory && combo.budgetTier === activeBudgetTier
                  ? "bg-[oklch(0.55_0.2_265_/_8%)]"
                  : "hover:bg-[var(--color-surface-elevated)]/30"
              }`}
              onClick={() => onSelectCombo(combo.flightCategory, combo.budgetTier)}
            >
              <div>
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {combo.budgetLabel}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)] ml-2">
                  {combo.budgetRange}
                </span>
              </div>
              <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Top 3 weekends */}
            {combo.top3.length === 0 ? (
              <div className="px-4 py-3 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--color-text-tertiary)] italic">No data for this combo</p>
              </div>
            ) : (
              <div className="border-t border-[var(--border)]">
                {combo.top3.map((ws, i) => {
                  const avgPP = ws.totalGroupCost !== Infinity
                    ? Math.round(ws.totalGroupCost / TOTAL_PEOPLE)
                    : null;
                  const selectedCost = priorityCity !== "all"
                    ? ws.perCityCosts.find((c) => c.city === priorityCity)
                    : null;
                  const displayCost = selectedCost?.perPersonTotal != null
                    ? Math.round(selectedCost.perPersonTotal)
                    : avgPP;

                  const departDay = new Date(ws.dateRange.departDate + "T00:00:00")
                    .toLocaleDateString("en-US", { weekday: "short" });
                  const returnDay = new Date(ws.dateRange.returnDate + "T00:00:00")
                    .toLocaleDateString("en-US", { weekday: "short" });

                  return (
                    <div
                      key={ws.dateRange.id}
                      className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-b-0"
                    >
                      {/* Rank */}
                      <span className="text-base w-7 text-center shrink-0">
                        {getRankIcon(i + 1)}
                      </span>

                      {/* Date info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {formatDateRangeDisplay(ws.dateRange.departDate, ws.dateRange.returnDate)}
                        </div>
                        <div className="text-[11px] text-[var(--color-text-secondary)]">
                          {departDay} – {returnDay}
                        </div>
                      </div>

                      {/* Price + score indicator */}
                      <div className="text-right shrink-0">
                        {displayCost != null ? (
                          <>
                            <div className="text-sm font-bold font-mono text-[var(--color-amber)]">
                              ${displayCost}
                            </div>
                            <div className={`text-[10px] font-medium ${getTierColor(ws.score)}`}>
                              {selectedCost ? "per person" : "avg pp"}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ===== DESKTOP LAYOUT ===== */}
      <div className="hidden sm:grid grid-cols-2 gap-4">
        {FLIGHT_CATEGORIES.map((fc) => {
          const combos = comboResults.filter(
            (r) => r.flightCategory === fc.value
          );
          return (
            <div key={fc.value} className={`rounded-2xl border bg-[var(--color-surface-deep)]/50 overflow-hidden ${
              fc.value === activeFlightCategory ? "border-[oklch(0.55_0.2_265_/_40%)] shadow-[var(--glow-indigo)]" : "border-[var(--border)]"
            }`}>
              <div className="px-4 py-3 bg-[var(--color-surface-base)]/50 border-b border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] font-heading">
                  {fc.label}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">{fc.description}</p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {combos.map((combo) => (
                  <button
                    key={combo.budgetTier}
                    className={`w-full px-4 py-3 text-left hover:bg-[var(--color-surface-base)]/40 transition-colors cursor-pointer ${
                      combo.flightCategory === activeFlightCategory && combo.budgetTier === activeBudgetTier
                        ? "bg-[oklch(0.55_0.2_265_/_8%)]"
                        : ""
                    }`}
                    onClick={() => onSelectCombo(combo.flightCategory, combo.budgetTier)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">
                        {combo.budgetLabel}
                      </span>
                      <span className="text-xs text-[var(--color-text-tertiary)]">
                        {combo.budgetRange}
                      </span>
                      <svg className="w-3 h-3 text-[var(--color-text-tertiary)] ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    {combo.top3.length === 0 ? (
                      <p className="text-xs text-[var(--color-text-tertiary)] italic">No data</p>
                    ) : (
                      <div className="space-y-2">
                        {combo.top3.map((ws, i) => (
                          <WeekendPill
                            key={ws.dateRange.id}
                            weekend={ws}
                            rank={i + 1}
                            priorityCity={priorityCity}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekendPill({
  weekend,
  rank,
  priorityCity,
}: {
  weekend: WeekendScore;
  rank: number;
  priorityCity: string;
}) {
  const { dateRange, score, totalGroupCost, perCityCosts, cityAverages } = weekend;

  const selectedCityCost =
    priorityCity !== "all"
      ? perCityCosts.find((c) => c.city === priorityCity)
      : null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--color-surface-base)]/60 border border-[var(--border)]">
      <ScoreBadge
        score={score}
        rank={rank}
        totalGroupCost={totalGroupCost}
        perCityCosts={perCityCosts}
        cityAverages={cityAverages}
      />
      <div className="flex-1 min-w-0 text-center">
        <div className="text-xs font-medium text-[var(--color-text-primary)] truncate">
          {formatDateRangeDisplay(dateRange.departDate, dateRange.returnDate)}
        </div>
        <div className="text-[10px] text-[var(--color-text-secondary)]">
          {new Date(dateRange.departDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })} – {new Date(dateRange.returnDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
        </div>
      </div>
      {selectedCityCost && selectedCityCost.perPersonTotal != null && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[oklch(0.75_0.18_85_/_10%)] border border-[oklch(0.75_0.18_85_/_20%)] shrink-0">
          <span className="text-[10px] text-[var(--color-text-secondary)]">
            ${selectedCityCost.flightCost ?? 0}
          </span>
          <span className="text-[var(--color-text-tertiary)] text-[10px]">+</span>
          <span className="text-[10px] text-[var(--color-text-secondary)]">
            ${Math.round(selectedCityCost.stayCost)}
          </span>
          <span className="text-[var(--color-text-tertiary)] text-[10px]">=</span>
          <span className="text-xs font-semibold font-mono text-[var(--color-amber)]">
            ${Math.round(selectedCityCost.perPersonTotal)}
          </span>
          <span className="text-[10px] text-[oklch(0.75_0.18_85_/_70%)]">pp</span>
        </div>
      )}
    </div>
  );
}
