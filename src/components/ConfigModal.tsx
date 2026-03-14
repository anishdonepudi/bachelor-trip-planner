"use client";

import { useState, useMemo } from "react";
import { CityConfig } from "@/lib/types";
import { CITY_AIRPORTS } from "@/lib/airports";
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
  onSave: (cities: CityConfig[], excludedDates: string[], destinationAirport: string, destinationCity: string) => void;
  inlineMode?: boolean;
}

type Tab = "group" | "dates";

export function ConfigModal({ cities: initialCities, excludedDates: initialExcluded, destinationAirport: initialDestination, destinationCity: initialDestinationCity, onSave, inlineMode = false }: ConfigModalProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("group");
  const [cities, setCities] = useState<CityConfig[]>(initialCities);
  const [excludedDates, setExcludedDates] = useState<string[]>(initialExcluded);
  const [destinationAirport, setDestinationAirport] = useState(initialDestination);
  const [destinationCity, setDestinationCity] = useState(initialDestinationCity);
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setCities(initialCities);
      setExcludedDates(initialExcluded);
      setDestinationAirport(initialDestination);
      setDestinationCity(initialDestinationCity);
      setActiveTab("group");
    }
    setOpen(isOpen);
  };

  const totalPeople = cities.reduce((sum, c) => sum + c.people, 0);
  const hasChanges =
    JSON.stringify(cities) !== JSON.stringify(initialCities) ||
    JSON.stringify(excludedDates.slice().sort()) !== JSON.stringify(initialExcluded.slice().sort()) ||
    destinationAirport !== initialDestination ||
    destinationCity !== initialDestinationCity;
  const citiesChanged =
    JSON.stringify(cities) !== JSON.stringify(initialCities) ||
    destinationAirport !== initialDestination ||
    destinationCity !== initialDestinationCity;

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const total = cities.reduce((sum, c) => sum + c.people, 0);
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cities, destination_airport: destinationAirport, destination_city: destinationCity, total_people: total, excluded_dates: excludedDates, skip_scrape: !citiesChanged }),
      });
      if (res.ok) { onSave(cities, excludedDates, destinationAirport, destinationCity); setOpen(false); }
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
        ) : (
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
        )}
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
        <button onClick={handleSave} disabled={saving || !hasChanges}
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
