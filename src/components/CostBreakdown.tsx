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

export function CostBreakdownTable({ perCityCosts, totalGroupCost }: CostBreakdownProps) {
  return (
    <section>
      <h4 className="font-heading text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider mb-3">
        Cost Breakdown
      </h4>

      {/* Mobile: card-based layout */}
      <div className="md:hidden space-y-2">
        {perCityCosts.map((cost) => (
          <div key={cost.city} className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--text-1)]">
                {cost.city}
                {cost.people > 1 && (
                  <span className="text-[var(--text-3)] ml-1 text-xs">({cost.people})</span>
                )}
              </span>
              <span className="text-base font-bold font-mono tabular-nums text-[var(--text-1)]">
                {cost.perPersonTotal !== null ? `$${cost.perPersonTotal.toFixed(0)}` : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-3)]">
              <span className="font-mono tabular-nums">
                Flight: {cost.flightCost !== null ? `$${cost.flightCost}` : "—"}
              </span>
              {cost.fallbackCategory && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--orange-soft)] text-[var(--orange)] border border-[var(--orange-border)] font-medium">
                  {getCategoryLabel(cost.fallbackCategory)}
                </span>
              )}
              <span className="text-[var(--text-3)]">+</span>
              <span className="font-mono tabular-nums">Stay: ${cost.stayCost.toFixed(0)}</span>
            </div>
          </div>
        ))}
        <div className="rounded-lg border-2 border-[var(--border-hover)] bg-[var(--surface-1)] p-3 flex items-center justify-between">
          <span className="text-xs uppercase text-[var(--text-2)] font-heading font-semibold tracking-wider">Group Total</span>
          <span className="font-mono font-bold text-base tabular-nums text-[var(--teal)]">
            {totalGroupCost !== Infinity ? `$${totalGroupCost.toLocaleString()}` : "—"}
          </span>
        </div>
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface-1)] text-[10px] text-[var(--text-3)] uppercase tracking-wider font-heading">
              <th className="text-left py-2.5 px-3 font-semibold">City</th>
              <th className="text-right py-2.5 px-3 font-semibold">Flight</th>
              <th className="text-right py-2.5 px-3 font-semibold">Stay</th>
              <th className="text-right py-2.5 px-3 font-semibold">Total/pp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {perCityCosts.map((cost) => (
              <tr key={cost.city} className="hover:bg-[var(--surface-1)] transition-colors duration-100">
                <td className="py-2.5 px-3 text-[var(--text-1)] font-medium">
                  {cost.city}
                  {cost.people > 1 && (
                    <span className="text-[var(--text-3)] ml-1 text-xs">({cost.people})</span>
                  )}
                </td>
                <td className="text-right py-2.5 px-3 font-mono tabular-nums text-[var(--text-1)]">
                  {cost.flightCost !== null ? (
                    <span className="inline-flex items-center gap-1.5">
                      ${cost.flightCost}
                      {cost.fallbackCategory && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--orange-soft)] text-[var(--orange)] border border-[var(--orange-border)] font-sans font-medium">
                          {getCategoryLabel(cost.fallbackCategory)}
                        </span>
                      )}
                    </span>
                  ) : "-"}
                </td>
                <td className="text-right py-2.5 px-3 font-mono tabular-nums text-[var(--text-1)]">
                  ${cost.stayCost.toFixed(0)}
                </td>
                <td className="text-right py-2.5 px-3 font-mono tabular-nums font-semibold text-[var(--text-1)]">
                  {cost.perPersonTotal !== null ? `$${cost.perPersonTotal.toFixed(0)}` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--border-hover)] bg-[var(--surface-1)]">
              <td colSpan={3} className="py-2.5 px-3 text-xs uppercase text-[var(--text-2)] font-heading font-semibold tracking-wider">
                Group Total
              </td>
              <td className="text-right py-2.5 px-3 font-mono font-bold text-base tabular-nums text-[var(--teal)]">
                {totalGroupCost !== Infinity ? `$${totalGroupCost.toLocaleString()}` : "-"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
