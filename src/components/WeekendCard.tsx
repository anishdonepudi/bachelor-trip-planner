"use client";

import { useState } from "react";
import { WeekendScore, FlightCategory, BudgetTier } from "@/lib/types";
import { FLIGHT_CATEGORIES } from "@/lib/constants";
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
}

export function WeekendCard({
  weekend,
  rank,
  flightCategory,
  budgetTier,
  priorityCity,
}: WeekendCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { dateRange, score, totalGroupCost, perCityCosts, cityAverages } = weekend;

  // Per-person costs for the selected city
  const selectedCityCost = priorityCity && priorityCity !== "all"
    ? perCityCosts.find((c) => c.city === priorityCity)
    : null;

  const categoryLabel =
    FLIGHT_CATEGORIES.find((c) => c.value === flightCategory)?.label ??
    flightCategory;

  const cities = perCityCosts.map((c) => c.city);

  // Day of week labels
  const departDay = new Date(dateRange.departDate + "T00:00:00")
    .toLocaleDateString("en-US", { weekday: "short" });
  const returnDay = new Date(dateRange.returnDate + "T00:00:00")
    .toLocaleDateString("en-US", { weekday: "short" });

  // Days until this weekend
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const depart = new Date(dateRange.departDate + "T00:00:00");
  const daysUntil = Math.ceil((depart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 hover:border-zinc-700/70 transition-colors">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-zinc-900/30 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <ScoreBadge score={score} rank={rank} totalGroupCost={totalGroupCost} perCityCosts={perCityCosts} cityAverages={cityAverages} />
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              {formatDateRangeDisplay(dateRange.departDate, dateRange.returnDate)}
            </h3>
            <span className="text-xs text-zinc-500">{departDay} – {returnDay}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Per-person cost breakdown for selected city */}
          {selectedCityCost && selectedCityCost.perPersonTotal != null && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <span className="text-xs text-zinc-500">
                ${selectedCityCost.flightCost ?? 0} flight
              </span>
              <span className="text-zinc-600">+</span>
              <span className="text-xs text-zinc-500">
                ${Math.round(selectedCityCost.stayCost)} stay
              </span>
              <span className="text-zinc-600">=</span>
              <span className="text-sm font-semibold font-mono text-cyan-300">
                ${Math.round(selectedCityCost.perPersonTotal)}
              </span>
              <span className="text-xs text-cyan-400/70">pp</span>
            </div>
          )}

          {/* Airbnb count pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-sm font-semibold font-mono text-violet-300">
              {weekend.airbnbListings.filter((l) => l.budget_tier === budgetTier).length}
            </span>
            <span className="text-xs text-violet-400/70">villas</span>
          </div>

          {/* Days away pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {daysUntil > 0 ? (
              <>
                <span className="text-sm font-semibold font-mono text-zinc-200">{daysUntil}</span>
                <span className="text-xs text-zinc-500">days</span>
              </>
            ) : daysUntil === 0 ? (
              <span className="text-sm font-semibold text-emerald-400">Today!</span>
            ) : (
              <span className="text-sm font-semibold text-zinc-500">Passed</span>
            )}
          </div>

          {/* Chevron */}
          <svg
            className={`w-5 h-5 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-zinc-800/50 p-4 sm:p-5 space-y-6">
          {/* Mobile info */}
          <div className="sm:hidden flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <span className="text-xs font-semibold font-mono text-violet-300">
                {weekend.airbnbListings.filter((l) => l.budget_tier === budgetTier).length}
              </span>
              <span className="text-xs text-violet-400/70">villas</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
              {daysUntil > 0 ? (
                <>
                  <span className="text-xs font-semibold font-mono text-zinc-200">{daysUntil}</span>
                  <span className="text-xs text-zinc-500">days</span>
                </>
              ) : daysUntil === 0 ? (
                <span className="text-xs font-semibold text-emerald-400">Today!</span>
              ) : (
                <span className="text-xs font-semibold text-zinc-500">Passed</span>
              )}
            </div>
          </div>

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

          <AirbnbGrid
            listings={weekend.airbnbListings}
            budgetTier={budgetTier}
            departDate={dateRange.departDate}
            returnDate={dateRange.returnDate}
            selectedAirbnbUrl={weekend.selectedAirbnbUrl}
          />

          <CostBreakdownTable
            perCityCosts={perCityCosts}
            totalGroupCost={totalGroupCost}
          />
        </div>
      )}
    </div>
  );
}
