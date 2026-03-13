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

  const villaCount = weekend.airbnbListings.filter((l) => l.budget_tier === budgetTier).length;
  const avgPerPerson = totalGroupCost !== Infinity ? Math.round(totalGroupCost / TOTAL_PEOPLE) : null;

  // Days until this weekend
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const depart = new Date(dateRange.departDate + "T00:00:00");
  const daysUntil = Math.ceil((depart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--color-surface-deep)]/50 hover:border-[var(--border-hover)] hover:shadow-lg transition-all duration-300 hover:scale-[1.003]">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left hover:bg-[var(--color-surface-base)]/30 transition-colors"
      >
        {/* Mobile header layout */}
        <div className="sm:hidden p-4 space-y-2.5">
          {/* Top row: rank + date + score tier */}
          <div className="flex items-center gap-2">
            <ScoreBadge score={score} rank={rank} totalGroupCost={totalGroupCost} perCityCosts={perCityCosts} cityAverages={cityAverages} />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] font-heading truncate">
                {formatDateRangeDisplay(dateRange.departDate, dateRange.returnDate)}
              </h3>
              <span className="text-xs text-[var(--color-text-secondary)]">{departDay} – {returnDay}</span>
            </div>
            <svg
              className={`w-5 h-5 text-[var(--color-text-secondary)] transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Hero: per-person cost */}
          {avgPerPerson !== null && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold font-mono text-[var(--color-amber)]">${avgPerPerson}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">per person</span>
            </div>
          )}

          {/* Bottom chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[oklch(0.55_0.2_265_/_10%)] border border-[oklch(0.55_0.2_265_/_20%)]">
              <span className="text-[11px] font-semibold font-mono text-[oklch(0.7_0.15_265)]">
                {villaCount}
              </span>
              <span className="text-[11px] text-[oklch(0.55_0.2_265_/_70%)]">villas</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-surface-elevated)]/60 border border-[var(--border)]">
              {daysUntil > 0 ? (
                <>
                  <span className="text-[11px] font-semibold font-mono text-[var(--color-text-primary)]">{daysUntil}</span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">days away</span>
                </>
              ) : daysUntil === 0 ? (
                <span className="text-[11px] font-semibold text-emerald-400">Today!</span>
              ) : (
                <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Passed</span>
              )}
            </div>
            {perCityCosts.some((c) => c.flightCost !== null) && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[oklch(0.55_0.2_265_/_10%)] border border-[oklch(0.55_0.2_265_/_20%)]">
                <svg className="w-3 h-3 text-[var(--color-indigo)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span className="text-[11px] text-[oklch(0.7_0.15_265)]">flights</span>
              </div>
            )}
          </div>
        </div>

        {/* Desktop header layout */}
        <div className="hidden sm:flex items-center justify-between p-5">
          <div className="flex items-center gap-4 min-w-0">
            <ScoreBadge score={score} rank={rank} totalGroupCost={totalGroupCost} perCityCosts={perCityCosts} cityAverages={cityAverages} />
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] font-heading">
                {formatDateRangeDisplay(dateRange.departDate, dateRange.returnDate)}
              </h3>
              <span className="text-xs text-[var(--color-text-secondary)]">{departDay} – {returnDay}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Per-person cost breakdown for selected city */}
            {selectedCityCost && selectedCityCost.perPersonTotal != null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[oklch(0.75_0.18_85_/_10%)] border border-[oklch(0.75_0.18_85_/_20%)]">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  ${selectedCityCost.flightCost ?? 0} flight
                </span>
                <span className="text-[var(--color-text-tertiary)]">+</span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  ${Math.round(selectedCityCost.stayCost)} stay
                </span>
                <span className="text-[var(--color-text-tertiary)]">=</span>
                <span className="text-sm font-semibold font-mono text-[var(--color-amber)]">
                  ${Math.round(selectedCityCost.perPersonTotal)}
                </span>
                <span className="text-xs text-[oklch(0.75_0.18_85_/_70%)]">pp</span>
              </div>
            )}

            {/* Airbnb count pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[oklch(0.55_0.2_265_/_10%)] border border-[oklch(0.55_0.2_265_/_20%)]">
              <svg className="w-4 h-4 text-[oklch(0.55_0.2_265)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              <span className="text-sm font-semibold font-mono text-[oklch(0.7_0.15_265)]">
                {villaCount}
              </span>
              <span className="text-xs text-[oklch(0.55_0.2_265_/_70%)]">villas</span>
            </div>

            {/* Days away pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-surface-elevated)]/60 border border-[var(--border)]">
              <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              {daysUntil > 0 ? (
                <>
                  <span className="text-sm font-semibold font-mono text-[var(--color-text-primary)]">{daysUntil}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">days</span>
                </>
              ) : daysUntil === 0 ? (
                <span className="text-sm font-semibold text-emerald-400">Today!</span>
              ) : (
                <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Passed</span>
              )}
            </div>

            {/* Chevron */}
            <svg
              className={`w-5 h-5 text-[var(--color-text-secondary)] transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[var(--border)] p-4 sm:p-5 space-y-8">

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
