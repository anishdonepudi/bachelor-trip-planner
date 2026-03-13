"use client";

import { useMemo } from "react";
import {
  CityConfig,
  WeekendData,
  DateRange,
  WeekendScore,
  FlightCategory,
  BudgetTier,
  ScoringAlgorithm,
} from "@/lib/types";
import { FLIGHT_CATEGORIES, BUDGET_TIERS } from "@/lib/constants";
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

  return (
    <div className="space-y-6">
      <div className="text-sm text-zinc-500">
        Top 3 weekends for every flight &times; stay combo
        {priorityCity !== "all" && (
          <span> &middot; ranked by {priorityCity}</span>
        )}
      </div>

      {/* 2x2 grid of flight categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
