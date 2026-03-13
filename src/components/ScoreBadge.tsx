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

function getRating(perPerson: number, stats: CityStats): { label: string; cls: string } {
  const z = (perPerson - stats.mean) / stats.std;
  if (z <= -0.5) return { label: "Good", cls: "text-[var(--teal)]" };
  if (z >= 0.5) return { label: "Bad", cls: "text-[var(--red)]" };
  return { label: "Avg", cls: "text-[var(--text-2)]" };
}

function getTier(score: number) {
  if (score >= 80) return { color: "var(--teal)", label: "Great" };
  if (score >= 60) return { color: "var(--blue)", label: "Good" };
  if (score >= 40) return { color: "var(--gold)", label: "Fair" };
  if (score >= 20) return { color: "var(--orange)", label: "Low" };
  return { color: "var(--red)", label: "Poor" };
}

export function ScoreBadge({ score, rank, totalGroupCost, perCityCosts, cityAverages }: ScoreBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tier = getTier(score);

  const avgPerPerson =
    totalGroupCost !== Infinity ? Math.round(totalGroupCost / TOTAL_PEOPLE) : null;

  return (
    <div
      className="relative flex items-center gap-2.5"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip((p) => !p)}
    >
      {/* Rank number */}
      <span className="text-xs font-mono font-semibold text-[var(--text-3)] tabular-nums w-5 text-right">
        {rank}
      </span>

      {/* Score pill with inline bar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 min-w-[3.25rem]">
          <span
            className="text-xs font-semibold font-mono tabular-nums"
            style={{ color: tier.color }}
          >
            {Math.round(score)}
          </span>
          <div className="w-8 score-bar">
            <div
              className="score-bar-fill"
              style={{ width: `${score}%`, background: tier.color }}
            />
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && perCityCosts.length > 0 && (
        <div
          className="absolute top-full left-0 mt-2 z-50 w-[calc(100vw-2rem)] sm:w-72 rounded-lg bg-[var(--surface-2)] border border-[var(--border-hover)] shadow-2xl p-3 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-heading font-semibold text-[var(--text-2)] uppercase tracking-wider text-[10px]">
              Score Breakdown
            </span>
            <span className="font-mono font-semibold" style={{ color: tier.color }}>
              {tier.label}
            </span>
          </div>

          <table className="w-full">
            <thead>
              <tr className="text-[var(--text-3)] text-[10px]">
                <th className="text-left pb-1 font-medium">City</th>
                <th className="text-right pb-1 font-medium">Cost</th>
                <th className="text-right pb-1 font-medium">Avg</th>
                <th className="text-right pb-1 font-medium">vs Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {perCityCosts.map((c) => {
                const stats = cityAverages[c.city];
                const rating = c.perPersonTotal !== null && stats
                  ? getRating(c.perPersonTotal, stats)
                  : null;
                return (
                  <tr key={c.city} className="text-[var(--text-1)]">
                    <td className="py-1.5 text-[var(--text-2)]">
                      {c.city}
                      {c.people > 1 && (
                        <span className="text-[var(--text-3)] ml-0.5">x{c.people}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums">
                      {c.perPersonTotal !== null ? `$${Math.round(c.perPersonTotal)}` : "-"}
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums text-[var(--text-2)]">
                      {stats ? `$${Math.round(stats.mean)}` : "-"}
                    </td>
                    <td className="py-1.5 text-right">
                      {rating && (
                        <span className={`font-semibold ${rating.cls}`}>{rating.label}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-2 pt-2 border-t border-[var(--border-hover)] flex justify-between text-[var(--text-1)]">
            <span className="font-semibold">Total</span>
            <span className="font-mono font-semibold tabular-nums">
              {totalGroupCost !== Infinity ? `$${totalGroupCost.toLocaleString()}` : "N/A"}
            </span>
          </div>
          {avgPerPerson && (
            <div className="flex justify-between text-[var(--text-2)] mt-0.5">
              <span>Avg per person</span>
              <span className="font-mono tabular-nums">${avgPerPerson}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
