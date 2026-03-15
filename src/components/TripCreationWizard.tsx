"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CityConfig, FlightCategoryConfig, FlightTimeFilters, TripDuration } from "@/lib/types";
import { CITY_AIRPORTS } from "@/lib/airports";
import { generateCategoryId, generateCategoryLabel, DEFAULT_FLIGHT_CATEGORIES, DEFAULT_TIME_FILTERS, DEFAULT_TRIP_DURATION } from "@/lib/constants";
import { generateDateRanges } from "@/lib/date-ranges";
import { CitySelect } from "./CitySelect";
import { TravelInsights, WeatherIcon, RECOMMENDATION_COLORS, formatTemp, type SelectedMonth, type UnitSystem, type DailyAvg } from "./TravelInsights";
import { useTravelInsights } from "@/lib/hooks/use-travel-insights";

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
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number; countryCode?: string; country?: string; state?: string } | null>(null);

  // Step 2: Travel Group
  const [cities, setCities] = useState<CityConfig[]>([
    { city: "", people: 1, primaryAirports: [], nearbyAirports: [] },
  ]);

  // Step 3: Dates — all empty until user sets them
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("imperial");
  const [selectedMonths, setSelectedMonths] = useState<SelectedMonth[]>([]);
  const [tripDuration, setTripDuration] = useState<TripDuration>({ nights: 0, departDays: [] });
  const [excludedDates, setExcludedDates] = useState<string[]>([]);

  // Step 4: Flight Preferences
  const [flightCategories, setFlightCategories] = useState<FlightCategoryConfig[]>(DEFAULT_FLIGHT_CATEGORIES);
  const [timeFilters, setTimeFilters] = useState<FlightTimeFilters>(DEFAULT_TIME_FILTERS);

  // Fetch travel insights once for the destination
  const insights = useTravelInsights(
    destinationCoords?.lat ?? null,
    destinationCoords?.lng ?? null,
    destinationCity,
    destinationCoords?.countryCode,
    destinationCoords?.country,
    destinationCoords?.state
  );

  // Map month number (1-12) to insight data for calendar headers
  const monthInsightMap = useMemo(() => {
    const map = new Map<number, { avgHighC: number; precipMm: number; recommendation: string; crowd: number }>();
    if (!insights.data) return map;
    for (const m of insights.data.months) {
      map.set(m.month, { avgHighC: m.avgHighC, precipMm: m.precipitationMm, recommendation: m.recommendation, crowd: m.crowd });
    }
    return map;
  }, [insights.data]);

  // Daily temperature averages from insights (keyed by "MM-DD")
  const dailyAvgMap: Record<string, DailyAvg> | undefined = insights.data?.dailyAverages;

  // Build a map of date -> holiday names from insights events
  const holidayMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!insights.data) return map;
    for (const m of insights.data.months) {
      for (const e of m.events) {
        if (e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
          const existing = map.get(e.date) ?? [];
          existing.push(e.name);
          map.set(e.date, existing);
        }
      }
    }
    return map;
  }, [insights.data]);

  const totalPeople = cities.reduce((sum, c) => sum + c.people, 0);
  const selectedCityNames = cities.map((c) => c.city).filter(Boolean);

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    return `${String(h).padStart(2, "0")}:${m}`;
  });

  const hasMonths = selectedMonths.length > 0;
  const hasFullConfig = hasMonths && tripDuration.nights > 0 && tripDuration.departDays.length > 0;

  const potentialTrips = useMemo(() => {
    if (!hasFullConfig) return [];
    return generateDateRanges(tripDuration, selectedMonths);
  }, [selectedMonths, tripDuration, hasFullConfig]);

  const seasonDates = useMemo(() => {
    if (selectedMonths.length === 0) return [];
    const dates: { date: string; dayOfWeek: number; month: string }[] = [];
    // Only generate dates for specifically selected months
    for (const sm of [...selectedMonths].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)) {
      const start = new Date(sm.year, sm.month - 1, 1);
      const end = new Date(sm.year, sm.month, 0); // last day of month
      const current = new Date(start);
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
    field: "time" | "plusMinus" | "includeNextDay",
    value: string | number | boolean
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
      case 3: return selectedMonths.length > 0 && tripDuration.nights > 0 && tripDuration.departDays.length > 0;
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
          selected_months: selectedMonths,
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
                onCoordinates={(lat, lng, geo) => setDestinationCoords({ lat, lng, countryCode: geo?.countryCode, country: geo?.country, state: geo?.state })}
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
            {/* Trip Duration — first */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
                <label className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2 block">Nights</label>
                <div className="flex items-center justify-center">
                  <button onClick={() => setTripDuration(prev => ({ ...prev, nights: Math.max(0, prev.nights - 1) }))}
                    className="w-9 h-9 rounded-l-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <div className="w-12 h-9 bg-[var(--surface-2)] border-y border-[var(--border-default)] flex items-center justify-center">
                    <span className={`text-base font-semibold font-mono tabular-nums ${tripDuration.nights > 0 ? "text-[var(--text-1)]" : "text-[var(--text-3)]"}`}>{tripDuration.nights || "—"}</span>
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

            {/* Unit system toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">Units</span>
              <div className="flex items-center p-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border-default)]">
                <button
                  onClick={() => setUnitSystem("metric")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all duration-150 ${
                    unitSystem === "metric"
                      ? "bg-[var(--blue)] text-white shadow-sm"
                      : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                  }`}
                >
                  Metric
                </button>
                <button
                  onClick={() => setUnitSystem("imperial")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all duration-150 ${
                    unitSystem === "imperial"
                      ? "bg-[var(--blue)] text-white shadow-sm"
                      : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                  }`}
                >
                  Imperial
                </button>
              </div>
            </div>

            {/* Travel Insights — month selection */}
            {destinationCoords && destinationCity && (
              <TravelInsights
                lat={destinationCoords.lat}
                lng={destinationCoords.lng}
                cityName={destinationCity}
                data={insights.data}
                loading={insights.loading}
                unitSystem={unitSystem}
                onMonthsChange={(months) => setSelectedMonths(months)}
              />
            )}

            {/* Selected months display */}
            {selectedMonths.length > 0 && (
              <div className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">
                    Selected Months ({selectedMonths.length}/3)
                  </div>
                  <button
                    onClick={() => { setSelectedMonths([]); setExcludedDates([]); }}
                    className="text-[10px] text-[var(--text-3)] hover:text-[var(--red)] font-medium transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[...selectedMonths]
                    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
                    .map((sm) => (
                      <div
                        key={`${sm.month}-${sm.year}`}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--blue)]/10 border border-[var(--blue)]/30"
                      >
                        <span className="text-xs font-medium text-[var(--blue)]">
                          {MONTH_NAMES[sm.month - 1]} {sm.year}
                        </span>
                        {selectedMonths.length > 1 && (
                          <button
                            onClick={() => {
                              const next = selectedMonths.filter(s => !(s.month === sm.month && s.year === sm.year));
                              setSelectedMonths(next);
                            }}
                            className="text-[var(--blue)] hover:text-[var(--red)] transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Calendar — only shown when months are selected */}
            {hasMonths && (<>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--text-2)]">{hasFullConfig ? "Tap highlighted dates to block them." : "Set nights and depart days to see trip dates."}</p>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[10px] text-[var(--text-3)]">Holiday</span>
                </div>
                {hasFullConfig && <span className="text-[10px] text-[var(--text-3)] font-mono tabular-nums">{remainingTrips} of {potentialTrips.length} options</span>}
              </div>
            </div>
            <div className="space-y-4">
              {monthGroups.map((group) => {
                const firstDow = group.dates[0].dayOfWeek;
                // Extract month number from the first date in the group
                const monthNum = new Date(group.dates[0].date + "T00:00:00").getMonth() + 1;
                const mi = monthInsightMap.get(monthNum);
                const colors = mi ? RECOMMENDATION_COLORS[mi.recommendation] : null;
                return (
                  <div key={group.month}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-heading font-semibold text-[var(--text-1)]">{group.month}</span>
                        {mi && colors && (
                          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${colors.bg} border ${colors.border}`}>
                            <span className={colors.text}>
                              <WeatherIcon precipMm={mi.precipMm} highC={mi.avgHighC} className="w-3.5 h-3.5" />
                            </span>
                            <span className={`text-[10px] font-mono font-semibold tabular-nums ${colors.text}`}>
                              {formatTemp(mi.avgHighC, unitSystem)}
                            </span>
                            <span className={`text-[10px] font-medium capitalize ${colors.text}`}>
                              {mi.recommendation}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
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
                        const holidays = holidayMap.get(d.date);
                        const mmdd = d.date.slice(5); // "MM-DD"
                        const dayAvg = dailyAvgMap?.[mmdd];
                        if (!inTrip) {
                          return (
                            <div key={d.date} className="flex flex-col items-center justify-center rounded text-sm min-h-[44px] text-[var(--text-3)] opacity-30 relative" title={holidays?.join(", ")}>
                              {holidays && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 opacity-50" />}
                              <span>{dayNum}</span>
                              {dayAvg && <span className="text-[8px] font-mono tabular-nums leading-none mt-0.5">{formatTemp(dayAvg.highC, unitSystem)}</span>}
                            </div>
                          );
                        }
                        return (
                          <button key={d.date} onClick={() => toggleDate(d.date)}
                            title={holidays?.join(", ")}
                            className={`flex flex-col items-center justify-center text-sm transition-all duration-100 min-h-[44px] relative ${
                              pos?.isStart && pos?.isEnd ? "rounded" : pos?.isStart ? "rounded-l" : pos?.isEnd ? "rounded-r" : ""
                            } ${excluded
                              ? "bg-[var(--red-soft)] text-[var(--red)] font-semibold ring-1 ring-[var(--red-border)] rounded"
                              : "bg-[var(--blue-soft)] text-[var(--text-1)] hover:brightness-95"
                            }`}>
                            {holidays && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />}
                            <span>{dayNum}</span>
                            {dayAvg && (
                              <span className={`text-[8px] font-mono tabular-nums leading-none mt-0.5 ${excluded ? "text-[var(--red)]" : "text-[var(--text-3)]"}`}>
                                {formatTemp(dayAvg.highC, unitSystem)}
                              </span>
                            )}
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
            </>)}
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
