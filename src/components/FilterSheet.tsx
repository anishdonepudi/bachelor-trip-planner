"use client";

import { useEffect, useRef } from "react";
import { FlightCategory, BudgetTier, ScoringAlgorithm, CityConfig } from "@/lib/types";
import { FLIGHT_CATEGORIES, BUDGET_TIERS, SCORING_ALGORITHMS } from "@/lib/constants";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
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

export function FilterSheet({
  open,
  onClose,
  flightCategory,
  budgetTier,
  priorityCity,
  scoringAlgorithm,
  cities,
  onFlightCategoryChange,
  onBudgetTierChange,
  onPriorityCityChange,
  onScoringAlgorithmChange,
}: FilterSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

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
      const diff = currentY.current - startY.current;
      if (diff > 100) {
        onClose();
      }
    }
    if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
    startY.current = null;
    currentY.current = null;
  };

  const handleReset = () => {
    onFlightCategoryChange("nonstop_carryon");
    onBudgetTierChange("budget");
    onPriorityCityChange("all");
    onScoringAlgorithmChange("zscore");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-zinc-950 border-t border-zinc-800 shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-zinc-800 shrink-0">
          <h2 className="text-base font-semibold text-zinc-100">Filters</h2>
          <button
            onClick={handleReset}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
          {/* Flight Category */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Flight Type
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {FLIGHT_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => onFlightCategoryChange(cat.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    flightCategory === cat.value
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                      : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Tier */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Airbnb Budget
            </h3>
            <div className="flex flex-col gap-2">
              {BUDGET_TIERS.map((tier) => (
                <button
                  key={tier.value}
                  onClick={() => onBudgetTierChange(tier.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all ${
                    budgetTier === tier.value
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50"
                  }`}
                >
                  <span className="font-semibold">{tier.label}</span>
                  <span className="ml-2 text-xs opacity-70">{tier.range}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Priority City */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Rank By City
            </h3>
            <select
              value={priorityCity}
              onChange={(e) => onPriorityCityChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm font-medium bg-zinc-800/50 text-zinc-300 border border-zinc-700/50 focus:outline-none focus:border-emerald-500/40 transition-all appearance-none"
            >
              <option value="all">All Cities</option>
              {cities.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city} ({c.people})
                </option>
              ))}
            </select>
          </div>

          {/* Scoring Method */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Scoring Method
            </h3>
            <select
              value={scoringAlgorithm}
              onChange={(e) => onScoringAlgorithmChange(e.target.value as ScoringAlgorithm)}
              className="w-full px-3 py-2.5 rounded-lg text-sm font-medium bg-zinc-800/50 text-zinc-300 border border-zinc-700/50 focus:outline-none focus:border-violet-500/40 transition-all appearance-none"
            >
              {SCORING_ALGORITHMS.map((algo) => (
                <option key={algo.value} value={algo.value}>
                  {algo.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-zinc-800 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-500 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
