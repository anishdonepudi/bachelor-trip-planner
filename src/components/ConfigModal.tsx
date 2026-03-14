"use client";

import { useState, useMemo } from "react";
import { CityConfig, FlightCategoryConfig, FlightTimeFilters } from "@/lib/types";
import { CITY_AIRPORTS } from "@/lib/airports";
import { generateCategoryId, generateCategoryLabel, DEFAULT_TIME_FILTERS } from "@/lib/constants";
import { CitySelect } from "./CitySelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ConfigModalProps {
  cities: CityConfig[];
  excludedDates: string[];
  destinationAirport: string;
  destinationCity: string;
  flightCategories: FlightCategoryConfig[];
  flightTimeFilters: FlightTimeFilters;
  onSave: (cities: CityConfig[], excludedDates: string[], destinationAirport: string, destinationCity: string, flightCategories: FlightCategoryConfig[], flightTimeFilters: FlightTimeFilters) => void;
  inlineMode?: boolean;
}

type Tab = "group" | "dates" | "flights";

export function ConfigModal({ cities: initialCities, excludedDates: initialExcluded, destinationAirport: initialDestination, destinationCity: initialDestinationCity, flightCategories: initialFlightCategories, flightTimeFilters: initialTimeFilters, onSave, inlineMode = false }: ConfigModalProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("group");
  const [cities, setCities] = useState<CityConfig[]>(initialCities);
  const [excludedDates, setExcludedDates] = useState<string[]>(initialExcluded);
  const [destinationAirport, setDestinationAirport] = useState(initialDestination);
  const [destinationCity, setDestinationCity] = useState(initialDestinationCity);
  const [flightCategories, setFlightCategories] = useState<FlightCategoryConfig[]>(initialFlightCategories);
  const [timeFilters, setTimeFilters] = useState<FlightTimeFilters>(initialTimeFilters);
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setCities(initialCities);
      setExcludedDates(initialExcluded);
      setDestinationAirport(initialDestination);
      setDestinationCity(initialDestinationCity);
      setFlightCategories(initialFlightCategories);
      setTimeFilters(initialTimeFilters);
      setActiveTab("group");
    }
    setOpen(isOpen);
  };

  const totalPeople = cities.reduce((sum, c) => sum + c.people, 0);
  const categoriesChanged = JSON.stringify(flightCategories) !== JSON.stringify(initialFlightCategories);
  const timeFiltersChanged = JSON.stringify(timeFilters) !== JSON.stringify(initialTimeFilters);
  const hasChanges =
    JSON.stringify(cities) !== JSON.stringify(initialCities) ||
    JSON.stringify(excludedDates.slice().sort()) !== JSON.stringify(initialExcluded.slice().sort()) ||
    destinationAirport !== initialDestination ||
    destinationCity !== initialDestinationCity ||
    categoriesChanged ||
    timeFiltersChanged;
  const citiesChanged =
    JSON.stringify(cities) !== JSON.stringify(initialCities) ||
    destinationAirport !== initialDestination ||
    destinationCity !== initialDestinationCity ||
    categoriesChanged ||
    timeFiltersChanged;

  const addCity = () => {
    setCities([...cities, { city: "", people: 1, primaryAirports: [], nearbyAirports: [] }]);
  };

  const removeCity = (index: number) => {
    setCities(cities.filter((_, i) => i !== index));
  };

  const updateCity = (index: number, field: string, value: string | number) => {
    const updated = [...cities];
    if (field === "city") {
      const cityName = value as string;
      updated[index] = {
        ...updated[index],
        city: cityName,
        primaryAirports: CITY_AIRPORTS[cityName]?.primary ?? [],
        nearbyAirports: CITY_AIRPORTS[cityName]?.nearby ?? [],
      };
    } else if (field === "people") {
      updated[index] = { ...updated[index], people: value as number };
    }
    setCities(updated);
  };

  const toggleDate = (date: string) => {
    setExcludedDates((prev) => prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]);
  };

  const seasonDates = useMemo(() => {
    const dates: { date: string; dayOfWeek: number; month: string }[] = [];
    const current = new Date(2026, 5, 1);
    const end = new Date(2026, 7, 31);
    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, "0");
      const d = String(current.getDate()).padStart(2, "0");
      dates.push({ date: `${y}-${m}-${d}`, dayOfWeek: current.getDay(), month: current.toLocaleDateString("en-US", { month: "long" }) });
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, []);

  const monthGroups = useMemo(() => {
    const groups: { month: string; dates: typeof seasonDates }[] = [];
    for (const d of seasonDates) {
      const last = groups[groups.length - 1];
      if (last && last.month === d.month) last.dates.push(d);
      else groups.push({ month: d.month, dates: [d] });
    }
    return groups;
  }, [seasonDates]);

  // Flight category helpers
  const addFlightCategory = () => {
    const combos: Array<{ stops: 0 | 1 | 2; bags: "carryon" | "none" }> = [
      { stops: 0, bags: "carryon" }, { stops: 0, bags: "none" },
      { stops: 1, bags: "carryon" }, { stops: 1, bags: "none" },
      { stops: 2, bags: "carryon" }, { stops: 2, bags: "none" },
    ];
    const unused = combos.find(c => !flightCategories.some(fc => fc.stops === c.stops && fc.bags === c.bags));
    if (!unused) return;
    const id = generateCategoryId(unused.stops, unused.bags);
    const label = generateCategoryLabel(unused.stops, unused.bags);
    setFlightCategories([...flightCategories, { id, stops: unused.stops, bags: unused.bags, label }]);
  };

  const removeFlightCategory = (index: number) => {
    setFlightCategories(flightCategories.filter((_, i) => i !== index));
  };

  const updateFlightCategory = (index: number, field: "stops" | "bags", value: 0 | 1 | 2 | "carryon" | "none") => {
    const updated = [...flightCategories];
    if (field === "stops") {
      updated[index] = { ...updated[index], stops: value as 0 | 1 | 2 };
    } else {
      updated[index] = { ...updated[index], bags: value as "carryon" | "none" };
    }
    // Regenerate id and label
    updated[index].id = generateCategoryId(updated[index].stops, updated[index].bags);
    updated[index].label = generateCategoryLabel(updated[index].stops, updated[index].bags);
    setFlightCategories(updated);
  };

  const hasDuplicateCategories = flightCategories.some((cat, i) =>
    flightCategories.some((other, j) => j !== i && other.stops === cat.stops && other.bags === cat.bags)
  );

  // Time filter helpers
  const updateTimeFilter = (
    leg: "outboundDeparture" | "outboundArrival" | "returnDeparture" | "returnArrival",
    field: "time" | "plusMinus",
    value: string | number
  ) => {
    setTimeFilters(prev => ({
      ...prev,
      [leg]: { ...prev[leg], [field]: value },
    }));
  };

  const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    return `${String(h).padStart(2, "0")}:${m}`;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const total = cities.reduce((sum, c) => sum + c.people, 0);
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cities, destination_airport: destinationAirport, destination_city: destinationCity, total_people: total, excluded_dates: excludedDates, flight_categories: flightCategories, flight_time_filters: timeFilters, skip_scrape: !citiesChanged }),
      });
      if (res.ok) { onSave(cities, excludedDates, destinationAirport, destinationCity, flightCategories, timeFilters); setOpen(false); }
    } finally { setSaving(false); }
  };

  const selectedCityNames = cities.map((c) => c.city).filter(Boolean);

  // Shared content used in both inline and dialog modes
  const configContent = (
    <>
      {/* Tabs */}
      <div className="flex gap-0.5 p-0.5 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)] shrink-0">
        <button
          onClick={() => setActiveTab("group")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded text-sm font-medium transition-all duration-150 ${
            activeTab === "group"
              ? "bg-[var(--surface-3)] text-[var(--text-1)] shadow-sm"
              : "text-[var(--text-2)] hover:text-[var(--text-1)]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          Travel Group
        </button>
        <button
          onClick={() => setActiveTab("dates")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded text-sm font-medium transition-all duration-150 ${
            activeTab === "dates"
              ? "bg-[var(--surface-3)] text-[var(--text-1)] shadow-sm"
              : "text-[var(--text-2)] hover:text-[var(--text-1)]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          Blocked Dates
          {excludedDates.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-[var(--red-soft)] text-[var(--red)] text-[10px] font-bold">{excludedDates.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("flights")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded text-sm font-medium transition-all duration-150 ${
            activeTab === "flights"
              ? "bg-[var(--surface-3)] text-[var(--text-1)] shadow-sm"
              : "text-[var(--text-2)] hover:text-[var(--text-1)]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
          Flights
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto mt-3 min-h-0 scrollbar-thin">
        {activeTab === "group" ? (
          <div className="space-y-2">
            {/* Destination */}
            <div className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)] space-y-2 opacity-50">
              <div>
                <label className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">Destination</label>
                <div className="mt-1 flex gap-2">
                  <input type="text" value={destinationAirport} disabled
                    className="w-16 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-md px-2 py-2 text-sm text-[var(--text-1)] font-mono cursor-not-allowed" />
                  <input type="text" value={destinationCity} disabled
                    className="flex-1 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-md px-2 py-2 text-sm text-[var(--text-1)] cursor-not-allowed" />
                </div>
              </div>
              <p className="text-[11px] text-[var(--text-3)]">Destination editing coming soon</p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-[var(--border-default)]" />
              <span className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">Cities</span>
              <div className="flex-1 h-px bg-[var(--border-default)]" />
            </div>

            {/* City rows */}
            {cities.map((city, i) => (
              <div key={i} className="group relative p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-colors duration-150">
                <div className="flex items-start gap-2.5">
                  <span className="text-[11px] font-mono font-semibold text-[var(--text-3)] w-4 text-right mt-2.5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <CitySelect
                      value={city.city}
                      onChange={(name) => updateCity(i, "city", name)}
                      excludeCities={selectedCityNames.filter((c) => c !== city.city)}
                    />
                  </div>

                  {/* People stepper */}
                  <div className="flex items-center shrink-0">
                    <button onClick={() => updateCity(i, "people", Math.max(1, city.people - 1))}
                      className="w-8 h-8 rounded-l-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <div className="w-10 h-8 bg-[var(--surface-2)] border-y border-[var(--border-default)] flex items-center justify-center">
                      <span className="text-sm font-semibold font-mono tabular-nums text-[var(--text-1)]">{city.people}</span>
                    </div>
                    <button onClick={() => updateCity(i, "people", city.people + 1)}
                      className="w-8 h-8 rounded-r-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  <button onClick={() => removeCity(i)}
                    className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--red)] hover:bg-[var(--red-soft)] transition-colors duration-150 shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            <button onClick={addCity}
              className="w-full py-3 rounded-md border border-dashed border-[var(--border-default)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-1)] transition-all duration-150 text-sm font-medium flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add City
            </button>
          </div>
        ) : activeTab === "dates" ? (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-2)] leading-relaxed">
              Tap dates to block them. Overlapping weekends are excluded from results.
            </p>
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
                        const isWeekend = d.dayOfWeek === 0 || d.dayOfWeek === 6;
                        return (
                          <button
                            key={d.date}
                            onClick={() => toggleDate(d.date)}
                            className={`py-2 flex items-center justify-center rounded text-sm transition-all duration-100 min-h-[36px] ${
                              excluded
                                ? "bg-[var(--red-soft)] text-[var(--red)] font-semibold ring-1 ring-[var(--red-border)]"
                                : isWeekend
                                  ? "text-[var(--text-3)] hover:bg-[var(--surface-2)]"
                                  : "text-[var(--text-1)] hover:bg-[var(--surface-2)]"
                            }`}
                          >
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
                <button onClick={() => setExcludedDates([])}
                  className="text-[11px] text-[var(--red)] opacity-70 hover:opacity-100 transition-opacity duration-150 font-medium">
                  Clear
                </button>
              </div>
            )}
          </div>
        ) : activeTab === "flights" ? (
          <div className="space-y-2">
            {/* Info box */}
            <div className="p-3 rounded-md bg-[var(--blue-soft)] border border-[var(--blue-border)]">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[var(--blue)] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-[var(--blue)] leading-relaxed">
                  Configure max duration, stops and bags per category, and time windows per leg below.
                </div>
              </div>
            </div>

            {/* Max Duration */}
            <div className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-colors duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">Max Duration</div>
                  <div className="text-[11px] text-[var(--text-2)] mt-0.5">Flights longer than this are excluded</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setTimeFilters(prev => ({ ...prev, maxDuration: Math.max(1, prev.maxDuration - 1) }))}
                    className="w-8 h-8 rounded-l-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <div className="w-14 h-8 bg-[var(--surface-2)] border-y border-[var(--border-default)] flex items-center justify-center">
                    <span className="text-sm font-semibold font-mono tabular-nums text-[var(--text-1)]">{timeFilters.maxDuration}hr</span>
                  </div>
                  <button onClick={() => setTimeFilters(prev => ({ ...prev, maxDuration: Math.min(24, prev.maxDuration + 1) }))}
                    className="w-8 h-8 rounded-r-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-[var(--border-default)]" />
              <span className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">Categories ({flightCategories.length}/4)</span>
              <div className="flex-1 h-px bg-[var(--border-default)]" />
            </div>

            {/* Category cards */}
            {flightCategories.map((cat, i) => {
              const isDuplicate = flightCategories.some((other, j) => j !== i && other.stops === cat.stops && other.bags === cat.bags);
              return (
                <div key={i} className={`group relative p-3 rounded-md bg-[var(--surface-1)] border ${isDuplicate ? "border-[var(--red-border)]" : "border-[var(--border-default)] hover:border-[var(--border-hover)]"} transition-colors duration-150`}>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[11px] font-mono font-semibold text-[var(--text-3)] w-4 text-right mt-2.5 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0 space-y-2.5">
                      {/* Stops */}
                      <div>
                        <div className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1">Stops</div>
                        <div className="flex gap-0.5 p-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border-default)] w-fit">
                          {([0, 1, 2] as const).map(s => (
                            <button key={s} onClick={() => updateFlightCategory(i, "stops", s)}
                              className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-150 ${
                                cat.stops === s ? "bg-[var(--surface-3)] text-[var(--text-1)] shadow-sm" : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                              }`}>
                              {s === 0 ? "Nonstop" : s === 1 ? "1 Stop" : "2 Stops"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Bags */}
                      <div>
                        <div className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1">Bags</div>
                        <div className="flex gap-0.5 p-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border-default)] w-fit">
                          {(["carryon", "none"] as const).map(b => (
                            <button key={b} onClick={() => updateFlightCategory(i, "bags", b)}
                              className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-150 ${
                                cat.bags === b ? "bg-[var(--surface-3)] text-[var(--text-1)] shadow-sm" : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                              }`}>
                              {b === "carryon" ? "Carry-on" : "None"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Generated label */}
                      <div className="text-xs text-[var(--text-2)] font-mono">{cat.label}</div>
                      {isDuplicate && (
                        <div className="text-[11px] text-[var(--red)] flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Duplicate category
                        </div>
                      )}
                    </div>

                    {flightCategories.length > 1 && (
                      <button onClick={() => removeFlightCategory(i)}
                        className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--red)] hover:bg-[var(--red-soft)] transition-colors duration-150 shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {flightCategories.length < 4 && (
              <button onClick={addFlightCategory}
                className="w-full py-3 rounded-md border border-dashed border-[var(--border-default)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-1)] transition-all duration-150 text-sm font-medium flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Category
              </button>
            )}

            {/* Time Filters Divider */}
            <div className="flex items-center gap-2 py-1 mt-2">
              <div className="flex-1 h-px bg-[var(--border-default)]" />
              <span className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">Time Filters</span>
              <div className="flex-1 h-px bg-[var(--border-default)]" />
            </div>

            {/* Time filter cards */}
            {([
              { key: "outboundDeparture" as const, label: "Outbound Departure" },
              { key: "outboundArrival" as const, label: "Outbound Arrival" },
              { key: "returnDeparture" as const, label: "Return Departure" },
              { key: "returnArrival" as const, label: "Return Arrival" },
            ]).map(({ key, label }) => {
              const filter = timeFilters[key];
              // Compute the effective window for display
              const centerMin = parseInt(filter.time.split(":")[0], 10) * 60 + parseInt(filter.time.split(":")[1], 10);
              const earliest = Math.max(0, centerMin - filter.plusMinus * 60);
              const latest = Math.min(24 * 60 - 1, centerMin + filter.plusMinus * 60);
              const fmtTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
              return (
                <div key={key} className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-colors duration-150">
                  <div className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">{label}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">Target Time</label>
                      <select
                        value={filter.time}
                        onChange={(e) => updateTimeFilter(key, "time", e.target.value)}
                        className="w-full h-8 px-2 rounded-md text-xs font-mono bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] hover:border-[var(--border-hover)] focus:outline-none focus:border-[var(--border-active)] transition-all duration-150 appearance-none cursor-pointer"
                      >
                        {TIME_OPTIONS.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="shrink-0">
                      <label className="text-[10px] text-[var(--text-3)] mb-0.5 block text-center">&plusmn; Hours</label>
                      <div className="flex items-center">
                        <button onClick={() => updateTimeFilter(key, "plusMinus", Math.max(1, filter.plusMinus - 1))}
                          className="w-7 h-8 rounded-l-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <div className="w-8 h-8 bg-[var(--surface-2)] border-y border-[var(--border-default)] flex items-center justify-center">
                          <span className="text-xs font-semibold font-mono tabular-nums text-[var(--text-1)]">{filter.plusMinus}</span>
                        </div>
                        <button onClick={() => updateTimeFilter(key, "plusMinus", Math.min(12, filter.plusMinus + 1))}
                          className="w-7 h-8 rounded-r-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-[var(--text-3)] mt-1.5 font-mono tabular-nums">
                    Window: {fmtTime(earliest)} - {fmtTime(latest)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="shrink-0 pt-3 mt-3 border-t border-[var(--border-default)] space-y-2">
        {hasChanges && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
            <span className="text-[var(--gold)]">Unsaved changes</span>
            {citiesChanged && <span className="text-[var(--text-3)]">- triggers refresh</span>}
          </div>
        )}
        <button onClick={handleSave} disabled={saving || !hasChanges || (categoriesChanged && hasDuplicateCategories)}
          className="w-full h-11 rounded-md text-sm font-semibold bg-[var(--blue)] text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150">
          {saving ? (
            <span className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </span>
          ) : "Save Changes"}
        </button>
      </div>
    </>
  );

  // Inline mode: render content directly without dialog wrapper
  if (inlineMode) {
    return (
      <div className="flex flex-col h-full">
        <div className="mb-3">
          <h3 className="text-base font-heading font-semibold text-[var(--text-1)]">Trip Configuration</h3>
          <p className="text-xs text-[var(--text-3)] mt-0.5 font-mono tabular-nums">
            {totalPeople} travelers &middot; {cities.filter(c => c.city).length} cities
          </p>
        </div>
        {configContent}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-[var(--surface-2)] border border-[var(--border-default)] text-[var(--text-1)] hover:bg-[var(--surface-3)] hover:border-[var(--border-hover)] transition-all duration-150 text-xs font-medium" />
        }
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Config
      </DialogTrigger>
      <DialogContent
        className="bg-[var(--surface-0)] border-[var(--border-hover)] text-[var(--text-1)] max-w-lg h-[100dvh] sm:max-h-[85vh] sm:h-auto rounded-none sm:rounded-lg overflow-hidden flex flex-col"
        initialFocus={false}
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-[var(--text-1)] text-base font-heading font-semibold">Trip Configuration</DialogTitle>
              <p className="text-[11px] text-[var(--text-3)] mt-0.5 font-mono tabular-nums">
                {totalPeople} travelers &middot; {cities.filter(c => c.city).length} cities
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </DialogHeader>
        {configContent}
      </DialogContent>
    </Dialog>
  );
}
