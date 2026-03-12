"use client";

import { useState } from "react";
import { WeekendScore, FlightCategory, BudgetTier } from "@/lib/types";
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
}

export function WeekendCard({
  weekend,
  rank,
  flightCategory,
  budgetTier,
}: WeekendCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { dateRange, score, totalGroupCost, perCityCosts, cityAverages } = weekend;

  const categoryLabel =
    FLIGHT_CATEGORIES.find((c) => c.value === flightCategory)?.label ??
    flightCategory;

  const avgPerPerson =
    totalGroupCost !== Infinity
      ? Math.round(totalGroupCost / TOTAL_PEOPLE)
      : null;

  const cities = perCityCosts.map((c) => c.city);

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
            <span className="text-xs text-zinc-500">{dateRange.format}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-sm text-zinc-400">Group Total</div>
            <div className="text-lg font-bold font-mono text-zinc-100">
              {totalGroupCost !== Infinity
                ? `$${totalGroupCost.toLocaleString()}`
                : "N/A"}
            </div>
          </div>
          {avgPerPerson && (
            <div className="text-right hidden md:block">
              <div className="text-sm text-zinc-400">Avg/Person</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                ${avgPerPerson}
              </div>
            </div>
          )}
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
          {/* Mobile group total */}
          <div className="sm:hidden flex justify-between items-center">
            <span className="text-sm text-zinc-400">Group Total</span>
            <span className="text-lg font-bold font-mono text-zinc-100">
              {totalGroupCost !== Infinity
                ? `$${totalGroupCost.toLocaleString()}`
                : "N/A"}
            </span>
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
