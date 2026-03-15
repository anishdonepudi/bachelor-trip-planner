"use client";

import { useMemo } from "react";
import { SelectedMonth, TripDuration } from "@/lib/types";
import { generateDateRanges } from "@/lib/date-ranges";

interface BlockedDatesFormProps {
  selectedMonths: SelectedMonth[];
  tripDuration: TripDuration;
  excludedDates: string[];
  onSelectedMonthsChange: (months: SelectedMonth[]) => void;
  onTripDurationChange: (duration: TripDuration) => void;
  onExcludedDatesChange: (dates: string[]) => void;
  onEdited?: () => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function BlockedDatesForm({
  selectedMonths, tripDuration, excludedDates,
  onSelectedMonthsChange, onTripDurationChange, onExcludedDatesChange,
  onEdited,
}: BlockedDatesFormProps) {
  const potentialTrips = useMemo(() => generateDateRanges(tripDuration, selectedMonths), [selectedMonths, tripDuration]);

  const seasonDates = useMemo(() => {
    if (selectedMonths.length === 0) return [];
    const dates: { date: string; dayOfWeek: number; month: string }[] = [];
    const sorted = [...selectedMonths].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    for (const sm of sorted) {
      const current = new Date(sm.year, sm.month - 1, 1);
      const end = new Date(sm.year, sm.month, 0);
      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        dates.push({ date: `${y}-${m}-${d}`, dayOfWeek: current.getDay(), month: current.toLocaleDateString("en-US", { month: "long", year: "numeric" }) });
        current.setDate(current.getDate() + 1);
      }
    }
    return dates;
  }, [selectedMonths]);

  const monthGroups = useMemo(() => {
    const groups: { month: string; dates: typeof seasonDates }[] = [];
    for (const d of seasonDates) {
      const last = groups[groups.length - 1];
      if (last && last.month === d.month) last.dates.push(d);
      else groups.push({ month: d.month, dates: [d] });
    }
    return groups;
  }, [seasonDates]);

