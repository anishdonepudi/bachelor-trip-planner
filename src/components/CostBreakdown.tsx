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
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Cost Breakdown Per Person
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
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
                className="border-t border-zinc-800/30 hover:bg-zinc-800/20"
              >
                <td className="py-2 px-2 text-zinc-300">
                  {cost.city}
                  {cost.people > 1 && (
                    <span className="text-zinc-500 ml-1">
                      ({cost.people})
                    </span>
                  )}
                </td>
                <td className="text-right py-2 px-2 font-mono text-zinc-300">
                  {cost.flightCost !== null ? (
                    <span className="inline-flex items-center gap-1.5">
                      ${cost.flightCost}
                      {cost.fallbackCategory && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 font-sans">
                          {getCategoryLabel(cost.fallbackCategory)}
                        </span>
                      )}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-right py-2 px-2 font-mono text-zinc-300">
                  ${cost.stayCost.toFixed(0)}
                </td>
                <td className="text-right py-2 px-2 font-mono font-semibold text-zinc-100">
                  {cost.perPersonTotal !== null
                    ? `$${cost.perPersonTotal.toFixed(0)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-700">
              <td
                colSpan={3}
                className="py-2 px-2 text-xs uppercase text-zinc-400 font-semibold"
              >
                Group Total (all travelers)
              </td>
              <td className="text-right py-2 px-2 font-mono font-bold text-lg text-emerald-400">
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
