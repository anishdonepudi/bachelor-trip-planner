"use client";

import { FlightCategory, BudgetTier, DateRange } from "@/lib/types";
import { FLIGHT_CATEGORIES, BUDGET_TIERS } from "@/lib/constants";

interface FilterBarProps {
  flightCategory: FlightCategory;
  budgetTier: BudgetTier;
  selectedWeekend: string | null;
  dateRanges: DateRange[];
  onFlightCategoryChange: (category: FlightCategory) => void;
  onBudgetTierChange: (tier: BudgetTier) => void;
  onWeekendChange: (weekendId: string | null) => void;
}

export function FilterBar({
  flightCategory,
  budgetTier,
  selectedWeekend,
  dateRanges,
  onFlightCategoryChange,
  onBudgetTierChange,
  onWeekendChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 p-4 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-xl">
      {/* Weekend Filter */}
      <div className="flex-1">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Weekend
        </h3>
        <select
          value={selectedWeekend ?? "all"}
          onChange={(e) =>
            onWeekendChange(e.target.value === "all" ? null : e.target.value)
          }
          className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800/50 text-zinc-300 border border-zinc-700/50 hover:bg-zinc-800 focus:outline-none focus:border-sky-500/40 appearance-none cursor-pointer"
        >
          <option value="all">All Weekends</option>
          {dateRanges.map((dr) => (
            <option key={dr.id} value={dr.id}>
              {dr.format}
            </option>
          ))}
        </select>
      </div>

      {/* Flight Category */}
      <div className="flex-1">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Flight Type
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {FLIGHT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => onFlightCategoryChange(cat.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                flightCategory === cat.value
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget Tier */}
      <div className="flex-1">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Airbnb Budget
        </h3>
        <div className="flex flex-col gap-2">
          {BUDGET_TIERS.map((tier) => (
            <button
              key={tier.value}
              onClick={() => onBudgetTierChange(tier.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                budgetTier === tier.value
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              <span className="font-semibold">{tier.label}</span>
              <span className="ml-2 text-xs opacity-70">{tier.range}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
