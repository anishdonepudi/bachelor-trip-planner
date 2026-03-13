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
  if (score >= 80) return "text-[var(--teal)]";
  if (score >= 60) return "text-[var(--blue)]";
  if (score >= 40) return "text-[var(--gold)]";
  if (score >= 20) return "text-[var(--orange)]";
  return "text-[var(--red)]";
}

function getRankIcon(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
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
  const [showPopular, setShowPopular] = useState(false);

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
          fc.value, bt.value, cities, priorityCity, scoringAlgorithm
        );
        results.push({
          flightCategory: fc.value, flightLabel: fc.label,
          budgetTier: bt.value, budgetLabel: bt.label, budgetRange: bt.range,
          top3: scored.slice(0, 3),
        });
      }
    }
    return results;
  }, [weekendData, dateRanges, cities, priorityCity, scoringAlgorithm]);

  const mobileFilteredCombos = comboResults.filter((r) => r.flightCategory === mobileFlightCat);

  const popularWeekends = useMemo(() => {
    const counts = new Map<string, { dateRange: DateRange; count: number }>();
    for (const combo of comboResults) {
      for (const ws of combo.top3) {
        const id = ws.dateRange.id;
        const existing = counts.get(id);
        if (existing) existing.count++;
        else counts.set(id, { dateRange: ws.dateRange, count: 1 });
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [comboResults]);

  const totalCombos = FLIGHT_CATEGORIES.length * BUDGET_TIERS.length;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-[var(--text-2)]">
          Top 3 per combo
          {priorityCity !== "all" && <span className="text-[var(--text-3)]"> &middot; {priorityCity}</span>}
        </span>
        <button
          onClick={() => setShowPopular(!showPopular)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-150 ${
            showPopular
              ? "bg-[var(--blue-soft)] text-[var(--blue)] border border-[var(--blue-border)]"
              : "bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-default)] hover:text-[var(--text-1)]"
          }`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          Popular
        </button>
      </div>

      {/* Popular weekends */}
      {showPopular && (
        <div className="rounded-md border border-[var(--blue-border)] bg-[var(--blue-soft)] overflow-hidden">
          <div className="px-3 py-2 bg-[var(--surface-1)] border-b border-[var(--blue-border)] flex items-center justify-between">
            <span className="text-[10px] font-heading font-semibold text-[var(--text-2)] uppercase tracking-wider">
              Frequency across {totalCombos} combos
            </span>
            <button onClick={() => setShowPopular(false)} className="text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors duration-150">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="divide-y divide-[var(--border-default)]">
            {popularWeekends.map(({ dateRange, count }) => {
              const departDay = new Date(dateRange.departDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
              const returnDay = new Date(dateRange.returnDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
              return (
                <div key={dateRange.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[var(--text-1)]">{formatDateRangeDisplay(dateRange.departDate, dateRange.returnDate)}</span>
                    <span className="text-[11px] text-[var(--text-3)] ml-2">{departDay} - {returnDay}</span>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    <span className="text-sm font-bold font-mono tabular-nums text-[var(--blue)]">{count}</span>
                    <span className="text-[10px] text-[var(--text-3)]">/{totalCombos}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== MOBILE ===== */}
      <div className="sm:hidden space-y-3">
        {/* Flight type tabs */}
        <div className="flex overflow-x-auto gap-1.5 -mx-4 px-4 pb-1 scrollbar-thin">
          {FLIGHT_CATEGORIES.map((fc) => (
            <button
              key={fc.value}
              onClick={() => setMobileFlightCat(fc.value)}
              className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                mobileFlightCat === fc.value
                  ? "bg-[var(--blue-soft)] text-[var(--blue)] border border-[var(--blue-border)]"
                  : "bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-default)]"
              }`}
            >
              {fc.label}
            </button>
          ))}
        </div>

        {/* Budget sections */}
        {mobileFilteredCombos.map((combo) => (
          <div key={combo.budgetTier} className="rounded-md border border-[var(--border-default)] bg-[var(--surface-0)] overflow-hidden">
            <button
              className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors duration-150 ${
                combo.flightCategory === activeFlightCategory && combo.budgetTier === activeBudgetTier
                  ? "bg-[var(--blue-soft)]" : "hover:bg-[var(--surface-1)]"
              }`}
              onClick={() => onSelectCombo(combo.flightCategory, combo.budgetTier)}
            >
              <div>
                <span className="text-sm font-semibold text-[var(--text-1)]">{combo.budgetLabel}</span>
                <span className="text-[11px] text-[var(--text-3)] ml-2">{combo.budgetRange}</span>
              </div>
              <svg className="w-3.5 h-3.5 text-[var(--text-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {combo.top3.length === 0 ? (
              <div className="px-3 py-2.5 border-t border-[var(--border-default)]">
                <p className="text-[11px] text-[var(--text-3)] italic">No data</p>
              </div>
            ) : (
              <div className="border-t border-[var(--border-default)] divide-y divide-[var(--border-default)]">
                {combo.top3.map((ws, i) => {
                  const avgPP = ws.totalGroupCost !== Infinity ? Math.round(ws.totalGroupCost / TOTAL_PEOPLE) : null;
                  const selectedCost = priorityCity !== "all" ? ws.perCityCosts.find((c) => c.city === priorityCity) : null;
                  const displayCost = selectedCost?.perPersonTotal != null ? Math.round(selectedCost.perPersonTotal) : avgPP;
                  const departDay = new Date(ws.dateRange.departDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
                  const returnDay = new Date(ws.dateRange.returnDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });

                  return (
                    <div key={ws.dateRange.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="text-[11px] font-mono font-semibold text-[var(--text-3)] w-5 text-right shrink-0">
                        {getRankIcon(i + 1)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--text-1)] truncate">
                          {formatDateRangeDisplay(ws.dateRange.departDate, ws.dateRange.returnDate)}
                        </div>
                        <div className="text-[10px] text-[var(--text-3)]">{departDay} - {returnDay}</div>
                      </div>
                      <div className="text-right shrink-0">
                        {displayCost != null ? (
                          <>
                            <div className="text-sm font-bold font-mono tabular-nums text-[var(--gold)]">${displayCost}</div>
                            <div className={`text-[10px] font-medium ${getTierColor(ws.score)}`}>
                              {selectedCost ? "per person" : "avg pp"}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-[var(--text-3)]">-</span>
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

      {/* ===== DESKTOP: Grid layout ===== */}
      <div className="hidden sm:grid grid-cols-2 gap-3">
        {FLIGHT_CATEGORIES.map((fc) => {
          const combos = comboResults.filter((r) => r.flightCategory === fc.value);
          const isActiveCategory = fc.value === activeFlightCategory;
          return (
            <div
              key={fc.value}
              className={`rounded-lg border overflow-hidden ${
                isActiveCategory
                  ? "border-[var(--blue-border)] shadow-sm"
                  : "border-[var(--border-default)]"
              }`}
            >
              {/* Card header */}
              <div className="px-3 py-2.5 bg-[var(--surface-1)] border-b border-[var(--border-default)]">
                <h3 className="text-sm font-heading font-semibold text-[var(--text-1)]">{fc.label}</h3>
                <p className="text-[11px] text-[var(--text-3)]">{fc.description}</p>
              </div>

              {/* Budget tiers */}
              <div className="divide-y divide-[var(--border-default)]">
                {combos.map((combo) => {
                  const isActive = combo.flightCategory === activeFlightCategory && combo.budgetTier === activeBudgetTier;
                  return (
                    <button
                      key={combo.budgetTier}
                      className={`w-full px-3 py-2.5 text-left hover:bg-[var(--surface-1)] transition-colors duration-150 cursor-pointer ${
                        isActive ? "bg-[var(--blue-soft)]" : ""
                      }`}
                      onClick={() => onSelectCombo(combo.flightCategory, combo.budgetTier)}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium text-[var(--text-1)]">{combo.budgetLabel}</span>
                        <span className="text-[11px] text-[var(--text-3)]">{combo.budgetRange}</span>
                        <svg className="w-3 h-3 text-[var(--text-3)] ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      {combo.top3.length === 0 ? (
                        <p className="text-[11px] text-[var(--text-3)] italic">No data</p>
                      ) : (
                        <div className="space-y-1.5">
                          {combo.top3.map((ws, i) => (
                            <WeekendPill key={ws.dateRange.id} weekend={ws} rank={i + 1} priorityCity={priorityCity} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekendPill({ weekend, rank, priorityCity }: { weekend: WeekendScore; rank: number; priorityCity: string }) {
  const { dateRange, score, totalGroupCost, perCityCosts, cityAverages } = weekend;
  const selectedCityCost = priorityCity !== "all" ? perCityCosts.find((c) => c.city === priorityCity) : null;

  return (
    <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
      <ScoreBadge score={score} rank={rank} totalGroupCost={totalGroupCost} perCityCosts={perCityCosts} cityAverages={cityAverages} />
      <div className="flex-1 min-w-0 text-center">
        <div className="text-[11px] font-medium text-[var(--text-1)] truncate">
          {formatDateRangeDisplay(dateRange.departDate, dateRange.returnDate)}
        </div>
        <div className="text-[10px] text-[var(--text-3)]">
          {new Date(dateRange.departDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })} - {new Date(dateRange.returnDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
        </div>
      </div>
      {selectedCityCost && selectedCityCost.perPersonTotal != null && (
        <div className="flex items-center gap-1 text-[10px] shrink-0">
          <span className="text-[var(--text-3)] font-mono tabular-nums">${selectedCityCost.flightCost ?? 0}</span>
          <span className="text-[var(--text-3)]">+</span>
          <span className="text-[var(--text-3)] font-mono tabular-nums">${Math.round(selectedCityCost.stayCost)}</span>
          <span className="text-[var(--text-3)]">=</span>
          <span className="text-xs font-semibold font-mono tabular-nums text-[var(--gold)]">${Math.round(selectedCityCost.perPersonTotal)}</span>
        </div>
      )}
    </div>
  );
}