  const tripDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const trip of potentialTrips) {
      const current = new Date(trip.departDate + "T00:00:00");
      const end = new Date(trip.returnDate + "T00:00:00");
      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        set.add(`${y}-${m}-${d}`);
        current.setDate(current.getDate() + 1);
      }
    }
    return set;
  }, [potentialTrips]);

  const remainingTrips = useMemo(() => {
    if (excludedDates.length === 0) return potentialTrips.length;
    const excludedSet = new Set(excludedDates);
    return potentialTrips.filter((trip) => {
      const start = new Date(trip.departDate + "T00:00:00");
      const end = new Date(trip.returnDate + "T00:00:00");
      const current = new Date(start);
      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        if (excludedSet.has(`${y}-${m}-${d}`)) return false;
        current.setDate(current.getDate() + 1);
      }
      return true;
    }).length;
  }, [potentialTrips, excludedDates]);

  const tripPositionMap = useMemo(() => {
    const map = new Map<string, { isStart: boolean; isEnd: boolean }>();
    for (const trip of potentialTrips) {
      const current = new Date(trip.departDate + "T00:00:00");
      const end = new Date(trip.returnDate + "T00:00:00");
      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        const key = `${y}-${m}-${d}`;
        const existing = map.get(key);
        const isStart = current.getTime() === new Date(trip.departDate + "T00:00:00").getTime();
        const isEnd = current.getTime() === end.getTime();
        map.set(key, {
          isStart: existing ? existing.isStart || isStart : isStart,
          isEnd: existing ? existing.isEnd || isEnd : isEnd,
        });
        current.setDate(current.getDate() + 1);
      }
    }
    return map;
  }, [potentialTrips]);

  const toggleDate = (date: string) => {
    onEdited?.();
    onExcludedDatesChange(
      excludedDates.includes(date)
        ? excludedDates.filter((d) => d !== date)
        : [...excludedDates, date]
    );
  };

  return (
    <>
      {/* Trip Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
          <label className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2 block">Nights</label>
          <div className="flex items-center justify-center">
            <button onClick={() => { onEdited?.(); onTripDurationChange({ ...tripDuration, nights: Math.max(1, tripDuration.nights - 1) }); }}
              className="w-9 h-9 rounded-l-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
            </button>
            <div className="w-12 h-9 bg-[var(--surface-2)] border-y border-[var(--border-default)] flex items-center justify-center">
              <span className="text-base font-semibold font-mono tabular-nums text-[var(--text-1)]">{tripDuration.nights}</span>
            </div>
            <button onClick={() => { onEdited?.(); onTripDurationChange({ ...tripDuration, nights: Math.min(14, tripDuration.nights + 1) }); }}
              className="w-9 h-9 rounded-r-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        </div>
        <div className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
          <label className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2 block">
            Depart on <span className="normal-case font-normal text-[var(--text-3)]">(up to 2)</span>
          </label>
          <div className="flex flex-wrap gap-1">
            {DAY_NAMES.map((name, dayIndex) => {
              const isSelected = tripDuration.departDays.includes(dayIndex);
              return (
                <button key={dayIndex}
                  onClick={() => {
                    onEdited?.();
                    if (isSelected) {
                      if (tripDuration.departDays.length <= 1) return;
                      onTripDurationChange({ ...tripDuration, departDays: tripDuration.departDays.filter(d => d !== dayIndex) });
                    } else {
                      if (tripDuration.departDays.length >= 2) return;
                      onTripDurationChange({ ...tripDuration, departDays: [...tripDuration.departDays, dayIndex].sort() });
                    }
                  }}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 border ${
                    isSelected
                      ? "bg-[var(--blue)] text-white border-[var(--blue)] shadow-sm"
                      : tripDuration.departDays.length >= 2
                        ? "bg-[var(--surface-2)] text-[var(--text-3)] border-[var(--border-default)] cursor-not-allowed opacity-50"
                        : "bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border-default)] hover:border-[var(--border-hover)] hover:text-[var(--text-1)]"
                  }`}>
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Months Display */}
      {selectedMonths.length > 0 && (
        <div className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
          <div className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Selected Months</div>
          <div className="flex flex-wrap gap-1.5">
            {[...selectedMonths]
              .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
              .map((sm) => (
                <span
                  key={`${sm.month}-${sm.year}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--blue-soft)] text-[var(--blue)] border border-[var(--blue-border)] text-xs font-medium"
                >
                  {MONTH_NAMES[sm.month - 1]} {sm.year}
                  <button
                    onClick={() => {
                      onEdited?.();
                      onSelectedMonthsChange(selectedMonths.filter(s => !(s.month === sm.month && s.year === sm.year)));
                    }}
                    className="hover:text-[var(--text-1)] transition-colors duration-150"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-2)]">Tap highlighted dates to block them.</p>
        <span className="text-[10px] text-[var(--text-3)] font-mono tabular-nums shrink-0 ml-2">{remainingTrips} of {potentialTrips.length} options</span>
      </div>
      <div className="space-y-4">
        {monthGroups.map((group) => {
          const firstDow = group.dates[0].dayOfWeek;
          return (
            <div key={group.month}>
              <div className="text-sm font-heading font-semibold text-[var(--text-1)] mb-1.5">{group.month}</div>
              <div className="grid grid-cols-7 gap-0.5">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-center text-[10px] text-[var(--text-3)] font-medium py-1">{d}</div>
                ))}
                {Array.from({ length: firstDow }).map((_, i) => <div key={`pad-${i}`} />)}
                {group.dates.map((d) => {
                  const excluded = excludedDates.includes(d.date);
                  const dayNum = new Date(d.date + "T00:00:00").getDate();
                  const inTrip = tripDateSet.has(d.date);
                  const pos = tripPositionMap.get(d.date);
                  if (!inTrip) {
                    return <div key={d.date} className="py-2 flex items-center justify-center rounded text-sm min-h-[36px] text-[var(--text-3)] opacity-30">{dayNum}</div>;
                  }
                  return (
                    <button key={d.date} onClick={() => toggleDate(d.date)}
                      className={`py-2 flex items-center justify-center text-sm transition-all duration-100 min-h-[36px] relative ${
                        pos?.isStart && pos?.isEnd ? "rounded" : pos?.isStart ? "rounded-l" : pos?.isEnd ? "rounded-r" : ""
                      } ${excluded
                        ? "bg-[var(--red-soft)] text-[var(--red)] font-semibold ring-1 ring-[var(--red-border)] rounded"
                        : "bg-[var(--blue-soft)] text-[var(--text-1)] hover:brightness-95"
                      }`}>
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {excludedDates.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-md bg-[var(--red-soft)] border border-[var(--red-border)]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)]" />
            <span className="text-xs text-[var(--red)]">{excludedDates.length} blocked</span>
          </div>
          <button onClick={() => { onEdited?.(); onExcludedDatesChange([]); }}
            className="text-[11px] text-[var(--red)] opacity-70 hover:opacity-100 font-medium">Clear</button>
        </div>
      )}
    </>
  );
}
