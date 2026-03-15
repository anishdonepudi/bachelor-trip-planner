"use client";

import { FlightCategoryConfig, FlightTimeFilters } from "@/lib/types";
import { generateCategoryId, generateCategoryLabel } from "@/lib/constants";

interface FlightPreferencesFormProps {
  flightCategories: FlightCategoryConfig[];
  timeFilters: FlightTimeFilters;
  onFlightCategoriesChange: (categories: FlightCategoryConfig[]) => void;
  onTimeFiltersChange: (filters: FlightTimeFilters) => void;
  onEdited?: () => void;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export function FlightPreferencesForm({
  flightCategories, timeFilters,
  onFlightCategoriesChange, onTimeFiltersChange,
  onEdited,
}: FlightPreferencesFormProps) {
  const addFlightCategory = () => {
    onEdited?.();
    const combos: Array<{ stops: 0 | 1 | 2; bags: "carryon" | "none" }> = [
      { stops: 0, bags: "carryon" }, { stops: 0, bags: "none" },
      { stops: 1, bags: "carryon" }, { stops: 1, bags: "none" },
      { stops: 2, bags: "carryon" }, { stops: 2, bags: "none" },
    ];
    const unused = combos.find(c => !flightCategories.some(fc => fc.stops === c.stops && fc.bags === c.bags));
    if (!unused) return;
    const id = generateCategoryId(unused.stops, unused.bags);
    const label = generateCategoryLabel(unused.stops, unused.bags);
    onFlightCategoriesChange([...flightCategories, { id, stops: unused.stops, bags: unused.bags, label }]);
  };

  const removeFlightCategory = (index: number) => {
    onEdited?.();
    onFlightCategoriesChange(flightCategories.filter((_, i) => i !== index));
  };

  const updateFlightCategory = (index: number, field: "stops" | "bags", value: 0 | 1 | 2 | "carryon" | "none") => {
    onEdited?.();
    const updated = [...flightCategories];
    if (field === "stops") {
      updated[index] = { ...updated[index], stops: value as 0 | 1 | 2 };
    } else {
      updated[index] = { ...updated[index], bags: value as "carryon" | "none" };
    }
    updated[index].id = generateCategoryId(updated[index].stops, updated[index].bags);
    updated[index].label = generateCategoryLabel(updated[index].stops, updated[index].bags);
    onFlightCategoriesChange(updated);
  };

  const updateTimeFilter = (
    leg: "outboundDeparture" | "outboundArrival" | "returnDeparture" | "returnArrival",
    field: "time" | "plusMinus" | "includeNextDay",
    value: string | number | boolean
  ) => {
    onEdited?.();
    onTimeFiltersChange({ ...timeFilters, [leg]: { ...timeFilters[leg], [field]: value } });
  };

  const hasDuplicateCategories = flightCategories.some((cat, i) =>
    flightCategories.some((other, j) => j !== i && other.stops === cat.stops && other.bags === cat.bags)
  );

  return (
    <>
      {/* Max Duration */}
      <div className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">Max Duration</div>
            <div className="text-[11px] text-[var(--text-3)] mt-0.5">Flights longer than this are excluded</div>
          </div>
          <div className="flex items-center">
            <button onClick={() => { onEdited?.(); onTimeFiltersChange({ ...timeFilters, maxDuration: Math.max(1, timeFilters.maxDuration - 1) }); }}
              className="w-8 h-8 rounded-l-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
            </button>
            <div className="w-14 h-8 bg-[var(--surface-2)] border-y border-[var(--border-default)] flex items-center justify-center">
              <span className="text-sm font-semibold font-mono tabular-nums text-[var(--text-1)]">{timeFilters.maxDuration}hr</span>
            </div>
            <button onClick={() => { onEdited?.(); onTimeFiltersChange({ ...timeFilters, maxDuration: Math.min(24, timeFilters.maxDuration + 1) }); }}
              className="w-8 h-8 rounded-r-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">Categories ({flightCategories.length}/4)</span>
        {flightCategories.length < 4 && (
          <button onClick={addFlightCategory}
            className="text-[11px] text-[var(--blue)] hover:text-[var(--text-1)] font-medium flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {flightCategories.map((cat, i) => {
          const isDuplicate = flightCategories.some((other, j) => j !== i && other.stops === cat.stops && other.bags === cat.bags);
          return (
            <div key={i} className={`relative p-3 rounded-md bg-[var(--surface-1)] border ${isDuplicate ? "border-[var(--red-border)]" : "border-[var(--border-default)]"}`}>
              <div className="space-y-2">
                <div className="flex gap-0.5 p-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border-default)]">
                  {([0, 1, 2] as const).map(s => (
                    <button key={s} onClick={() => updateFlightCategory(i, "stops", s)}
                      className={`flex-1 px-1.5 py-1.5 rounded text-[11px] font-medium transition-all duration-150 ${
                        cat.stops === s ? "bg-[var(--surface-3)] text-[var(--text-1)] shadow-sm" : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                      }`}>
                      {s === 0 ? "Nonstop" : s === 1 ? "1 Stop" : "2 Stops"}
                    </button>
                  ))}
                </div>
                <div className="flex gap-0.5 p-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border-default)]">
                  {(["carryon", "none"] as const).map(b => (
                    <button key={b} onClick={() => updateFlightCategory(i, "bags", b)}
                      className={`flex-1 px-2 py-1.5 rounded text-[11px] font-medium transition-all duration-150 ${
                        cat.bags === b ? "bg-[var(--surface-3)] text-[var(--text-1)] shadow-sm" : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                      }`}>
                      {b === "carryon" ? "Carry-on" : "None"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-3)] font-mono">{cat.label}</span>
                  {flightCategories.length > 1 && (
                    <button onClick={() => removeFlightCategory(i)}
                      className="p-1 rounded text-[var(--text-3)] hover:text-[var(--red)] hover:bg-[var(--red-soft)]">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                {isDuplicate && hasDuplicateCategories && (
                  <div className="text-[10px] text-[var(--red)] flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Duplicate
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time Filters */}
      <div className="mt-1">
        <span className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">Time Filters</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {([
          { key: "outboundDeparture" as const, label: "Outbound Depart", isArrival: false },
          { key: "outboundArrival" as const, label: "Outbound Arrive", isArrival: true },
          { key: "returnDeparture" as const, label: "Return Depart", isArrival: false },
          { key: "returnArrival" as const, label: "Return Arrive", isArrival: true },
        ]).map(({ key, label, isArrival }) => {
          const filter = timeFilters[key];
          const centerMin = parseInt(filter.time.split(":")[0], 10) * 60 + parseInt(filter.time.split(":")[1], 10);
          const rawEarliest = centerMin - filter.plusMinus * 60;
          const rawLatest = centerMin + filter.plusMinus * 60;
          const fmtTime = (m: number) => {
            const clamped = ((m % (24 * 60)) + 24 * 60) % (24 * 60);
            return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
          };

          // Determine if the window extends past midnight
          let earliest: number, latest: number;
          let showNextDay = false;
          let showPrevDay = false;

          if (filter.includeNextDay) {
            if (isArrival && rawLatest > 24 * 60 - 1) {
              earliest = Math.max(0, rawEarliest);
              latest = rawLatest % (24 * 60);
              showNextDay = true;
            } else if (!isArrival && rawEarliest < 0) {
              earliest = (rawEarliest + 24 * 60) % (24 * 60);
              latest = Math.min(24 * 60 - 1, rawLatest);
              showPrevDay = true;
            } else {
              earliest = Math.max(0, rawEarliest);
              latest = Math.min(24 * 60 - 1, rawLatest);
            }
          } else {
            earliest = Math.max(0, rawEarliest);
            latest = Math.min(24 * 60 - 1, rawLatest);
          }

          return (
            <div key={key} className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
              <div className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">{label}</div>
              <div className="flex items-center gap-2">
                <select value={filter.time} onChange={(e) => updateTimeFilter(key, "time", e.target.value)}
                  className="flex-1 h-8 px-2 rounded-md text-xs font-mono bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] appearance-none cursor-pointer">
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="shrink-0 flex items-center">
                  <button onClick={() => updateTimeFilter(key, "plusMinus", Math.max(1, filter.plusMinus - 1))}
                    className="w-7 h-8 rounded-l-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)]">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                  </button>
                  <div className="w-10 h-8 bg-[var(--surface-2)] border-y border-[var(--border-default)] flex items-center justify-center">
                    <span className="text-[11px] font-semibold font-mono tabular-nums text-[var(--text-1)]">&plusmn;{filter.plusMinus}h</span>
                  </div>
                  <button onClick={() => updateTimeFilter(key, "plusMinus", Math.min(12, filter.plusMinus + 1))}
                    className="w-7 h-8 rounded-r-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)]">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <div className="text-[10px] text-[var(--text-3)] font-mono tabular-nums">
                  {showPrevDay && <span className="text-[var(--blue)]">-1d </span>}
                  {fmtTime(earliest)} – {fmtTime(latest)}
                  {showNextDay && <span className="text-[var(--blue)]"> +1d</span>}
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span className="text-[10px] text-[var(--text-3)]">
                    {isArrival ? "+1 day" : "-1 day"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!filter.includeNextDay}
                    onClick={() => updateTimeFilter(key, "includeNextDay", !filter.includeNextDay)}
                    className={`relative w-7 h-4 rounded-full transition-colors duration-200 ${
                      filter.includeNextDay
                        ? "bg-[var(--blue)]"
                        : "bg-[var(--surface-3)] border border-[var(--border-default)]"
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      filter.includeNextDay ? "translate-x-3" : "translate-x-0"
                    }`} />
                  </button>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
