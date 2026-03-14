"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CityConfig, FlightCategoryConfig, FlightTimeFilters, MonthRange, TripDuration } from "@/lib/types";
import { CITY_AIRPORTS } from "@/lib/airports";
import { generateCategoryId, generateCategoryLabel, DEFAULT_FLIGHT_CATEGORIES, DEFAULT_TIME_FILTERS, DEFAULT_MONTH_RANGE, DEFAULT_TRIP_DURATION } from "@/lib/constants";
import { generateDateRanges } from "@/lib/date-ranges";
import { CitySelect } from "./CitySelect";

type Step = 1 | 2 | 3 | 4;

export function TripCreationWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basics
  const [tripName, setTripName] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationAirport, setDestinationAirport] = useState("");

  // Step 2: Travel Group
  const [cities, setCities] = useState<CityConfig[]>([
    { city: "", people: 1, primaryAirports: [], nearbyAirports: [] },
  ]);

  // Step 3: Dates
  const [monthRange, setMonthRange] = useState<MonthRange>(DEFAULT_MONTH_RANGE);
  const [tripDuration, setTripDuration] = useState<TripDuration>(DEFAULT_TRIP_DURATION);
  const [excludedDates, setExcludedDates] = useState<string[]>([]);

  // Step 4: Flight Preferences
  const [flightCategories, setFlightCategories] = useState<FlightCategoryConfig[]>(DEFAULT_FLIGHT_CATEGORIES);
  const [timeFilters, setTimeFilters] = useState<FlightTimeFilters>(DEFAULT_TIME_FILTERS);

  const totalPeople = cities.reduce((sum, c) => sum + c.people, 0);
  const selectedCityNames = cities.map((c) => c.city).filter(Boolean);

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);

  const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    return `${String(h).padStart(2, "0")}:${m}`;
  });

  const potentialTrips = useMemo(() => generateDateRanges(monthRange, tripDuration), [monthRange, tripDuration]);

  const seasonDates = useMemo(() => {
    const dates: { date: string; dayOfWeek: number; month: string }[] = [];
    const current = new Date(monthRange.startYear, monthRange.startMonth - 1, 1);
    const end = new Date(monthRange.endYear, monthRange.endMonth, 0);
    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, "0");
      const d = String(current.getDate()).padStart(2, "0");
      dates.push({ date: `${y}-${m}-${d}`, dayOfWeek: current.getDay(), month: current.toLocaleDateString("en-US", { month: "long", year: "numeric" }) });
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [monthRange]);

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

  // City helpers
  const addCity = () => {
    setCities([...cities, { city: "", people: 1, primaryAirports: [], nearbyAirports: [] }]);
  };

  const removeCity = (index: number) => {
    setCities(cities.filter((_, i) => i !== index));
  };

  const updateCity = (index: number, field: string, value: string | number, airports?: { primary: string[]; nearby: string[] }) => {
    const updated = [...cities];
    if (field === "city") {
      const cityName = value as string;
      updated[index] = {
        ...updated[index],
        city: cityName,
        primaryAirports: airports?.primary ?? CITY_AIRPORTS[cityName]?.primary ?? [],
        nearbyAirports: airports?.nearby ?? CITY_AIRPORTS[cityName]?.nearby ?? [],
      };
    } else if (field === "people") {
      updated[index] = { ...updated[index], people: value as number };
    }
    setCities(updated);
  };

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
    updated[index].id = generateCategoryId(updated[index].stops, updated[index].bags);
    updated[index].label = generateCategoryLabel(updated[index].stops, updated[index].bags);
    setFlightCategories(updated);
  };

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

  const hasDuplicateCategories = flightCategories.some((cat, i) =>
    flightCategories.some((other, j) => j !== i && other.stops === cat.stops && other.bags === cat.bags)
  );

  const toggleDate = (date: string) => {
    setExcludedDates((prev) => prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]);
  };

  // Validation
  const canProceed = (s: Step): boolean => {
    switch (s) {
      case 1: return !!tripName.trim() && !!destinationAirport;
      case 2: return cities.some(c => c.city);
      case 3: return true;
      case 4: return flightCategories.length > 0 && !hasDuplicateCategories;
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tripName,
          cities,
          destination_airport: destinationAirport,
          destination_city: destinationCity,
          total_people: totalPeople,
          excluded_dates: excludedDates,
          flight_categories: flightCategories,
          flight_time_filters: timeFilters,
          month_range: monthRange,
          trip_duration: tripDuration,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create trip");
      }
      const data = await res.json();
      router.push(`/trip/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trip");
      setSaving(false);
    }
  };

  const stepTitles = ["Trip Basics", "Travel Group", "Trip Dates", "Flight Preferences"];

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-1)]">
      {/* Header */}
      <header className="glass border-b border-[var(--border-default)] sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <h1 className="text-sm font-heading font-bold tracking-tight">New Trip</h1>
          </div>
          <span className="text-[11px] text-[var(--text-3)] font-mono">Step {step} of 4</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--surface-2)]">
        <div
          className="h-full bg-[var(--blue)] transition-all duration-300"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div>
          <h2 className="text-lg font-heading font-semibold">{stepTitles[step - 1]}</h2>
          <p className="text-sm text-[var(--text-2)] mt-0.5">
            {step === 1 && "Give your trip a name and pick a destination."}
            {step === 2 && "Add the cities people are flying from."}
            {step === 3 && "Set your travel window and block dates."}
            {step === 4 && "Configure flight search preferences."}
          </p>
        </div>

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5 block">Trip Name</label>
              <input
                type="text"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className="w-full h-10 px-3 rounded-md text-sm bg-[var(--surface-1)] text-[var(--text-1)] border border-[var(--border-default)] hover:border-[var(--border-hover)] focus:outline-none focus:border-[var(--border-active)] transition-all duration-150 placeholder:text-[var(--text-3)]"
                placeholder="e.g., Summer 2026 Barcelona Trip"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5 block">Destination</label>
              <CitySelect
                value={destinationCity}
                onChange={(name, airports) => {
                  setDestinationCity(name);
                  if (airports?.primary?.[0]) setDestinationAirport(airports.primary[0]);
                }}
                placeholder="Search destination..."
              />
              {destinationAirport && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-[var(--text-3)]">Airport:</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--blue-soft)] text-[var(--blue)] border border-[var(--blue-border)] font-mono font-medium">
                    {destinationAirport}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Travel Group */}
        {step === 2 && (
          <div className="space-y-2">
            {cities.map((city, i) => (
              <div key={i} className="group relative p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-colors duration-150">
                <div className="flex items-start gap-2.5">
                  <span className="text-[11px] font-mono font-semibold text-[var(--text-3)] w-4 text-right mt-2.5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <CitySelect
                      value={city.city}
                      onChange={(name, airports) => updateCity(i, "city", name, airports)}
                      excludeCities={selectedCityNames.filter((c) => c !== city.city)}
                      currentAirports={city.city ? { primary: city.primaryAirports, nearby: city.nearbyAirports } : undefined}
                    />
                  </div>
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
                  {cities.length > 1 && (
                    <button onClick={() => removeCity(i)}
                      className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--red)] hover:bg-[var(--red-soft)] transition-colors duration-150 shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
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
            <p className="text-[11px] text-[var(--text-3)] font-mono">{totalPeople} travelers from {cities.filter(c => c.city).length} cities</p>
          </div>
        )}

        {/* Step 3: Trip Dates */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Trip Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
                <label className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2 block">Nights</label>
                <div className="flex items-center justify-center">
                  <button onClick={() => setTripDuration(prev => ({ ...prev, nights: Math.max(1, prev.nights - 1) }))}
                    className="w-9 h-9 rounded-l-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <div className="w-12 h-9 bg-[var(--surface-2)] border-y border-[var(--border-default)] flex items-center justify-center">
                    <span className="text-base font-semibold font-mono tabular-nums text-[var(--text-1)]">{tripDuration.nights}</span>
                  </div>
                  <button onClick={() => setTripDuration(prev => ({ ...prev, nights: Math.min(14, prev.nights + 1) }))}
                    className="w-9 h-9 rounded-r-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
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
                      <button
                        key={dayIndex}
                        onClick={() => {
                          setTripDuration(prev => {
                            if (isSelected) {
                              if (prev.departDays.length <= 1) return prev;
                              return { ...prev, departDays: prev.departDays.filter(d => d !== dayIndex) };
                            }
                            if (prev.departDays.length >= 2) return prev;
                            return { ...prev, departDays: [...prev.departDays, dayIndex].sort() };
                          });
                        }}
                        className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 border ${
                          isSelected
                            ? "bg-[var(--blue)] text-white border-[var(--blue)] shadow-sm"
                            : tripDuration.departDays.length >= 2
                              ? "bg-[var(--surface-2)] text-[var(--text-3)] border-[var(--border-default)] cursor-not-allowed opacity-50"
                              : "bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border-default)] hover:border-[var(--border-hover)] hover:text-[var(--text-1)]"
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Month Range */}
            <div className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
              <div className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2.5">Trip Window</div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[var(--text-3)] block">From</label>
                  <div className="flex gap-1">
                    <select value={monthRange.startMonth}
                      onChange={(e) => {
                        const m = Number(e.target.value);
                        const updated = { ...monthRange, startMonth: m };
                        if (monthRange.startYear > monthRange.endYear || (monthRange.startYear === monthRange.endYear && m > monthRange.endMonth)) {
                          updated.endMonth = m;
                        }
                        setMonthRange(updated);
                      }}
                      className="flex-1 h-8 px-1.5 rounded-md text-xs bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] appearance-none cursor-pointer">
                      {MONTH_NAMES.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
                    </select>
                    <select value={monthRange.startYear}
                      onChange={(e) => {
                        const y = Number(e.target.value);
                        const updated = { ...monthRange, startYear: y };
                        if (y > monthRange.endYear) { updated.endYear = y; updated.endMonth = monthRange.startMonth; }
                        setMonthRange(updated);
                      }}
                      className="w-[4.5rem] h-8 px-1.5 rounded-md text-xs font-mono bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] appearance-none cursor-pointer">
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <svg className="w-4 h-4 text-[var(--text-3)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[var(--text-3)] block">To</label>
                  <div className="flex gap-1">
                    <select value={monthRange.endMonth}
                      onChange={(e) => setMonthRange(prev => ({ ...prev, endMonth: Number(e.target.value) }))}
                      className="flex-1 h-8 px-1.5 rounded-md text-xs bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] appearance-none cursor-pointer">
                      {MONTH_NAMES.map((name, i) => {
                        const m = i + 1;
                        const disabled = monthRange.endYear === monthRange.startYear && m < monthRange.startMonth;
                        return <option key={i} value={m} disabled={disabled}>{name}</option>;
                      })}
                    </select>
                    <select value={monthRange.endYear}
                      onChange={(e) => {
                        const y = Number(e.target.value);
                        const updated = { ...monthRange, endYear: y };
                        if (y === monthRange.startYear && monthRange.endMonth < monthRange.startMonth) {
                          updated.endMonth = monthRange.startMonth;
                        }
                        setMonthRange(updated);
                      }}
                      className="w-[4.5rem] h-8 px-1.5 rounded-md text-xs font-mono bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] appearance-none cursor-pointer">
                      {YEAR_OPTIONS.filter(y => y >= monthRange.startYear).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--text-2)]">Tap highlighted dates to block them.</p>
              <span className="text-[10px] text-[var(--text-3)] font-mono tabular-nums shrink-0 ml-2">{potentialTrips.length} trips</span>
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
                <button onClick={() => setExcludedDates([])} className="text-[11px] text-[var(--red)] opacity-70 hover:opacity-100 font-medium">Clear</button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Flight Preferences */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Max Duration */}
            <div className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">Max Duration</div>
                  <div className="text-[11px] text-[var(--text-3)] mt-0.5">Flights longer than this are excluded</div>
                </div>
                <div className="flex items-center">
                  <button onClick={() => setTimeFilters(prev => ({ ...prev, maxDuration: Math.max(1, prev.maxDuration - 1) }))}
                    className="w-8 h-8 rounded-l-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)]">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                  </button>
                  <div className="w-14 h-8 bg-[var(--surface-2)] border-y border-[var(--border-default)] flex items-center justify-center">
                    <span className="text-sm font-semibold font-mono tabular-nums text-[var(--text-1)]">{timeFilters.maxDuration}hr</span>
                  </div>
                  <button onClick={() => setTimeFilters(prev => ({ ...prev, maxDuration: Math.min(24, prev.maxDuration + 1) }))}
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
                      {isDuplicate && (
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
                { key: "outboundDeparture" as const, label: "Outbound Depart" },
                { key: "outboundArrival" as const, label: "Outbound Arrive" },
                { key: "returnDeparture" as const, label: "Return Depart" },
                { key: "returnArrival" as const, label: "Return Arrive" },
              ]).map(({ key, label }) => {
                const filter = timeFilters[key];
                const centerMin = parseInt(filter.time.split(":")[0], 10) * 60 + parseInt(filter.time.split(":")[1], 10);
                const earliest = Math.max(0, centerMin - filter.plusMinus * 60);
                const latest = Math.min(24 * 60 - 1, centerMin + filter.plusMinus * 60);
                const fmtTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
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
                    <div className="text-[10px] text-[var(--text-3)] mt-1 font-mono tabular-nums">{fmtTime(earliest)} – {fmtTime(latest)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-2.5 rounded-md bg-[var(--red-soft)] border border-[var(--red-border)] text-xs text-[var(--red)]">
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button
              onClick={() => setStep((step - 1) as Step)}
              className="flex-1 h-11 rounded-md text-sm font-semibold bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] hover:bg-[var(--surface-3)] transition-all duration-150"
            >
              Back
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canProceed(step)}
              className="flex-1 h-11 rounded-md text-sm font-semibold bg-[var(--blue)] text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || !canProceed(4)}
              className="flex-1 h-11 rounded-md text-sm font-semibold bg-[var(--blue)] text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </span>
              ) : "Create Trip"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
