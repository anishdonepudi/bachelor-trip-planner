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

type DetailTab = "flights" | "stays" | "costs";

function getTierColor(score: number): string {
  if (score >= 80) return "var(--teal)";
  if (score >= 60) return "var(--blue)";
  if (score >= 40) return "var(--gold)";
  if (score >= 20) return "var(--orange)";
  return "var(--red)";
}

export function WeekendCard({ weekend, rank, flightCategory, budgetTier, priorityCity }: WeekendCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("flights");
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
      className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-0)] hover:border-[var(--border-hover)] transition-all duration-200 overflow-hidden"
      style={{ borderLeftWidth: "3px", borderLeftColor: tierColor }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left hover:bg-[var(--surface-1)] transition-colors duration-150"
      >
        {/* Mobile layout */}
        <div className="sm:hidden p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <ScoreBadge score={score} rank={rank} totalGroupCost={totalGroupCost} perCityCosts={perCityCosts} cityAverages={cityAverages} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-heading font-semibold text-[var(--text-1)] truncate">
                {formatDateRangeDisplay(dateRange.departDate, dateRange.returnDate)}
              </h3>
              <span className="text-[11px] text-[var(--text-3)]">{departDay} - {returnDay}</span>
            </div>
            <svg className={`w-4 h-4 text-[var(--text-3)] transition-transform duration-150 shrink-0 ${expanded ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Price hero */}
          {avgPerPerson !== null && (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tabular-nums text-[var(--gold)]">${avgPerPerson}</span>
              <span className="text-[11px] text-[var(--text-3)]">avg/person</span>
            </div>
          )}

          {/* Compact meta */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="px-1.5 py-0.5 rounded bg-[var(--surface-1)] text-[var(--text-2)] font-mono tabular-nums">{villaCount} stays</span>
            <span className="px-1.5 py-0.5 rounded bg-[var(--surface-1)] text-[var(--text-2)] font-mono tabular-nums">
              {daysUntil > 0 ? `${daysUntil}d away` : daysUntil === 0 ? "Today" : "Passed"}
            </span>
          </div>
        </div>

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
                className={`px-4 py-2 text-xs font-heading font-semibold uppercase tracking-wider transition-colors duration-150 relative ${
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
    </div>
  );
}
