"use client";

import { useState, useMemo, useRef, useCallback, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { useTravelInsights, InsightsData, MonthInsight, MonthEvent, DailyAvg } from "@/lib/hooks/use-travel-insights";

export type { InsightsData, MonthInsight, MonthEvent, DailyAvg };

export interface SelectedMonth {
  month: number; // 1-12
  year: number;
}

export type UnitSystem = "metric" | "imperial";

interface TravelInsightsProps {
  lat: number;
  lng: number;
  cityName: string;
  onMonthsChange?: (months: SelectedMonth[]) => void;
  /** Max number of months the user can select (default 3) */
  maxSelections?: number;
  /** If provided, skip internal fetch and use this data */
  data?: InsightsData | null;
  loading?: boolean;
  /** Unit system for temperature and precipitation (default "imperial") */
  unitSystem?: UnitSystem;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const RECOMMENDATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  great: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  good: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  okay: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  avoid: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
};

const TOURISM_SEASON_LABELS: Record<string, string> = {
  peak: "Peak season",
  shoulder: "Shoulder season",
  off: "Off season",
  unknown: "",
};

function getCalendarSeason(month: number, lat: number): string {
  // Northern hemisphere
  const seasons = lat >= 0
    ? { 12: "Winter", 1: "Winter", 2: "Winter", 3: "Spring", 4: "Spring", 5: "Spring", 6: "Summer", 7: "Summer", 8: "Summer", 9: "Fall", 10: "Fall", 11: "Fall" }
    : { 12: "Summer", 1: "Summer", 2: "Summer", 3: "Fall", 4: "Fall", 5: "Fall", 6: "Winter", 7: "Winter", 8: "Winter", 9: "Spring", 10: "Spring", 11: "Spring" };
  return seasons[month as keyof typeof seasons] ?? "";
}

const CROWD_LABELS: Record<number, string> = {
  1: "Very quiet",
  2: "Quiet",
  3: "Moderate",
  4: "Busy",
  5: "Very crowded",
};


export function WeatherIcon({ precipMm, highC, className = "w-4 h-4" }: { precipMm: number; highC: number; className?: string }) {
  if (precipMm > 120) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 19v2m4-2v2m4-2v2" />
      </svg>
    );
  }
  if (highC > 30 && precipMm < 50) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );
  }
  if (highC < 10) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v18m-6-6l6 6 6-6M6 9l6-6 6 6M3 12h18" />
      </svg>
    );
  }
  if (precipMm > 50) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

export function CrowdBar({ level, showLabel = false, size = "sm" }: { level: number; showLabel?: boolean; size?: "sm" | "md" }) {
  const color = level >= 4 ? "bg-amber-400" : level >= 3 ? "bg-blue-400" : "bg-emerald-400";
  const barClass = size === "md" ? "w-2.5 h-3.5" : "w-1.5 h-3";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`${barClass} rounded-sm transition-colors ${
              i <= level ? color : "bg-[var(--surface-3)]"
            }`}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-[10px] text-[var(--text-2)]">{CROWD_LABELS[level]}</span>
      )}
    </div>
  );
}

export function formatTemp(c: number, unit: UnitSystem): string {
  if (unit === "imperial") return `${Math.round(c * 9 / 5 + 32)}°F`;
  return `${Math.round(c)}°C`;
}

export function formatRain(mm: number, unit: UnitSystem): string {
  if (unit === "imperial") return `${(mm / 25.4).toFixed(1)}in`;
  return `${Math.round(mm)}mm`;
}

