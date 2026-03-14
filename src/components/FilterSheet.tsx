"use client";

import { useEffect, useRef } from "react";
import { FlightCategory, BudgetTier, ScoringAlgorithm, CityConfig, FlightCategoryConfig } from "@/lib/types";
import { FLIGHT_CATEGORIES, BUDGET_TIERS, SCORING_ALGORITHMS, flightCategoryConfigToDisplay } from "@/lib/constants";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
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

export function FilterSheet({
  open,
  onClose,
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
}: FilterSheetProps) {
  const displayCategories = flightCategories
    ? flightCategoryConfigToDisplay(flightCategories)
    : FLIGHT_CATEGORIES;
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (startY.current !== null && currentY.current !== null) {
      if (currentY.current - startY.current > 100) onClose();
    }
    if (sheetRef.current) sheetRef.current.style.transform = "";
    startY.current = null;
    currentY.current = null;
  };

  const handleReset = () => {
    const firstCat = flightCategories?.[0]?.id ?? "nonstop_carryon";
    onFlightCategoryChange(firstCat as FlightCategory);
    onBudgetTierChange("budget");
    onPriorityCityChange("all");
    onScoringAlgorithmChange("zscore");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 rounded-t-xl bg-[var(--surface-0)] border-t border-[var(--border-default)] shadow-2xl max-h-[85vh] flex flex-col animate-slide-up"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-8 h-1 rounded-full bg-[var(--surface-3)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2.5 border-b border-[var(--border-default)] shrink-0">
          <h2 className="text-sm font-heading font-semibold text-[var(--text-1)]">Filters</h2>
          <div className="flex items-center gap-3">
            <button onClick={handleReset}
              className="text-[11px] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors duration-150">
              Reset
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors duration-150"
              aria-label="Close filters">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
          {/* Flight Category */}
          <div>
            <div className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
              Flight Type
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {displayCategories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => onFlightCategoryChange(cat.value)}
                  className={`px-3 py-2.5 rounded-md text-xs font-medium transition-all duration-150 ${
                    flightCategory === cat.value
                      ? "bg-[var(--blue-soft)] text-[var(--blue)] border border-[var(--blue-border)]"
                      : "bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-default)]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <div className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
              Budget
            </div>
            <div className="space-y-1.5">
              {BUDGET_TIERS.map((tier) => (
                <button
                  key={tier.value}
                  onClick={() => onBudgetTierChange(tier.value)}
                  className={`w-full px-3 py-2.5 rounded-md text-xs font-medium text-left transition-all duration-150 ${
                    budgetTier === tier.value
                      ? "bg-[var(--gold-soft)] text-[var(--gold)] border border-[var(--gold-border)]"
                      : "bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-default)]"
                  }`}
                >
                  <span className="font-semibold">{tier.label}</span>
                  <span className="ml-2 text-[11px] opacity-70">{tier.range}</span>
                </button>
              ))}
            </div>
          </div>

          {/* City */}
          <div>
            <div className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
              Rank By City
            </div>
            <select
              value={priorityCity}
              onChange={(e) => onPriorityCityChange(e.target.value)}
              className="w-full h-10 px-3 rounded-md text-sm bg-[var(--surface-1)] text-[var(--text-1)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--border-active)] transition-all duration-150 appearance-none"
            >
              <option value="all">All Cities</option>
              {cities.map((c) => (
                <option key={c.city} value={c.city}>{c.city} ({c.people})</option>
              ))}
            </select>
          </div>

          {/* Scoring */}
          <div>
            <div className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
              Scoring
            </div>
            <select
              value={scoringAlgorithm}
              onChange={(e) => onScoringAlgorithmChange(e.target.value as ScoringAlgorithm)}
              className="w-full h-10 px-3 rounded-md text-sm bg-[var(--surface-1)] text-[var(--text-1)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--border-active)] transition-all duration-150 appearance-none"
            >
              {SCORING_ALGORITHMS.map((algo) => (
                <option key={algo.value} value={algo.value}>{algo.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-3 border-t border-[var(--border-default)] pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            onClick={onClose}
            className="w-full h-10 rounded-md text-sm font-semibold bg-[var(--blue)] text-white hover:brightness-110 transition-all duration-150"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
