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
  if (score >= 60) return "text-sky-400";
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

  return (
    <div className="space-y-6">
      <div className="text-sm text-zinc-500">
        Top 3 weekends for every flight &times; stay combo
        {priorityCity !== "all" && (
          <span> &middot; ranked by {priorityCity}</span>
        )}
      </div>

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
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "bg-zinc-800/60 text-zinc-400 border border-zinc-700/50"
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
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden"
          >
            {/* Budget tier header */}
            <button
              className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                combo.flightCategory === activeFlightCategory && combo.budgetTier === activeBudgetTier
                  ? "bg-sky-950/40"
                  : "hover:bg-zinc-800/30"
              }`}
              onClick={() => onSelectCombo(combo.flightCategory, combo.budgetTier)}
            >
              <div>
                <span className="text-sm font-semibold text-zinc-200">
                  {combo.budgetLabel}
                </span>
                <span className="text-xs text-zinc-500 ml-2">
                  {combo.budgetRange}
                </span>
              </div>
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Top 3 weekends */}
            {combo.top3.length === 0 ? (
              <div className="px-4 py-3 border-t border-zinc-800/50">
                <p className="text-xs text-zinc-600 italic">No data for this combo</p>
              </div>
            ) : (
              <div className="border-t border-zinc-800/50">
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
                      className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/30 last:border-b-0"
                    >
                      {/* Rank */}
                      <span className="text-base w-7 text-center shrink-0">
                        {getRankIcon(i + 1)}
                      </span>

                      {/* Date info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-200 truncate">
                          {formatDateRangeDisplay(ws.dateRange.departDate, ws.dateRange.returnDate)}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {departDay} – {returnDay}
                        </div>
                      </div>

                      {/* Price + score indicator */}
                      <div className="text-right shrink-0">
                        {displayCost != null ? (
                          <>
                            <div className="text-sm font-bold font-mono text-zinc-100">
                              ${displayCost}
                            </div>
                            <div className={`text-[10px] font-medium ${getTierColor(ws.score)}`}>
                              {selectedCost ? "per person" : "avg pp"}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
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
            <div key={fc.value} className={`rounded-xl border bg-zinc-950/50 overflow-hidden ${
              fc.value === activeFlightCategory ? "border-sky-500/40" : "border-zinc-800"
            }`}>
              <div className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-200">
                  {fc.label}
                </h3>
                <p className="text-xs text-zinc-500">{fc.description}</p>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {combos.map((combo) => (
                  <button
                    key={combo.budgetTier}
                    className={`w-full px-4 py-3 text-left hover:bg-zinc-900/40 transition-colors cursor-pointer ${
                      combo.flightCategory === activeFlightCategory && combo.budgetTier === activeBudgetTier
                        ? "bg-sky-950/30"
                        : ""
                    }`}
                    onClick={() => onSelectCombo(combo.flightCategory, combo.budgetTier)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-zinc-300">
                        {combo.budgetLabel}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {combo.budgetRange}
                      </span>
                      <svg className="w-3 h-3 text-zinc-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    {combo.top3.length === 0 ? (
                      <p className="text-xs text-zinc-600 italic">No data</p>
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
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
      <ScoreBadge
        score={score}
        rank={rank}
        totalGroupCost={totalGroupCost}
        perCityCosts={perCityCosts}
        cityAverages={cityAverages}
      />
      <div className="flex-1 min-w-0 text-center">
        <div className="text-xs font-medium text-zinc-200 truncate">
          {formatDateRangeDisplay(dateRange.departDate, dateRange.returnDate)}
        </div>
        <div className="text-[10px] text-zinc-500">
          {new Date(dateRange.departDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })} – {new Date(dateRange.returnDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
        </div>
      </div>
      {selectedCityCost && selectedCityCost.perPersonTotal != null && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 shrink-0">
          <span className="text-[10px] text-zinc-500">
            ${selectedCityCost.flightCost ?? 0}
          </span>
          <span className="text-zinc-600 text-[10px]">+</span>
          <span className="text-[10px] text-zinc-500">
            ${Math.round(selectedCityCost.stayCost)}
          </span>
          <span className="text-zinc-600 text-[10px]">=</span>
          <span className="text-xs font-semibold font-mono text-cyan-300">
            ${Math.round(selectedCityCost.perPersonTotal)}
          </span>
          <span className="text-[10px] text-cyan-400/70">pp</span>
        </div>
      )}
    </div>
  );
}
