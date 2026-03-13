"use client";

import { useState } from "react";
import { FlightCategory, BudgetTier, ScoringAlgorithm, CityConfig } from "@/lib/types";
import { FLIGHT_CATEGORIES, BUDGET_TIERS, SCORING_ALGORITHMS } from "@/lib/constants";

interface FilterBarProps {
  flightCategory: FlightCategory;
  budgetTier: BudgetTier;
  priorityCity: string;
  scoringAlgorithm: ScoringAlgorithm;
  cities: CityConfig[];
  onFlightCategoryChange: (category: FlightCategory) => void;
  onBudgetTierChange: (tier: BudgetTier) => void;
  onPriorityCityChange: (city: string) => void;
  onScoringAlgorithmChange: (algo: ScoringAlgorithm) => void;
}

export function FilterBar({
  flightCategory,
  budgetTier,
  priorityCity,
  scoringAlgorithm,
  cities,
  onFlightCategoryChange,
  onBudgetTierChange,
  onPriorityCityChange,
  onScoringAlgorithmChange,
}: FilterBarProps) {
  const [showAlgoInfo, setShowAlgoInfo] = useState(false);
  const activeAlgo = SCORING_ALGORITHMS.find((a) => a.value === scoringAlgorithm);

  return (
    <div className="p-4 bg-[var(--color-surface-base)]/80 backdrop-blur-sm border border-[var(--border)] rounded-2xl space-y-4 sticky top-[65px] z-40">
      <h2 className="text-xs font-semibold font-heading text-[var(--color-text-secondary)] uppercase tracking-wider">Filters</h2>
      <div className="flex flex-col sm:flex-row gap-6">
      {/* Flight Category */}
      <div className="flex-1">
        <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
          Flight Type
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {FLIGHT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => onFlightCategoryChange(cat.value)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                flightCategory === cat.value
                  ? "bg-[oklch(0.55_0.2_265_/_15%)] text-[oklch(0.7_0.15_265)] border border-[oklch(0.55_0.2_265_/_30%)] shadow-[var(--glow-indigo)]"
                  : "bg-[var(--color-surface-elevated)]/50 text-[var(--color-text-secondary)] border border-[var(--border)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget Tier */}
      <div className="flex-1">
        <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
          Airbnb Budget
        </h3>
        <div className="flex flex-col gap-2">
          {BUDGET_TIERS.map((tier) => (
            <button
              key={tier.value}
              onClick={() => onBudgetTierChange(tier.value)}
              className={`px-3 py-2 rounded-xl text-sm font-medium text-left transition-all ${
                budgetTier === tier.value
                  ? "bg-[oklch(0.75_0.18_85_/_15%)] text-[oklch(0.8_0.15_85)] border border-[oklch(0.75_0.18_85_/_30%)]"
                  : "bg-[var(--color-surface-elevated)]/50 text-[var(--color-text-secondary)] border border-[var(--border)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span className="font-semibold">{tier.label}</span>
              <span className="ml-2 text-xs opacity-70">{tier.range}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Priority City + Scoring Algorithm */}
      <div className="flex-1 space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Rank By City
          </h3>
          <select
            value={priorityCity}
            onChange={(e) => onPriorityCityChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm font-medium bg-[var(--color-surface-elevated)]/50 text-[var(--color-text-primary)] border border-[var(--border)] hover:bg-[var(--color-surface-hover)] focus:outline-none focus:border-[oklch(0.55_0.2_265_/_40%)] focus:ring-1 focus:ring-[oklch(0.55_0.2_265_/_20%)] transition-all appearance-none cursor-pointer"
          >
            <option value="all">All Cities</option>
            {cities.map((c) => (
              <option key={c.city} value={c.city}>
                {c.city} ({c.people})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Scoring Method
            </h3>
            <button
              onClick={() => setShowAlgoInfo(!showAlgoInfo)}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
              title="How scoring works"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <select
            value={scoringAlgorithm}
            onChange={(e) => onScoringAlgorithmChange(e.target.value as ScoringAlgorithm)}
            className="w-full px-3 py-2 rounded-xl text-sm font-medium bg-[var(--color-surface-elevated)]/50 text-[var(--color-text-primary)] border border-[var(--border)] hover:bg-[var(--color-surface-hover)] focus:outline-none focus:border-[oklch(0.55_0.2_265_/_40%)] focus:ring-1 focus:ring-[oklch(0.55_0.2_265_/_20%)] transition-all appearance-none cursor-pointer"
          >
            {SCORING_ALGORITHMS.map((algo) => (
              <option key={algo.value} value={algo.value}>
                {algo.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      </div>

      {/* Scoring info panel */}
      {showAlgoInfo && (
        <div className="border-t border-[var(--border)] pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Scoring Methods Explained
            </h3>
            <button
              onClick={() => setShowAlgoInfo(false)}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SCORING_ALGORITHMS.map((algo) => (
              <div
                key={algo.value}
                className={`p-3 rounded-xl border transition-colors ${
                  algo.value === scoringAlgorithm
                    ? "border-[oklch(0.55_0.2_265_/_30%)] bg-[oklch(0.55_0.2_265_/_10%)]"
                    : "border-[var(--border)] bg-[var(--color-surface-base)]/50"
                }`}
              >
                <div className="text-sm font-medium text-[var(--color-text-primary)] mb-1">{algo.label}</div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{algo.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
