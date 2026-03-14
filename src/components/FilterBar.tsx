"use client";

import { useState } from "react";
import { FlightCategory, BudgetTier, ScoringAlgorithm, CityConfig, FlightCategoryConfig } from "@/lib/types";
import { FLIGHT_CATEGORIES, BUDGET_TIERS, SCORING_ALGORITHMS, flightCategoryConfigToDisplay } from "@/lib/constants";

interface FilterBarProps {
  flightCategory: FlightCategory;
  budgetTier: BudgetTier;
  priorityCity: string;
  scoringAlgorithm: ScoringAlgorithm;
  cities: CityConfig[];
  flightCategories?: FlightCategoryConfig[];
  onFlightCategoryChange: (category: FlightCategory) => void;
  onBudgetTierChange: (tier: BudgetTier) => void;
  onPriorityCityChange: (city: string) => void;
  onScoringAlgorithmChange: (algo: ScoringAlgorithm) => void;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5">
        {label}
      </div>
      <div className="flex gap-0.5 p-0.5 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-150 whitespace-nowrap ${
              value === opt.value
                ? "bg-[var(--surface-3)] text-[var(--text-1)] shadow-sm"
                : "text-[var(--text-2)] hover:text-[var(--text-1)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5">
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-8 px-2.5 rounded-md text-xs font-medium bg-[var(--surface-1)] text-[var(--text-1)] border border-[var(--border-default)] hover:border-[var(--border-hover)] focus:outline-none focus:border-[var(--border-active)] transition-all duration-150 appearance-none cursor-pointer pr-7 bg-[length:16px] bg-[position:right_4px_center] bg-no-repeat"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export function FilterBar({
  flightCategory,
  budgetTier,
  priorityCity,
  scoringAlgorithm,
  cities,
  flightCategories,
  onFlightCategoryChange,
  onBudgetTierChange,
  onPriorityCityChange,
  onScoringAlgorithmChange,
}: FilterBarProps) {
  const [showAlgoInfo, setShowAlgoInfo] = useState(false);
  const displayCategories = flightCategories
    ? flightCategoryConfigToDisplay(flightCategories)
    : FLIGHT_CATEGORIES;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <SegmentedControl
          label="Flight Type"
          options={displayCategories.map((c) => ({ value: c.value, label: c.label }))}
          value={flightCategory}
          onChange={onFlightCategoryChange}
        />

        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">
              Budget
            </div>
            <div className="relative group">
              <svg className="w-3 h-3 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors duration-150 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50">
                <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-2)] p-2.5 shadow-lg whitespace-nowrap">
                  {BUDGET_TIERS.map((t) => (
                    <div key={t.value} className={`text-[11px] leading-relaxed ${t.value === budgetTier ? "text-[var(--blue)] font-medium" : "text-[var(--text-2)]"}`}>
                      {t.label}: {t.range}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-0.5 p-0.5 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
            {BUDGET_TIERS.map((t) => (
              <button
                key={t.value}
                onClick={() => onBudgetTierChange(t.value)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                  budgetTier === t.value
                    ? "bg-[var(--surface-3)] text-[var(--text-1)] shadow-sm"
                    : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <SelectControl
          label="City"
          options={[
            { value: "all", label: "All Cities" },
            ...cities.map((c) => ({ value: c.city, label: `${c.city} (${c.people})` })),
          ]}
          value={priorityCity}
          onChange={onPriorityCityChange}
        />

        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">
              Scoring
            </div>
            <button
              onClick={() => setShowAlgoInfo(!showAlgoInfo)}
              className="text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors duration-150"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <select
            value={scoringAlgorithm}
            onChange={(e) => onScoringAlgorithmChange(e.target.value as ScoringAlgorithm)}
            className="h-8 px-2.5 rounded-md text-xs font-medium bg-[var(--surface-1)] text-[var(--text-1)] border border-[var(--border-default)] hover:border-[var(--border-hover)] focus:outline-none focus:border-[var(--border-active)] transition-all duration-150 appearance-none cursor-pointer pr-7 bg-[length:16px] bg-[position:right_4px_center] bg-no-repeat"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            }}
          >
            {SCORING_ALGORITHMS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Scoring info */}
      {showAlgoInfo && (
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-1)] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">Scoring Methods</span>
            <button onClick={() => setShowAlgoInfo(false)} className="text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors duration-150">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SCORING_ALGORITHMS.map((algo) => (
              <div key={algo.value}
                className={`p-2.5 rounded-md border transition-colors duration-150 ${
                  algo.value === scoringAlgorithm
                    ? "border-[var(--blue-border)] bg-[var(--blue-soft)]"
                    : "border-[var(--border-default)]"
                }`}>
                <div className="text-xs font-medium text-[var(--text-1)] mb-0.5">{algo.label}</div>
                <p className="text-[11px] text-[var(--text-2)] leading-relaxed">{algo.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
