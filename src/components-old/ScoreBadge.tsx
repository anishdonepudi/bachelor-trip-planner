"use client";

import { useState } from "react";
import { CostBreakdown, CityStats } from "@/lib/types";
import { TOTAL_PEOPLE } from "@/lib/constants";

interface ScoreBadgeProps {
  score: number;
  rank: number;
  totalGroupCost: number;
  perCityCosts: CostBreakdown[];
  cityAverages: Record<string, CityStats>;
}

function getRating(perPerson: number, stats: CityStats): { label: string; color: string } {
  const z = (perPerson - stats.mean) / stats.std;
  if (z <= -0.5) return { label: "Good", color: "text-[var(--color-emerald)]" };
  if (z >= 0.5) return { label: "Bad", color: "text-red-400" };
  return { label: "Avg", color: "text-[var(--color-text-secondary)]" };
}

export function ScoreBadge({ score, rank, totalGroupCost, perCityCosts, cityAverages }: ScoreBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const avgPerPerson =
    totalGroupCost !== Infinity
      ? Math.round(totalGroupCost / TOTAL_PEOPLE)
      : null;

  const getTier = (score: number): { label: string; color: string } => {
    if (score >= 80) return { label: "Best Value", color: "bg-[oklch(0.62_0.17_165_/_15%)] text-[var(--color-emerald)] border-[oklch(0.62_0.17_165_/_30%)] animate-glow-pulse" };
    if (score >= 60) return { label: "Good", color: "bg-[oklch(0.55_0.2_265_/_15%)] text-[oklch(0.7_0.15_265)] border-[oklch(0.55_0.2_265_/_30%)]" };
    if (score >= 40) return { label: "Average", color: "bg-[oklch(0.75_0.18_85_/_15%)] text-[var(--color-amber)] border-[oklch(0.75_0.18_85_/_30%)]" };
    if (score >= 20) return { label: "Below Avg", color: "bg-[oklch(0.68_0.2_45_/_15%)] text-[var(--color-orange)] border-[oklch(0.68_0.2_45_/_30%)]" };
    return { label: "Pricey", color: "bg-red-500/15 text-red-400 border-red-500/30" };
  };

  const tier = getTier(score);

  return (
    <div
      className="relative flex items-center gap-3"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip((prev) => !prev)}
    >
      <span className="text-sm font-mono text-[var(--color-text-secondary)]">#{rank}</span>
      <div
        className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-semibold ${tier.color}`}
      >
        {tier.label}
      </div>

      {/* Hover/tap tooltip */}
      {showTooltip && perCityCosts.length > 0 && (
        <div
          className="absolute top-full left-0 mt-2 z-50 w-[calc(100vw-2rem)] sm:w-[22rem] rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--border-hover)] shadow-2xl p-3 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[var(--color-text-secondary)] font-semibold uppercase tracking-wider mb-1">
            {tier.label}
          </div>
          <p className="text-[var(--color-text-secondary)] mb-3 leading-relaxed">
            Each city is compared to its own average across all weekends.
          </p>

          <table className="w-full">
            <thead>
              <tr className="text-[var(--color-text-secondary)]">
                <th className="text-left pb-1">City</th>
                <th className="text-right pb-1">This Wknd</th>
                <th className="text-right pb-1">Avg</th>
                <th className="text-right pb-1">Rating</th>
              </tr>
            </thead>
            <tbody>
              {perCityCosts.map((c) => {
                const stats = cityAverages[c.city];
                const rating = c.perPersonTotal !== null && stats
                  ? getRating(c.perPersonTotal, stats)
                  : null;

                return (
                  <tr key={c.city} className="text-[var(--color-text-primary)] border-t border-[var(--border)]">
                    <td className="py-1.5 text-[var(--color-text-secondary)]">
                      {c.city}
                      {c.people > 1 && (
                        <span className="text-[var(--color-text-tertiary)] ml-1">x{c.people}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right font-mono">
                      {c.perPersonTotal !== null ? `$${Math.round(c.perPersonTotal)}` : "—"}
                    </td>
                    <td className="py-1.5 text-right font-mono text-[var(--color-text-secondary)]">
                      {stats ? `$${Math.round(stats.mean)}` : "—"}
                    </td>
                    <td className="py-1.5 text-right">
                      {rating && (
                        <span className={`font-semibold ${rating.color}`}>
                          {rating.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--border-hover)] text-[var(--color-text-primary)] font-semibold">
                <td className="pt-2" colSpan={3}>Group Total</td>
                <td className="pt-2 text-right font-mono">
                  {totalGroupCost !== Infinity
                    ? `$${totalGroupCost.toLocaleString()}`
                    : "N/A"}
                </td>
              </tr>
              {avgPerPerson && (
                <tr className="text-[var(--color-text-secondary)]">
                  <td colSpan={3}>Avg per person</td>
                  <td className="text-right font-mono">${avgPerPerson}</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
