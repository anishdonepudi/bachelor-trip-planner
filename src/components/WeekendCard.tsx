"use client";

import { useState, useRef, useEffect } from "react";
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

export function WeekendCard({ weekend, rank, flightCategory, budgetTier, priorityCity, onCollapsedHeight }: WeekendCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("flights");
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
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left hover:bg-[var(--surface-1)] transition-colors duration-150"
      >
        {/* Mobile layout — polished compact card */}
        <div className="sm:hidden px-3.5 py-3">
          <div className="flex items-center gap-3">
            {/* Rank circle */}
            <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-mono"
              style={{ backgroundColor: `color-mix(in oklch, ${tierColor} 15%, transparent)`, color: tierColor }}>
              {rank}
            </div>

            {/* Date + meta */}
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

            {/* Price */}
            {avgPerPerson !== null && (
              <div className="text-right shrink-0">
                <div className="text-[17px] font-bold font-mono tabular-nums text-[var(--gold)] leading-tight">${avgPerPerson}</div>
                <div className="text-[10px] text-[var(--text-3)] leading-tight mt-0.5">per person</div>
              </div>
            )}

            {/* Chevron */}
            <svg className={`w-5 h-5 text-[var(--text-3)] transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Bottom row: meta pills */}
          <div className="flex items-center gap-2 mt-2 ml-[52px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-default)]">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              {villaCount} stays
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-default)]">
              Score: {score}
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
    </div>
  );
}
