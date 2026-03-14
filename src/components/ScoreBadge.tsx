"use client";

import { useState, useRef, useCallback } from "react";
import { CostBreakdown, CityStats, RankChangeInfo } from "@/lib/types";
import { TOTAL_PEOPLE } from "@/lib/constants";

interface ScoreBadgeProps {
  score: number;
  rank: number;
  totalGroupCost: number;
  perCityCosts: CostBreakdown[];
  cityAverages: Record<string, CityStats>;
}

function shouldFlipUp(triggerEl: HTMLElement, tooltipHeight: number): boolean {
  const rect = triggerEl.getBoundingClientRect();
  const tooltipBottom = rect.bottom + tooltipHeight + 8; // 8px margin
  const currentScrollHeight = document.documentElement.scrollHeight;
  const viewportBottom = window.scrollY + window.innerHeight;
  // Would the tooltip extend past the current scroll height?
  const absoluteBottom = window.scrollY + tooltipBottom;
  return absoluteBottom > currentScrollHeight && absoluteBottom > viewportBottom;
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
  const [flipUp, setFlipUp] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tier = getTier(score);

  const avgPerPerson =
    totalGroupCost !== Infinity ? Math.round(totalGroupCost / TOTAL_PEOPLE) : null;

  const handleShow = useCallback(() => {
    if (triggerRef.current) {
      setFlipUp(shouldFlipUp(triggerRef.current, 280));
    }
    setShowTooltip(true);
  }, []);

  return (
    <div
      ref={triggerRef}
      className="relative flex items-center gap-2.5"
      onMouseEnter={handleShow}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => { handleShow(); setShowTooltip((p) => !p); }}
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
          className={`absolute left-0 z-50 w-[calc(100vw-2rem)] sm:w-72 rounded-lg bg-[var(--surface-2)] border border-[var(--border-hover)] shadow-2xl p-3 text-xs ${flipUp ? "bottom-full mb-2" : "top-full mt-2"}`}
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

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function RankChangeIndicator({ info, sinceTimestamp }: { info: RankChangeInfo | undefined; sinceTimestamp?: string | null }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleShow = useCallback(() => {
    if (triggerRef.current) {
      setFlipUp(shouldFlipUp(triggerRef.current, 350));
    }
    setShowTooltip(true);
  }, []);

  if (!info) return null;

  const { rankDelta } = info;

  // No change
  if (rankDelta === 0) return null;

  const isNew = rankDelta === null;
  const improved = rankDelta !== null && rankDelta > 0;
  const dropped = rankDelta !== null && rankDelta < 0;

  const scoreDelta = info.previousScore !== null
    ? Math.round(info.currentScore) - Math.round(info.previousScore)
    : null;
  const costDelta = info.previousCost !== null && info.previousCost !== Infinity && info.currentCost !== Infinity
    ? info.currentCost - info.previousCost
    : null;

  const algo = info.scoringAlgorithm;
  const showMarketAvg = algo === "zscore";
  const showTotalCost = algo === "lowest_total" || algo === "lowest_per_person" || algo === "fairness";
  const showVariance = algo === "fairness";
  const showRating = algo === "best_value";

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={handleShow}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {isNew ? (
        <span className="text-[9px] font-bold font-mono px-1 py-0.5 rounded bg-[var(--blue-soft)] text-[var(--blue)] leading-none cursor-default">
          NEW
        </span>
      ) : improved ? (
        <span className="text-[10px] font-bold font-mono tabular-nums text-[var(--teal)] leading-none flex items-center gap-px cursor-default">
          <span>&#9650;</span>{rankDelta}
        </span>
      ) : dropped ? (
        <span className="text-[10px] font-bold font-mono tabular-nums text-[var(--red)] leading-none flex items-center gap-px cursor-default">
          <span>&#9660;</span>{Math.abs(rankDelta!)}
        </span>
      ) : null}

      {showTooltip && (
        <div
          className={`absolute left-0 z-50 w-72 rounded-lg bg-[var(--surface-2)] border border-[var(--border-hover)] shadow-2xl p-2.5 text-xs ${flipUp ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2">
            <div className="font-heading font-semibold text-[var(--text-2)] uppercase tracking-wider text-[10px]">
              {isNew ? "New Weekend" : "Why did this change?"}
            </div>
            {sinceTimestamp && (
              <div className="text-[var(--text-3)] text-[10px]">
                Since last viewed {formatTimeAgo(sinceTimestamp)}
              </div>
            )}
          </div>

          {/* Summary row */}
          {!isNew && (
            <div className="space-y-1 mb-2">
              {info.previousRank !== null && (
                <div className="flex justify-between text-[var(--text-1)]">
                  <span className="text-[var(--text-3)]">Rank</span>
                  <span className="font-mono tabular-nums">
                    #{info.previousRank} → #{info.currentRank}
                  </span>
                </div>
              )}
              {scoreDelta !== null && (
                <div className="flex justify-between text-[var(--text-1)]">
                  <span className="text-[var(--text-3)]">Score</span>
                  <span className="font-mono tabular-nums">
                    {Math.round(info.previousScore!)} → {Math.round(info.currentScore)}
                    <span className={scoreDelta > 0 ? " text-[var(--teal)]" : scoreDelta < 0 ? " text-[var(--red)]" : ""}>
                      {" "}{scoreDelta > 0 ? "+" : ""}{scoreDelta}
                    </span>
                  </span>
                </div>
              )}
              {showTotalCost && costDelta !== null && (
                <div className="flex justify-between text-[var(--text-1)]">
                  <span className="text-[var(--text-3)] shrink-0">Total</span>
                  <span className="font-mono tabular-nums text-right">
                    ${Math.round(info.previousCost!).toLocaleString()} → ${Math.round(info.currentCost).toLocaleString()}
                    <DeltaSpan value={Math.round(costDelta)} lowerIsBetter />
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Per-city breakdown */}
          {info.cityChanges.length > 0 && !isNew && (
            <>
              <div className="border-t border-[var(--border-default)] my-1.5" />
              <div className="font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider text-[9px] mb-1">
                Per-city breakdown
              </div>
              <div className="space-y-2">
                {info.cityChanges.map((cc) => {
                  const flightChanged = cc.previousFlightCost !== null &&
                    cc.currentFlightCost !== null &&
                    cc.previousFlightCost !== cc.currentFlightCost;
                  const stayChanged = cc.previousStayCost !== null &&
                    cc.previousStayCost !== cc.currentStayCost;
                  const flightNew = cc.previousFlightCost === null && cc.currentFlightCost !== null;
                  const flightLost = cc.previousFlightCost !== null && cc.currentFlightCost === null;
                  const ppChanged = cc.previousPerPerson !== null && cc.currentPerPerson !== null &&
                    Math.round(cc.previousPerPerson) !== Math.round(cc.currentPerPerson!);
                  const avgChanged = cc.previousCityAvg !== null && cc.currentCityAvg !== null &&
                    Math.round(cc.previousCityAvg) !== Math.round(cc.currentCityAvg);

                  const showAvg = showMarketAvg && avgChanged;
                  const hasAnyChange = flightChanged || stayChanged || flightNew || flightLost || ppChanged || showAvg;
                  if (!hasAnyChange) return null;

                  return (
                    <div key={cc.city}>
                      <div className="text-[var(--text-2)] font-medium mb-0.5">{cc.city}</div>
                      {flightNew && (
                        <div className="flex justify-between text-[var(--text-1)] ml-2">
                          <span className="text-[var(--text-3)]">Flight</span>
                          <span className="font-mono tabular-nums text-[var(--blue)]">
                            new ${cc.currentFlightCost}
                          </span>
                        </div>
                      )}
                      {flightLost && (
                        <div className="flex justify-between text-[var(--text-1)] ml-2">
                          <span className="text-[var(--text-3)]">Flight</span>
                          <span className="font-mono tabular-nums text-[var(--red)]">
                            unavailable
                          </span>
                        </div>
                      )}
                      {flightChanged && (
                        <div className="flex justify-between text-[var(--text-1)] ml-2">
                          <span className="text-[var(--text-3)]">Flight</span>
                          <span className="font-mono tabular-nums">
                            ${cc.previousFlightCost} → ${cc.currentFlightCost}
                            <DeltaSpan value={cc.currentFlightCost! - cc.previousFlightCost!} lowerIsBetter />
                          </span>
                        </div>
                      )}
                      {stayChanged && (
                        <div className="flex justify-between text-[var(--text-1)] ml-2">
                          <span className="text-[var(--text-3)]">Stay</span>
                          <span className="font-mono tabular-nums">
                            ${Math.round(cc.previousStayCost!)} → ${Math.round(cc.currentStayCost)}
                            <DeltaSpan value={Math.round(cc.currentStayCost - cc.previousStayCost!)} lowerIsBetter />
                          </span>
                        </div>
                      )}
                      {ppChanged && (
                        <div className="flex justify-between text-[var(--text-1)] ml-2">
                          <span className="text-[var(--text-3)]">Per person</span>
                          <span className="font-mono tabular-nums">
                            ${Math.round(cc.previousPerPerson!)} → ${Math.round(cc.currentPerPerson!)}
                            <DeltaSpan value={Math.round(cc.currentPerPerson! - cc.previousPerPerson!)} lowerIsBetter />
                          </span>
                        </div>
                      )}
                      {showAvg && (
                        <div className="flex justify-between text-[var(--text-1)] ml-2">
                          <span className="text-[var(--text-3)]">Market avg</span>
                          <span className="font-mono tabular-nums text-[var(--text-3)]">
                            ${Math.round(cc.previousCityAvg!)} → ${Math.round(cc.currentCityAvg!)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Airbnb changes */}
          {!isNew && (info.airbnbChange || (info.previousAirbnbCount !== null && info.previousAirbnbCount !== info.currentAirbnbCount)) && (
            <>
              <div className="border-t border-[var(--border-default)] my-1.5" />
              <div className="font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider text-[9px] mb-1">
                Accommodation
              </div>
              {info.airbnbChange?.selectionChanged && (
                <div className="space-y-0.5 mb-1">
                  <div className="text-[var(--text-2)]">Selected stay changed</div>
                  {info.airbnbChange.previousName && (
                    <div className="text-[var(--text-3)] text-[10px] truncate">
                      was: {info.airbnbChange.previousName}
                    </div>
                  )}
                  {info.airbnbChange.currentName && (
                    <div className="text-[var(--text-2)] text-[10px] truncate">
                      now: {info.airbnbChange.currentName}
                    </div>
                  )}
                </div>
              )}
              {info.airbnbChange && info.airbnbChange.previousCostPerNight !== null && info.airbnbChange.currentCostPerNight !== null && (
                <div className="flex justify-between text-[var(--text-1)]">
                  <span className="text-[var(--text-3)]">Cost/night</span>
                  <span className="font-mono tabular-nums">
                    ${Math.round(info.airbnbChange.previousCostPerNight)} → ${Math.round(info.airbnbChange.currentCostPerNight)}
                    <DeltaSpan value={Math.round(info.airbnbChange.currentCostPerNight - info.airbnbChange.previousCostPerNight)} lowerIsBetter />
                  </span>
                </div>
              )}
              {info.previousAirbnbCount !== null && info.previousAirbnbCount !== info.currentAirbnbCount && (
                <div className="flex justify-between text-[var(--text-1)]">
                  <span className="text-[var(--text-3)]">Listings</span>
                  <span className="font-mono tabular-nums">
                    {info.previousAirbnbCount} → {info.currentAirbnbCount}
                    <DeltaSpan value={info.currentAirbnbCount - info.previousAirbnbCount} prefix="" />
                  </span>
                </div>
              )}
            </>
          )}

          {/* Fairness: cost variance */}
          {showVariance && !isNew && info.previousCostVariance !== null && info.currentCostVariance !== null && (
            <>
              <div className="border-t border-[var(--border-default)] my-1.5" />
              <div className="font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider text-[9px] mb-1">
                Cost fairness
              </div>
              <div className="flex justify-between text-[var(--text-1)]">
                <span className="text-[var(--text-3)]">Cost spread</span>
                <span className="font-mono tabular-nums">
                  ${Math.round(Math.sqrt(info.previousCostVariance))} → ${Math.round(Math.sqrt(info.currentCostVariance))}
                  <DeltaSpan value={Math.round(Math.sqrt(info.currentCostVariance) - Math.sqrt(info.previousCostVariance))} lowerIsBetter />
                </span>
              </div>
              <div className="text-[var(--text-3)] text-[10px] mt-0.5">
                Lower spread = fairer costs across cities
              </div>
            </>
          )}

          {/* Best value: airbnb rating */}
          {showRating && !isNew && (
            <>
              {(info.previousAirbnbRating !== null || info.currentAirbnbRating !== null) && (
                <>
                  <div className="border-t border-[var(--border-default)] my-1.5" />
                  <div className="font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider text-[9px] mb-1">
                    Stay quality
                  </div>
                  {info.previousAirbnbRating !== null && info.currentAirbnbRating !== null && (
                    <div className="flex justify-between text-[var(--text-1)]">
                      <span className="text-[var(--text-3)]">Rating</span>
                      <span className="font-mono tabular-nums">
                        {info.previousAirbnbRating.toFixed(1)} → {info.currentAirbnbRating.toFixed(1)}
                        <DeltaSpan value={Math.round((info.currentAirbnbRating - info.previousAirbnbRating) * 10) / 10} prefix="" />
                      </span>
                    </div>
                  )}
                  {info.previousAirbnbReviews !== null && info.currentAirbnbReviews !== null &&
                    info.previousAirbnbReviews !== info.currentAirbnbReviews && (
                    <div className="flex justify-between text-[var(--text-1)]">
                      <span className="text-[var(--text-3)]">Reviews</span>
                      <span className="font-mono tabular-nums">
                        {info.previousAirbnbReviews} → {info.currentAirbnbReviews}
                        <DeltaSpan value={info.currentAirbnbReviews - info.previousAirbnbReviews} prefix="" />
                      </span>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DeltaSpan({ value, lowerIsBetter = false, prefix = "$" }: { value: number; lowerIsBetter?: boolean; prefix?: string }) {
  if (value === 0) return null;
  const good = lowerIsBetter ? value < 0 : value > 0;
  return (
    <span className={good ? " text-[var(--teal)]" : " text-[var(--red)]"}>
      {" "}{value > 0 ? "+" : "-"}{prefix}{Math.abs(value).toLocaleString()}
    </span>
  );
}
