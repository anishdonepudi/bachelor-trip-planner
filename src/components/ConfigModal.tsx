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
}

type Tab = "group" | "dates";

export function ConfigModal({ cities: initialCities, excludedDates: initialExcluded, destinationAirport: initialDestination, destinationCity: initialDestinationCity, onSave }: ConfigModalProps) {
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
    setCities([
      ...cities,
      { city: "", people: 1, primaryAirports: [], nearbyAirports: [] },
    ]);
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
    setExcludedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const seasonDates = useMemo(() => {
    const dates: { date: string; dayOfWeek: number; month: string }[] = [];
    const current = new Date(2026, 5, 1);
    const end = new Date(2026, 7, 31);
    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, "0");
      const d = String(current.getDate()).padStart(2, "0");
      dates.push({
        date: `${y}-${m}-${d}`,
        dayOfWeek: current.getDay(),
        month: current.toLocaleDateString("en-US", { month: "long" }),
      });
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, []);

  const monthGroups = useMemo(() => {
    const groups: { month: string; dates: typeof seasonDates }[] = [];
    for (const d of seasonDates) {
      const last = groups[groups.length - 1];
      if (last && last.month === d.month) {
        last.dates.push(d);
      } else {
        groups.push({ month: d.month, dates: [d] });
      }
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
        body: JSON.stringify({
          cities,
          destination_airport: destinationAirport,
          destination_city: destinationCity,
          total_people: total,
          excluded_dates: excludedDates,
          skip_scrape: !citiesChanged,
        }),
      });
      if (res.ok) {
        onSave(cities, excludedDates, destinationAirport, destinationCity);
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedCityNames = cities.map((c) => c.city).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-all text-xs font-medium" />
        }
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Configure
      </DialogTrigger>
      <DialogContent
        className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-lg h-[100dvh] sm:max-h-[85vh] sm:h-auto rounded-none sm:rounded-xl overflow-hidden flex flex-col"
        initialFocus={false}
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-zinc-100 text-lg">Trip Configuration</DialogTitle>
              <p className="text-xs text-zinc-500 mt-1">
                {totalPeople} travelers from {cities.filter(c => c.city).length} cities
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 mt-3">
          <button
            onClick={() => setActiveTab("group")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "group"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Travel Group
          </button>
          <button
            onClick={() => setActiveTab("dates")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "dates"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Blocked Dates
            {excludedDates.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-semibold">
                {excludedDates.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto mt-4 min-h-0 pr-3 scrollbar-thin">
          {activeTab === "group" ? (
            <div className="space-y-3">
              {/* Destination */}
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-3 opacity-50">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Destination Airport</label>
                  <input
                    type="text"
                    value={destinationAirport}
                    disabled
                    className="mt-1.5 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono tracking-wider cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Destination City</label>
                  <input
                    type="text"
                    value={destinationCity}
                    disabled
                    className="mt-1.5 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-zinc-600">Destination editing coming soon</p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Departure Cities & Group Size</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {cities.map((city, i) => (
                <div
                  key={i}
                  className="group relative p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Number badge */}
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-semibold text-zinc-400">{i + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <CitySelect
                        value={city.city}
                        onChange={(name) => updateCity(i, "city", name)}
                        excludeCities={selectedCityNames.filter((c) => c !== city.city)}
                      />
                    </div>

                    {/* People stepper */}
                    <div className="flex items-center gap-0 shrink-0">
                      <button
                        onClick={() => updateCity(i, "people", Math.max(1, city.people - 1))}
                        className="w-7 h-7 rounded-l-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <div className="w-10 h-7 bg-zinc-800 border-y border-zinc-700 flex items-center justify-center">
                        <span className="text-sm font-semibold text-zinc-200 font-mono">{city.people}</span>
                      </div>
                      <button
                        onClick={() => updateCity(i, "people", city.people + 1)}
                        className="w-7 h-7 rounded-r-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeCity(i)}
                      className="p-1 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addCity}
                className="w-full py-3 rounded-xl border-2 border-dashed border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900/50 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add City
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Tap dates your group can't travel. Weekends overlapping a blocked date are automatically removed from results.
              </p>

              {/* Calendar — one month per row, full width */}
              <div className="space-y-4">
                {monthGroups.map((group) => {
                  const firstDow = group.dates[0].dayOfWeek;
                  return (
                    <div key={group.month}>
                      <div className="text-sm font-semibold text-zinc-300 mb-2">{group.month}</div>
                      <div className="grid grid-cols-7 gap-1">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                          <div key={i} className="text-center text-[10px] text-zinc-600 font-medium py-1.5">{d}</div>
                        ))}
                        {Array.from({ length: firstDow }).map((_, i) => (
                          <div key={`pad-${i}`} />
                        ))}
                        {group.dates.map((d) => {
                          const excluded = excludedDates.includes(d.date);
                          const dayNum = new Date(d.date + "T00:00:00").getDate();
                          const isWeekend = d.dayOfWeek === 0 || d.dayOfWeek === 6;
                          return (
                            <button
                              key={d.date}
                              onClick={() => toggleDate(d.date)}
                              className={`py-2 flex items-center justify-center rounded-lg text-sm transition-all ${
                                excluded
                                  ? "bg-red-500/20 text-red-300 font-semibold ring-1 ring-red-500/30"
                                  : isWeekend
                                    ? "text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300"
                                    : "text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100"
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
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-xs text-red-300">
                      {excludedDates.length} date{excludedDates.length > 1 ? "s" : ""} blocked
                    </span>
                  </div>
                  <button
                    onClick={() => setExcludedDates([])}
                    className="text-[10px] text-red-400/70 hover:text-red-300 transition-colors font-medium"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 pt-4 mt-4 border-t border-zinc-800/80 space-y-3">
          {hasChanges && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-400/80">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Unsaved changes
              </div>
              {citiesChanged && (
                <span className="text-[10px] text-zinc-500">— will trigger data refresh</span>
              )}
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-sky-600/20 disabled:shadow-none"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : "Save"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