function getRecommendationReason(m: { avgHighC: number; precipitationMm: number; crowd: number; season: string; recommendation: string }): string {
  const pros: string[] = [];
  const cons: string[] = [];

  // Temperature
  const high = m.avgHighC;
  if (high >= 20 && high <= 28) pros.push("pleasant temps");
  else if (high >= 15 && high <= 32) pros.push("mild temps");
  else if (high > 35) cons.push("extreme heat");
  else if (high > 32) cons.push("very hot");
  else if (high < 10) cons.push("cold weather");

  // Rain
  if (m.precipitationMm < 30) pros.push("low rainfall");
  else if (m.precipitationMm > 150) cons.push("heavy rain");
  else if (m.precipitationMm > 100) cons.push("rainy");

  // Crowds
  if (m.crowd > 0) {
    if (m.crowd <= 2) pros.push("few crowds");
    else if (m.crowd >= 5) cons.push("very crowded");
    else if (m.crowd >= 4) cons.push("crowded");
  }

  // Season
  if (m.season === "shoulder") pros.push("shoulder season");
  else if (m.season === "off") pros.push("off season");

  if (pros.length === 0 && cons.length === 0) return "";

  const parts: string[] = [];
  if (pros.length > 0) parts.push(pros.join(", "));
  if (cons.length > 0) parts.push(cons.length === 1 ? `but ${cons[0]}` : `but ${cons.join(" & ")}`);

  // Capitalize first letter
  const result = parts.join(" — ");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function formatEventDate(date: string): string {
  // Handle YYYY-MM-DD format from Nager.Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const d = new Date(date + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  // Already a human-readable string from Gemini (e.g. "Mar 15-22")
  return date;
}

export function TravelInsights({ lat, lng, cityName, onMonthsChange, maxSelections = 3, data: externalData, loading: externalLoading, unitSystem = "imperial" }: TravelInsightsProps) {
  const internal = useTravelInsights(
    externalData !== undefined ? null : lat,
    externalData !== undefined ? null : lng,
    externalData !== undefined ? "" : cityName
  );

  const data = externalData !== undefined ? externalData : internal.data;
  const loading = externalLoading !== undefined ? externalLoading : internal.loading;
  const error = externalData !== undefined ? null : internal.error;

  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; arrowLeft: number; flipped: boolean } | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<SelectedMonth[]>([]);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRectRef = useRef<DOMRect | null>(null);

  const toggleMonth = useCallback((month: number, year: number) => {
    if (!onMonthsChange) return;
    setSelectedMonths(prev => {
      const exists = prev.findIndex(s => s.month === month && s.year === year);
      let next: SelectedMonth[];
      if (exists >= 0) {
        next = prev.filter((_, i) => i !== exists);
      } else if (prev.length >= maxSelections) {
        // Replace oldest selection
        next = [...prev.slice(1), { month, year }];
      } else {
        next = [...prev, { month, year }];
      }
      onMonthsChange(next);
      return next;
    });
  }, [onMonthsChange, maxSelections]);

  const handleMouseEnter = useCallback((month: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    buttonRectRef.current = rect;
    const tooltipW = 480; // wide horizontal layout
    let left = rect.left + rect.width / 2 - tooltipW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipW - 8));
    const arrowLeft = rect.left + rect.width / 2 - left;
    setTooltipPos({ top: rect.bottom + 8, left, arrowLeft, flipped: false });
    setHoveredMonth(month);
  }, []);

  // After tooltip renders, check if it overflows the viewport and flip above if needed
  useEffect(() => {
    if (!tooltipRef.current || !buttonRectRef.current || !tooltipPos) return;
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;
    if (tooltipRect.bottom > viewportH && !tooltipPos.flipped) {
      const btnRect = buttonRectRef.current;
      setTooltipPos(prev => prev ? {
        ...prev,
        top: btnRect.top - tooltipRect.height - 8,
        flipped: true,
      } : null);
    }
  }, [hoveredMonth, tooltipPos?.flipped]);

  // Reorder months: start from current month, show 12 months rolling with year
  const orderedMonths = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const result: (MonthInsight & { year: number })[] = [];
    for (let i = 0; i < 12; i++) {
      const monthNum = ((currentMonth - 1 + i) % 12) + 1;
      const year = monthNum >= currentMonth ? currentYear : currentYear + 1;
      const m = data.months.find((m) => m.month === monthNum);
      if (m) result.push({ ...m, year });
    }
    return result;
  }, [data]);


  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 border-2 border-[var(--blue)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--text-2)]">Loading travel insights...</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-16 rounded bg-[var(--surface-2)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  const bestMonths = orderedMonths
    .filter(m => m.recommendation === "great")
    .map(m => SHORT_MONTHS[m.month - 1]);

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-default)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            <span className="text-sm font-heading font-semibold text-[var(--text-1)]">When to Visit</span>
          </div>
          <div className="flex items-center gap-2">
            {bestMonths.length > 0 && (
              <span className="text-[10px] text-emerald-400 font-medium">
                Best: {bestMonths.join(", ")}
              </span>
            )}
          </div>
        </div>
        {data.notes && (
          <p className="text-[11px] text-[var(--text-3)] mt-1">{data.notes}</p>
        )}
      </div>

      {/* Month grid */}
      <div className="p-3">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {orderedMonths.map((m) => {
            const colors = RECOMMENDATION_COLORS[m.recommendation];
            const isSelected = selectedMonths.some(s => s.month === m.month && s.year === m.year);

            return (
              <button
                key={m.month}
                onMouseEnter={(e) => handleMouseEnter(m.month, e)}
                onMouseLeave={() => setHoveredMonth(null)}
                onClick={() => toggleMonth(m.month, m.year)}
                className={`w-full relative rounded-lg border-2 p-2.5 text-left transition-all duration-150 flex flex-col ${
                  isSelected
                    ? "border-[var(--blue)] ring-1 ring-[var(--blue)] bg-[var(--blue)]/10"
                    : `${colors.bg} ${colors.border}`
                } hover:brightness-110 ${
                  onMonthsChange ? "cursor-pointer" : ""
                }`}
              >
                {/* Selected check */}
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--blue)] flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Row 1: month/year */}
                <div className="text-[11px] font-heading font-semibold text-[var(--text-1)] mb-1.5">
                  {SHORT_MONTHS[m.month - 1]} <span className="text-[9px] font-normal text-[var(--text-3)]">&apos;{String(m.year).slice(-2)}</span>
                </div>

                {/* Row 2: temp */}
                <div className="flex items-center gap-1.5 h-5 mb-1">
                  {data.hasWeatherData ? (
                    <>
                      <WeatherIcon precipMm={m.precipitationMm} highC={m.avgHighC} className={`w-3.5 h-3.5 ${colors.text}`} />
                      <span className="text-[11px] font-mono tabular-nums text-[var(--text-1)]">
                        {formatTemp(m.avgHighC, unitSystem)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[9px] text-[var(--text-3)]">—</span>
                  )}
                </div>

                {/* Row 3: crowd */}
                <div className="h-4 flex items-center">
                  {m.crowd > 0 ? (
                    <CrowdBar level={m.crowd} />
                  ) : (
                    <span className="text-[8px] text-[var(--text-3)]">—</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-[var(--border-default)]">
          {(["great", "good", "okay", "avoid"] as const).map((r) => (
            <div key={r} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-sm ${RECOMMENDATION_COLORS[r].bg} border ${RECOMMENDATION_COLORS[r].border}`} />
              <span className="text-[10px] text-[var(--text-3)] capitalize">{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed-position tooltip — rendered outside the grid to avoid layout shift */}
      {hoveredMonth !== null && tooltipPos && (() => {
        const m = orderedMonths.find(om => om.month === hoveredMonth);
        if (!m) return null;
        const colors = RECOMMENDATION_COLORS[m.recommendation];

        // Filter events to this tile's year
        const tileEvents = m.events.filter(e => {
          if (e.type === "holiday" && e.date && /^\d{4}-/.test(e.date)) {
            return e.date.startsWith(String(m.year));
          }
          return true;
        });

        const holidays = tileEvents.filter(e => e.type === "holiday");
        const festivals = tileEvents.filter(e => e.type !== "holiday");
        const hasEvents = tileEvents.length > 0;

        return createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[9999] w-[480px] p-3 rounded-lg border border-[var(--border-hover)] bg-[var(--surface-2)] shadow-xl pointer-events-none"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            {/* Arrow */}
            <div
              className={`absolute w-2 h-2 bg-[var(--surface-2)] border-[var(--border-hover)] ${
                tooltipPos.flipped
                  ? "border-b border-r rotate-45"
                  : "border-l border-t rotate-45"
              }`}
              style={{
                ...(tooltipPos.flipped ? { bottom: -5 } : { top: -5 }),
                left: Math.max(8, Math.min(tooltipPos.arrowLeft, 480 - 8)),
              }}
            />

            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-heading font-semibold text-[var(--text-1)]">{m.label} {m.year}</span>
                <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                  {m.recommendation}
                </span>
              </div>
              {(() => {
                const reason = getRecommendationReason(m);
                return reason ? (
                  <span className="text-[10px] text-[var(--text-3)] italic">{reason}</span>
                ) : null;
              })()}
            </div>

            {/* Horizontal 3-column layout */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3">

              {/* Column 1: Weather */}
              {data.hasWeatherData ? (
                <div>
                  <div className="text-[8px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1">Weather</div>
                  <div className="grid grid-cols-[36px_1fr_1fr_1fr] gap-x-1.5 gap-y-0.5">
                    <div />
                    <div className="text-[9px] text-[var(--text-3)]">High</div>
                    <div className="text-[9px] text-[var(--text-3)]">Low</div>
                    <div className="text-[9px] text-[var(--text-3)]">Rain</div>
                    {m.yearly && m.yearly.map((yw) => (
                      <Fragment key={yw.year}>
                        <div className="text-[9px] font-mono text-[var(--text-3)]">{yw.year}</div>
                        <div className="text-[10px] font-mono text-[var(--text-2)]">{formatTemp(yw.highC, unitSystem)}</div>
                        <div className="text-[10px] font-mono text-[var(--text-2)]">{formatTemp(yw.lowC, unitSystem)}</div>
                        <div className="text-[10px] font-mono text-[var(--text-2)]">{formatRain(yw.precipMm, unitSystem)}</div>
                      </Fragment>
                    ))}
                    <div className="col-span-4 border-t border-[var(--border-default)] my-0.5" />
                    <div className="text-[9px] font-mono font-semibold text-[var(--text-2)]">Avg</div>
                    <div className="text-[10px] font-mono font-semibold text-[var(--text-1)]">{formatTemp(m.avgHighC, unitSystem)}</div>
                    <div className="text-[10px] font-mono font-semibold text-[var(--text-1)]">{formatTemp(m.avgLowC, unitSystem)}</div>
                    <div className="text-[10px] font-mono font-semibold text-[var(--text-1)]">{formatRain(m.precipitationMm, unitSystem)}</div>
                  </div>
                  <div className="text-[8px] text-[var(--text-3)] mt-1 italic">Based on 3-year historical avg</div>
                </div>
              ) : (
                <div>
                  <div className="text-[8px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1">Weather</div>
                  <span className="text-[10px] text-[var(--text-3)]">No data</span>
                </div>
              )}

              {/* Column 2: Crowds + Season */}
              <div className="border-l border-[var(--border-default)] pl-3">
                <div className="text-[8px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1">Crowds</div>
                {m.crowd > 0 ? (
                  <div className="space-y-1">
                    <CrowdBar level={m.crowd} showLabel size="md" />
                  </div>
                ) : (
                  <span className="text-[10px] text-[var(--text-3)]">No data</span>
                )}
                <div className="mt-2">
                  <div className="text-[8px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-0.5">Season</div>
                  <span className="text-[10px] text-[var(--text-2)]">{getCalendarSeason(m.month, lat)}</span>
                  {m.season !== "unknown" && (
                    <span className="text-[9px] text-[var(--text-3)]"> · {TOURISM_SEASON_LABELS[m.season]}</span>
                  )}
                </div>
              </div>

              {/* Column 3: Holidays & Festivals */}
              <div className="border-l border-[var(--border-default)] pl-3 space-y-1.5">
                <div className="text-[8px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-0.5">Events</div>
                {!hasEvents && (
                  <span className="text-[10px] text-[var(--text-3)]">None this month</span>
                )}
                {holidays.length > 0 && (
                  <div>
                    <div className="text-[8px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-0.5">Holidays</div>
                    {holidays.map((e, i) => (
                      <div key={`h-${i}`} className="flex items-start gap-1 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5 shrink-0" />
                        <span className="text-[var(--text-1)]">
                          <strong>{e.name}</strong>
                          {e.date && <span className="text-[var(--text-3)]"> — {formatEventDate(e.date)}</span>}
                          {!e.date && e.description && <span className="text-[var(--text-3)]"> — {e.description}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {festivals.length > 0 && (
                  <div>
                    <div className="text-[8px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-0.5">Festivals</div>
                    {festivals.map((e, i) => (
                      <div key={`f-${i}`} className="flex items-start gap-1 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--blue)] mt-0.5 shrink-0" />
                        <span className="text-[var(--text-1)]">
                          <strong>{e.name}</strong>
                          {e.date && <span className="text-[var(--text-3)]"> — {e.date}</span>}
                          {e.description && <span className="text-[var(--text-3)]">{e.date ? " · " : " — "}{e.description}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {onMonthsChange && (
              <div className="mt-2 pt-1.5 border-t border-[var(--border-default)] text-center">
                <span className="text-[9px] text-[var(--text-3)]">
                  Click to {selectedMonths.some(s => s.month === m.month && s.year === m.year) ? "deselect" : "select"} · {selectedMonths.length}/{maxSelections} chosen
                </span>
              </div>
            )}
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
