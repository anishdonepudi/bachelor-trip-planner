"use client";

import { CostBreakdown as CostBreakdownType } from "@/lib/types";
import { FLIGHT_CATEGORIES } from "@/lib/constants";

interface CostBreakdownProps {
  perCityCosts: CostBreakdownType[];
  totalGroupCost: number;
}

function getCategoryLabel(value: string): string {
  return FLIGHT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function CostBreakdownTable({
  perCityCosts,
  totalGroupCost,
}: CostBreakdownProps) {
  return (
    <div>
      <h4 className="font-heading text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
        Cost Breakdown Per Person
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider border-b border-[var(--border)]">
              <th className="text-left py-2 px-2">City</th>
              <th className="text-right py-2 px-2">Flight</th>
              <th className="text-right py-2 px-2">Stay</th>
              <th className="text-right py-2 px-2">Total/pp</th>
            </tr>
          </thead>
          <tbody>
            {perCityCosts.map((cost) => (
              <tr
                key={cost.city}
                className="border-t border-[var(--border)] hover:bg-[var(--color-surface-elevated)]/20"
              >
                <td className="py-2 px-2 text-[var(--color-text-primary)]">
                  {cost.city}
                  {cost.people > 1 && (
                    <span className="text-[var(--color-text-secondary)] ml-1">
                      ({cost.people})
                    </span>
                  )}
                </td>
                <td className="text-right py-2 px-2 font-mono text-[var(--color-text-primary)]">
                  {cost.flightCost !== null ? (
                    <span className="inline-flex items-center gap-1.5">
                      ${cost.flightCost}
                      {cost.fallbackCategory && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-[oklch(0.68_0.2_45_/_15%)] text-[var(--color-orange)] border border-[oklch(0.68_0.2_45_/_20%)] font-sans">
                          {getCategoryLabel(cost.fallbackCategory)}
                        </span>
                      )}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-right py-2 px-2 font-mono text-[var(--color-text-primary)]">
                  ${cost.stayCost.toFixed(0)}
                </td>
                <td className="text-right py-2 px-2 font-mono font-semibold text-[var(--color-text-primary)]">
                  {cost.perPersonTotal !== null
                    ? `$${cost.perPersonTotal.toFixed(0)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--border-hover)]">
              <td
                colSpan={3}
                className="py-2 px-2 text-xs uppercase text-[var(--color-text-secondary)] font-semibold"
              >
                Group Total (all travelers)
              </td>
              <td className="text-right py-2 px-2 font-mono font-bold text-lg text-[var(--color-emerald)]">
                {totalGroupCost !== Infinity
                  ? `$${totalGroupCost.toLocaleString()}`
                  : "—"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
