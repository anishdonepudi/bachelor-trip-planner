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
  if (z <= -0.5) return { label: "Good", color: "text-emerald-400" };
  if (z >= 0.5) return { label: "Bad", color: "text-red-400" };
  return { label: "Avg", color: "text-zinc-400" };
}

export function ScoreBadge({ score, rank, totalGroupCost, perCityCosts, cityAverages }: ScoreBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const avgPerPerson =
    totalGroupCost !== Infinity
      ? Math.round(totalGroupCost / TOTAL_PEOPLE)
      : null;

  const getTier = (score: number): { label: string; color: string } => {
    if (score >= 80) return { label: "Best Value", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
    if (score >= 60) return { label: "Good", color: "bg-sky-500/15 text-sky-400 border-sky-500/30" };
    if (score >= 40) return { label: "Average", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
    if (score >= 20) return { label: "Below Avg", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" };
    return { label: "Pricey", color: "bg-red-500/15 text-red-400 border-red-500/30" };
  };

  const tier = getTier(score);

  return (
    <div
      className="relative flex items-center gap-3"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="text-sm font-mono text-zinc-500">#{rank}</span>
      <div
        className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-semibold ${tier.color}`}
      >
        {tier.label}
      </div>

      {/* Hover tooltip */}
      {showTooltip && perCityCosts.length > 0 && (
        <div
          className="absolute top-full left-0 mt-2 z-50 w-[22rem] rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl p-3 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-zinc-400 font-semibold uppercase tracking-wider mb-1">
            {tier.label}
          </div>
          <p className="text-zinc-500 mb-3 leading-relaxed">
            Each city is compared to its own average across all weekends.
          </p>

          <table className="w-full">
            <thead>
              <tr className="text-zinc-500">
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
                  <tr key={c.city} className="text-zinc-300 border-t border-zinc-800">
                    <td className="py-1.5 text-zinc-400">
                      {c.city}
                      {c.people > 1 && (
                        <span className="text-zinc-600 ml-1">x{c.people}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right font-mono">
                      {c.perPersonTotal !== null ? `$${Math.round(c.perPersonTotal)}` : "—"}
                    </td>
                    <td className="py-1.5 text-right font-mono text-zinc-500">
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
              <tr className="border-t border-zinc-700 text-zinc-200 font-semibold">
                <td className="pt-2" colSpan={3}>Group Total</td>
                <td className="pt-2 text-right font-mono">
                  {totalGroupCost !== Infinity
                    ? `$${totalGroupCost.toLocaleString()}`
                    : "N/A"}
                </td>
              </tr>
              {avgPerPerson && (
                <tr className="text-zinc-400">
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
