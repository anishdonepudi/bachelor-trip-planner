"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { CityConfig, FlightCategoryConfig, FlightTimeFilters, SelectedMonth, TripDuration, BudgetTierConfig, AirbnbAmenity, AirbnbRoomConfig, SearchMode } from "@/lib/types";
import { generateCategoryId, generateCategoryLabel, DEFAULT_TIME_FILTERS, DEFAULT_TRIP_DURATION, AIRBNB_AMENITY_OPTIONS, SEARCH_MODE_OPTIONS } from "@/lib/constants";
import { generateDateRanges } from "@/lib/date-ranges";
import { estimateRefreshMinutes } from "@/lib/estimate-refresh";
import { CitySelect } from "./CitySelect";
import { TravelInsights, WeatherIcon, RECOMMENDATION_COLORS, formatTemp, type UnitSystem, type DailyAvg } from "./TravelInsights";
import { useTravelInsights } from "@/lib/hooks/use-travel-insights";
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
  selectedMonths: SelectedMonth[];
  tripDuration: TripDuration;
  budgetTierConfigs: BudgetTierConfig[];
  airbnbAmenities: AirbnbAmenity[];
  airbnbRoomConfig: AirbnbRoomConfig;
  searchMode?: SearchMode;
  onOpen?: () => void;
  onSave: (cities: CityConfig[], excludedDates: string[], destinationAirport: string, destinationCity: string, flightCategories: FlightCategoryConfig[], flightTimeFilters: FlightTimeFilters, selectedMonths: SelectedMonth[], tripDuration: TripDuration, budgetTierConfigs: BudgetTierConfig[], airbnbAmenities: AirbnbAmenity[], airbnbRoomConfig: AirbnbRoomConfig, searchMode: SearchMode) => void;
  inlineMode?: boolean;
  tripId: string;
}

type Section = "trip" | "group" | "flights" | "stay" | "schedule";

// ── Collapsible section wrapper ──
function ConfigSection({ id, title, subtitle, icon, expanded, onToggle, badge, children }: {
  id: Section;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: (id: Section) => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors duration-150 text-left"
      >
        <div className="w-8 h-8 rounded-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center shrink-0 text-[var(--text-2)]">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-heading font-semibold text-[var(--text-1)]">{title}</span>
            {badge}
          </div>
          {subtitle && <p className="text-[11px] text-[var(--text-3)] mt-0.5 truncate">{subtitle}</p>}
        </div>
        <svg
          className={`w-4 h-4 text-[var(--text-3)] transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="px-4 py-3 space-y-3 border-t border-[var(--border-default)] bg-[var(--surface-0)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfigModal({ cities: initialCities, excludedDates: initialExcluded, destinationAirport: initialDestination, destinationCity: initialDestinationCity, flightCategories: initialFlightCategories, flightTimeFilters: initialTimeFilters, selectedMonths: initialSelectedMonths, tripDuration: initialTripDuration, budgetTierConfigs: initialBudgetTierConfigs, airbnbAmenities: initialAirbnbAmenities, airbnbRoomConfig: initialAirbnbRoomConfig, searchMode, onOpen, onSave, inlineMode = false, tripId }: ConfigModalProps) {
  const [open, setOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(["trip"]));
  const [cities, setCities] = useState<CityConfig[]>(initialCities);
  const [excludedDates, setExcludedDates] = useState<string[]>(initialExcluded);
  const [destinationAirport, setDestinationAirport] = useState(initialDestination);
  const [destinationCity, setDestinationCity] = useState(initialDestinationCity);
  const [flightCategories, setFlightCategories] = useState<FlightCategoryConfig[]>(initialFlightCategories);
  const [timeFilters, setTimeFilters] = useState<FlightTimeFilters>(initialTimeFilters);
  const [selectedMonths, setSelectedMonths] = useState<SelectedMonth[]>(initialSelectedMonths);
  const [tripDuration, setTripDuration] = useState<TripDuration>(initialTripDuration);
  const [budgetTiers, setBudgetTiers] = useState<BudgetTierConfig[]>(initialBudgetTierConfigs);
  const [airbnbAmenities, setAirbnbAmenities] = useState<AirbnbAmenity[]>(initialAirbnbAmenities);
  const [airbnbRoomConfig, setAirbnbRoomConfig] = useState<AirbnbRoomConfig>(initialAirbnbRoomConfig);
  const [localSearchMode, setLocalSearchMode] = useState<SearchMode>(searchMode ?? "both");

  const [unitSystem, setUnitSystem] = useState<UnitSystem>("imperial");
  const [saving, setSaving] = useState(false);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number; countryCode?: string; country?: string; state?: string } | null>(null);
  const coordsResolved = useRef(false);

  // Fetch travel insights for the destination
  const insights = useTravelInsights(
    destinationCoords?.lat ?? null,
    destinationCoords?.lng ?? null,
    destinationCity,
    destinationCoords?.countryCode,
    destinationCoords?.country,
    destinationCoords?.state
  );

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

  const hasEdited = useRef(false);

  useEffect(() => {
    if (!open && !inlineMode) return;
    if (hasEdited.current) return;
    setCities(initialCities);
    setExcludedDates(initialExcluded);
    setDestinationAirport(initialDestination);
    setDestinationCity(initialDestinationCity);
    setFlightCategories(initialFlightCategories);
    setTimeFilters(initialTimeFilters);
    setSelectedMonths(initialSelectedMonths);
    setTripDuration(initialTripDuration);
    setBudgetTiers(initialBudgetTierConfigs);
    setAirbnbAmenities(initialAirbnbAmenities);
    setAirbnbRoomConfig(initialAirbnbRoomConfig);
    setLocalSearchMode(searchMode ?? "both");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCities, initialExcluded, initialDestination, initialDestinationCity, initialFlightCategories, initialTimeFilters, initialSelectedMonths, initialTripDuration, initialBudgetTierConfigs, initialAirbnbAmenities, initialAirbnbRoomConfig, searchMode]);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      hasEdited.current = false;
      onOpen?.();
      setCities(initialCities);
      setExcludedDates(initialExcluded);
      setDestinationAirport(initialDestination);
      setDestinationCity(initialDestinationCity);
      setFlightCategories(initialFlightCategories);
      setTimeFilters(initialTimeFilters);
      setSelectedMonths(initialSelectedMonths);
      setTripDuration(initialTripDuration);
      setBudgetTiers(initialBudgetTierConfigs);
      setAirbnbAmenities(initialAirbnbAmenities);
      setAirbnbRoomConfig(initialAirbnbRoomConfig);
      setLocalSearchMode(searchMode ?? "both");
      setExpandedSections(new Set(["trip"]));
      setDestinationCoords(null);
      coordsResolved.current = false;
    }
    setOpen(isOpen);
  };

  const toggleSection = (id: Section) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPeople = cities.reduce((sum, c) => sum + c.people, 0);
  const categoriesChanged = JSON.stringify(flightCategories) !== JSON.stringify(initialFlightCategories);
  const timeFiltersChanged = JSON.stringify(timeFilters) !== JSON.stringify(initialTimeFilters);
  const selectedMonthsChanged = JSON.stringify(selectedMonths) !== JSON.stringify(initialSelectedMonths);
  const tripDurationChanged = JSON.stringify(tripDuration) !== JSON.stringify(initialTripDuration);
  const budgetTiersChanged = JSON.stringify(budgetTiers) !== JSON.stringify(initialBudgetTierConfigs);
  const amenitiesChanged = JSON.stringify(airbnbAmenities) !== JSON.stringify(initialAirbnbAmenities);
  const roomConfigChanged = JSON.stringify(airbnbRoomConfig) !== JSON.stringify(initialAirbnbRoomConfig);
  const hasChanges =
    JSON.stringify(cities) !== JSON.stringify(initialCities) ||
    JSON.stringify(excludedDates.slice().sort()) !== JSON.stringify(initialExcluded.slice().sort()) ||
    destinationAirport !== initialDestination ||
    destinationCity !== initialDestinationCity ||
    categoriesChanged ||
    timeFiltersChanged ||
    selectedMonthsChanged ||
    tripDurationChanged ||
    budgetTiersChanged ||
    amenitiesChanged ||
    roomConfigChanged;
  const citiesChanged =
    JSON.stringify(cities) !== JSON.stringify(initialCities) ||
    destinationAirport !== initialDestination ||
    destinationCity !== initialDestinationCity ||
    categoriesChanged ||
    timeFiltersChanged ||
    selectedMonthsChanged ||
    tripDurationChanged ||
    budgetTiersChanged ||
    amenitiesChanged ||
    roomConfigChanged;

  // ── City helpers ──
  const addCity = () => {
    hasEdited.current = true;
    setCities([...cities, { city: "", people: 1, primaryAirports: [], nearbyAirports: [] }]);
  };

  const removeCity = (index: number) => {
    hasEdited.current = true;
    setCities(cities.filter((_, i) => i !== index));
  };

  const updateCity = (index: number, field: string, value: string | number, airports?: { primary: string[]; nearby: string[] }) => {
    hasEdited.current = true;
    const updated = [...cities];
    if (field === "city") {
      const cityName = value as string;
      updated[index] = {
        ...updated[index],
        city: cityName,
        primaryAirports: airports?.primary ?? [],
        nearbyAirports: airports?.nearby ?? [],
      };
    } else if (field === "people") {
      updated[index] = { ...updated[index], people: value as number };
    }
    setCities(updated);
  };

  // ── Date helpers ──
  const toggleDate = (date: string) => {
    hasEdited.current = true;
    setExcludedDates((prev) => prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]);
  };

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

  const potentialTrips = useMemo(() => generateDateRanges(tripDuration, selectedMonths), [selectedMonths, tripDuration]);
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

  const estimatedMinutes = useMemo(() => {
    if (!citiesChanged && !selectedMonthsChanged) return 0;
    const uniqueAirports = new Set<string>();
    for (const c of cities) {
      for (const apt of [...c.primaryAirports, ...c.nearbyAirports]) uniqueAirports.add(apt);
    }
    return estimateRefreshMinutes({
      airportCount: uniqueAirports.size,
      dateRangeCount: potentialTrips.length,
      categoryCount: flightCategories.length,
    });
  }, [citiesChanged, cities, potentialTrips.length, flightCategories.length]);

  // Resolve coordinates for existing destination city (for TravelInsights)
  useEffect(() => {
    if (destinationCoords || coordsResolved.current || !destinationCity) return;
    if (!expandedSections.has("schedule")) return;
    coordsResolved.current = true;
    fetch(`/api/cities/search?q=${encodeURIComponent(destinationCity)}`)
      .then((r) => r.ok ? r.json() : [])
      .then((results: { name: string; lat: number; lng: number; countryCode?: string; country?: string; state?: string }[]) => {
        const match = results.find(
          (r) => r.name.toLowerCase() === destinationCity.toLowerCase()
        ) ?? results[0];
        if (match) setDestinationCoords({ lat: match.lat, lng: match.lng, countryCode: match.countryCode, country: match.country, state: match.state });
      })
      .catch(() => {});
  }, [destinationCity, destinationCoords, expandedSections]);

  // Prune excluded dates outside trip windows
  useEffect(() => {
    setExcludedDates(prev => {
      const filtered = prev.filter(d => tripDateSet.has(d));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [tripDateSet]);

  // ── Flight category helpers ──
  const addFlightCategory = () => {
    hasEdited.current = true;
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
    hasEdited.current = true;
    setFlightCategories(flightCategories.filter((_, i) => i !== index));
  };

  const updateFlightCategory = (index: number, field: "stops" | "bags", value: 0 | 1 | 2 | "carryon" | "none") => {
    hasEdited.current = true;
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

  const hasDuplicateCategories = flightCategories.some((cat, i) =>
    flightCategories.some((other, j) => j !== i && other.stops === cat.stops && other.bags === cat.bags)
  );

  // ── Time filter helpers ──
  const updateTimeFilter = (
    window: "destinationArrival" | "destinationDeparture",
    field: "from" | "to",
    value: string
  ) => {
    hasEdited.current = true;
    setTimeFilters(prev => ({
      ...prev,
      [window]: { ...prev[window], [field]: value },
    }));
  };

  // ── Budget tier helpers ──
  const addBudgetTier = () => {
    if (budgetTiers.length >= 3) return;
    hasEdited.current = true;
    const nextId = `tier_${budgetTiers.length + 1}`;
    setBudgetTiers([...budgetTiers, { id: nextId, label: `Tier ${budgetTiers.length + 1}`, perPersonMin: 0, perPersonMax: 0 }]);
  };

  const removeBudgetTier = (index: number) => {
    hasEdited.current = true;
    setBudgetTiers(budgetTiers.filter((_, i) => i !== index));
  };

  const updateBudgetTier = (index: number, field: keyof BudgetTierConfig, value: string | number) => {
    hasEdited.current = true;
    const updated = [...budgetTiers];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "label") {
      updated[index].id = (value as string).toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    }
    setBudgetTiers(updated);
  };

  const toggleAmenity = (id: string, label: string) => {
    hasEdited.current = true;
    setAirbnbAmenities(prev =>
      prev.some(a => a.id === id)
        ? prev.filter(a => a.id !== id)
        : [...prev, { id, label }]
    );
  };

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);

  const TIME_OPTIONS = [
    ...Array.from({ length: 48 }, (_, i) => {
      const h = Math.floor(i / 2);
      const m = i % 2 === 0 ? "00" : "30";
      return `${String(h).padStart(2, "0")}:${m}`;
    }),
    "23:59",
  ];

  const to12h = (time: string): string => {
    const [hStr, mStr] = time.split(":");
    const h = parseInt(hStr, 10);
    const period = h < 12 ? "AM" : "PM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${mStr}${period}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const total = cities.reduce((sum, c) => sum + c.people, 0);
      const saveUrl = `/api/trips/${tripId}`;
      const res = await fetch(saveUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cities, destination_airport: destinationAirport, destination_city: destinationCity, total_people: total, excluded_dates: excludedDates, flight_categories: flightCategories, flight_time_filters: timeFilters, selected_months: selectedMonths, trip_duration: tripDuration, budget_tiers: budgetTiers, airbnb_amenities: airbnbAmenities, airbnb_min_bedrooms: airbnbRoomConfig.minBedrooms, airbnb_min_bathrooms: airbnbRoomConfig.minBathrooms, airbnb_min_beds: airbnbRoomConfig.minBeds, search_mode: localSearchMode, skip_scrape: !citiesChanged && !selectedMonthsChanged }),
      });
      if (res.ok) {
        onSave(cities, excludedDates, destinationAirport, destinationCity, flightCategories, timeFilters, selectedMonths, tripDuration, budgetTiers, airbnbAmenities, airbnbRoomConfig, localSearchMode);
        hasEdited.current = false;
        setOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Config save failed:", res.status, err);
        alert(`Save failed: ${err.error || res.statusText}`);
      }
    } finally { setSaving(false); }
  };

  const selectedCityNames = cities.map((c) => c.city).filter(Boolean);

  // ── Section subtitles ──
  const tripSubtitle = [
    destinationCity || "No destination",
    `${tripDuration.nights} nights`,
    tripDuration.departDays.map(d => DAY_NAMES[d]).join("/"),
  ].join(" \u00b7 ");

  const groupSubtitle = `${cities.filter(c => c.city).length} cities \u00b7 ${totalPeople} travelers`;

  const flightSubtitle = `${flightCategories.length} ${flightCategories.length === 1 ? "category" : "categories"} \u00b7 ${timeFilters.maxDuration}hr max`;

  const scheduleSubtitle = [
    selectedMonths.length > 0
      ? selectedMonths
          .slice()
          .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
          .map(sm => `${MONTH_NAMES[sm.month - 1]} ${sm.year}`)
          .join(", ")
      : "No months selected",
    `${remainingTrips} of ${potentialTrips.length} options`,
    excludedDates.length > 0 ? `${excludedDates.length} blocked` : null,
  ].filter(Boolean).join(" \u00b7 ");

  // ── Shared config content ──
  const configContent = (
    <>
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin space-y-2 mt-3">

        {/* Section 1: Trip Setup */}
        <ConfigSection
          id="trip"
          title="Trip Setup"
          subtitle={tripSubtitle}
          expanded={expandedSections.has("trip")}
          onToggle={toggleSection}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          }
        >
          {/* Search Mode */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-2)] mb-1.5">Search Mode</label>
            <div className="grid grid-cols-3 gap-1.5">
              {SEARCH_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { hasEdited.current = true; setLocalSearchMode(opt.value); }}
                  className={`px-2.5 py-2 rounded-md text-xs font-medium transition-all duration-150 ${
                    localSearchMode === opt.value
                      ? "bg-[var(--blue-soft)] text-[var(--blue)] border border-[var(--blue-border)]"
                      : "bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-default)] hover:text-[var(--text-1)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-3)] mt-1">
              {SEARCH_MODE_OPTIONS.find(o => o.value === localSearchMode)?.description}
            </p>
          </div>

          {/* Destination */}
          <div>
            <label className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5 block">Destination</label>
            <CitySelect
              value={destinationCity}
              onChange={(name, airports) => {
                hasEdited.current = true;
                setDestinationCity(name);
                if (airports?.primary?.[0]) {
                  setDestinationAirport(airports.primary[0]);
                }
              }}
              onCoordinates={(lat, lng, geo) => { setDestinationCoords({ lat, lng, countryCode: geo?.countryCode, country: geo?.country, state: geo?.state }); coordsResolved.current = true; }}
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

          {/* Trip Duration — Nights + Departure Days side by side on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nights */}
            <div className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
              <label className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2 block">Nights</label>
              <div className="flex items-center justify-center">
                <button onClick={() => { hasEdited.current = true; setTripDuration(prev => ({ ...prev, nights: Math.max(1, prev.nights - 1) })); }}
                  className="w-9 h-9 rounded-l-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <div className="w-12 h-9 bg-[var(--surface-2)] border-y border-[var(--border-default)] flex items-center justify-center">
                  <span className="text-base font-semibold font-mono tabular-nums text-[var(--text-1)]">{tripDuration.nights}</span>
                </div>
                <button onClick={() => { hasEdited.current = true; setTripDuration(prev => ({ ...prev, nights: Math.min(14, prev.nights + 1) })); }}
                  className="w-9 h-9 rounded-r-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Departure Days */}
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
                        hasEdited.current = true;
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
        </ConfigSection>

        {/* Section 2: Travel Group */}
        <ConfigSection
          id="group"
          title="Travel Group"
          subtitle={groupSubtitle}
          expanded={expandedSections.has("group")}
          onToggle={toggleSection}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
        >
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
        </ConfigSection>

        {/* Section 3: Flight Preferences */}
        {localSearchMode !== "stays" && (
        <ConfigSection
          id="flights"
          title="Flight Preferences"
          subtitle={flightSubtitle}
          expanded={expandedSections.has("flights")}
          onToggle={toggleSection}
          badge={hasDuplicateCategories ? (
            <span className="px-1.5 py-0.5 rounded bg-[var(--red-soft)] text-[var(--red)] text-[10px] font-bold">Duplicate</span>
          ) : undefined}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          }
        >
          {/* Max Duration */}
          <div className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">Max Duration</div>
                <div className="text-[11px] text-[var(--text-3)] mt-0.5">Flights longer than this are excluded</div>
              </div>
              <div className="flex items-center">
                <button onClick={() => { hasEdited.current = true; setTimeFilters(prev => ({ ...prev, maxDuration: Math.max(1, prev.maxDuration - 1) })); }}
                  className="w-8 h-8 rounded-l-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <div className="w-14 h-8 bg-[var(--surface-2)] border-y border-[var(--border-default)] flex items-center justify-center">
                  <span className="text-sm font-semibold font-mono tabular-nums text-[var(--text-1)]">{timeFilters.maxDuration}hr</span>
                </div>
                <button onClick={() => { hasEdited.current = true; setTimeFilters(prev => ({ ...prev, maxDuration: Math.min(24, prev.maxDuration + 1) })); }}
                  className="w-8 h-8 rounded-r-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Categories header */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">Categories ({flightCategories.length}/4)</span>
            {flightCategories.length < 4 && (
              <button onClick={addFlightCategory}
                className="text-[11px] text-[var(--blue)] hover:text-[var(--text-1)] transition-colors duration-150 font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            )}
          </div>

          {/* Category cards — compact grid on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {flightCategories.map((cat, i) => {
              const isDuplicate = flightCategories.some((other, j) => j !== i && other.stops === cat.stops && other.bags === cat.bags);
              return (
                <div key={i} className={`relative p-3 rounded-md bg-[var(--surface-1)] border ${isDuplicate ? "border-[var(--red-border)]" : "border-[var(--border-default)]"} transition-colors duration-150`}>
                  <div className="space-y-2">
                    {/* Stops */}
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

                    {/* Bags */}
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
                          className="p-1 rounded text-[var(--text-3)] hover:text-[var(--red)] hover:bg-[var(--red-soft)] transition-colors duration-150">
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
              { key: "destinationArrival" as const, label: "Arrive at Destination", subtitle: "When should everyone arrive" },
              { key: "destinationDeparture" as const, label: "Depart from Destination", subtitle: "When should everyone leave" },
            ]).map(({ key, label, subtitle }) => {
              const window = timeFilters[key];
              const fromMin = parseInt(window.from.split(":")[0], 10) * 60 + parseInt(window.from.split(":")[1], 10);
              const toMin = parseInt(window.to.split(":")[0], 10) * 60 + parseInt(window.to.split(":")[1], 10);
              const wrapsOvernight = toMin < fromMin;

              return (
                <div key={key} className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
                  <div className="text-[10px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider mb-0.5">{label}</div>
                  <div className="text-[10px] text-[var(--text-3)] mb-2">{subtitle}</div>
                  <div className="flex items-center gap-1.5">
                    <select value={window.from} onChange={(e) => updateTimeFilter(key, "from", e.target.value)}
                      className="flex-1 h-8 px-2 rounded-md text-xs font-mono bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] appearance-none cursor-pointer">
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{to12h(t)}</option>)}
                    </select>
                    <span className="text-[10px] text-[var(--text-3)] shrink-0">to</span>
                    <select value={window.to} onChange={(e) => updateTimeFilter(key, "to", e.target.value)}
                      className="flex-1 h-8 px-2 rounded-md text-xs font-mono bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] appearance-none cursor-pointer">
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{to12h(t)}</option>)}
                    </select>
                  </div>
                  <div className="mt-1.5 text-[10px] text-[var(--text-3)] font-mono tabular-nums">
                    {to12h(window.from)} – {to12h(window.to)}
                    {wrapsOvernight && <span className="text-[var(--blue)]"> (+1 day)</span>}
                  </div>
                </div>
              );
            })}
          </div>

        </ConfigSection>
        )}

        {/* Section: Stay Preferences */}
        {localSearchMode !== "flights" && (
        <ConfigSection
          id="stay"
          title="Stay Preferences"
          subtitle={`${budgetTiers.length} budget ${budgetTiers.length === 1 ? "tier" : "tiers"} \u00b7 ${airbnbAmenities.length} ${airbnbAmenities.length === 1 ? "amenity" : "amenities"}`}
          expanded={expandedSections.has("stay")}
          onToggle={toggleSection}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          }
        >
          {/* Budget Tiers */}
          <div className="mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">Budget Tiers ({budgetTiers.length}/3)</span>
              {budgetTiers.length < 3 && (
                <button onClick={addBudgetTier}
                  className="text-[11px] text-[var(--blue)] hover:text-[var(--text-1)] transition-colors duration-150 font-medium flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {budgetTiers.map((tier, i) => (
              <div key={i} className="p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tier.label}
                      onChange={(e) => updateBudgetTier(i, "label", e.target.value)}
                      placeholder="Tier name"
                      className="flex-1 h-8 px-2.5 rounded-md text-xs bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--border-active)]"
                    />
                    {budgetTiers.length > 1 && (
                      <button onClick={() => removeBudgetTier(i)}
                        className="p-1 rounded text-[var(--text-3)] hover:text-[var(--red)] hover:bg-[var(--red-soft)] transition-colors duration-150">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">Min $/person/night</label>
                      <input
                        type="number"
                        value={tier.perPersonMin || ""}
                        onChange={(e) => updateBudgetTier(i, "perPersonMin", parseInt(e.target.value) || 0)}
                        className="w-full h-8 px-2.5 rounded-md text-xs font-mono bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--border-active)]"
                      />
                    </div>
                    <span className="text-[var(--text-3)] mt-4">&ndash;</span>
                    <div className="flex-1">
                      <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">Max $/person/night</label>
                      <input
                        type="number"
                        value={tier.perPersonMax || ""}
                        onChange={(e) => updateBudgetTier(i, "perPersonMax", parseInt(e.target.value) || 0)}
                        className="w-full h-8 px-2.5 rounded-md text-xs font-mono bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--border-active)]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Rooms and Beds */}
          <div className="mt-4">
            <span className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">
              Rooms and Beds
            </span>
            <p className="text-[10px] text-[var(--text-3)] mt-0.5 mb-3">
              Minimum room requirements for your stay
            </p>
            <div className="space-y-2">
              {([
                { key: "minBedrooms" as const, label: "Bedrooms" },
                { key: "minBathrooms" as const, label: "Bathrooms" },
                { key: "minBeds" as const, label: "Beds" },
              ]).map(({ key, label }) => {
                const value = airbnbRoomConfig[key];
                return (
                  <div key={key} className="flex items-center justify-between p-2.5 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)]">
                    <span className="text-xs font-medium text-[var(--text-1)]">{label}</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={value === null}
                        onClick={() => { hasEdited.current = true; setAirbnbRoomConfig(prev => ({ ...prev, [key]: value === 1 ? null : (value ?? 1) - 1 })); }}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-medium transition-all duration-150 bg-[var(--surface-2)] border border-[var(--border-default)] text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:border-[var(--border-hover)] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        &minus;
                      </button>
                      <span className="w-8 text-center text-xs font-mono font-semibold text-[var(--text-1)]">
                        {value === null ? "Any" : value >= 8 ? "8+" : String(value)}
                      </span>
                      <button
                        type="button"
                        disabled={value !== null && value >= 8}
                        onClick={() => { hasEdited.current = true; setAirbnbRoomConfig(prev => ({ ...prev, [key]: (value ?? 0) + 1 })); }}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-medium transition-all duration-150 bg-[var(--surface-2)] border border-[var(--border-default)] text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:border-[var(--border-hover)] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Airbnb Amenities */}
          <div className="mt-4">
            <span className="text-[11px] font-heading font-semibold text-[var(--text-3)] uppercase tracking-wider">
              Amenity Filters
            </span>
            <p className="text-[10px] text-[var(--text-3)] mt-0.5 mb-3">
              Only show stays that have these amenities
            </p>
          </div>
          {(() => {
            const categories = [...new Set(AIRBNB_AMENITY_OPTIONS.map(a => a.category))];
            return categories.map(cat => (
              <div key={cat} className="mb-3">
                <div className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5">{cat}</div>
                <div className="flex flex-wrap gap-1.5">
                  {AIRBNB_AMENITY_OPTIONS.filter(a => a.category === cat).map(amenity => {
                    const isSelected = airbnbAmenities.some(a => a.id === amenity.id);
                    return (
                      <button
                        key={amenity.id}
                        type="button"
                        onClick={() => toggleAmenity(amenity.id, amenity.label)}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150 ${
                          isSelected
                            ? "bg-[var(--blue-soft)] text-[var(--blue)] border border-[var(--blue-border)]"
                            : "bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-default)] hover:border-[var(--border-hover)]"
                        }`}
                      >
                        {amenity.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </ConfigSection>
        )}

        {/* Section 4: Schedule */}
        <ConfigSection
          id="schedule"
          title="Schedule"
          subtitle={scheduleSubtitle}
          expanded={expandedSections.has("schedule")}
          onToggle={toggleSection}
          badge={excludedDates.length > 0 ? (
            <span className="px-1.5 py-0.5 rounded bg-[var(--red-soft)] text-[var(--red)] text-[10px] font-bold">{excludedDates.length} blocked</span>
          ) : undefined}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
        >
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

          {/* Travel Insights — only fetches when schedule section is expanded */}
          {destinationCoords && destinationCity && (
            <TravelInsights
              lat={destinationCoords.lat}
              lng={destinationCoords.lng}
              cityName={destinationCity}
              data={insights.data}
              loading={insights.loading}
              unitSystem={unitSystem}
              detailMode="inline"
              onMonthsChange={(months) => {
                hasEdited.current = true;
                setSelectedMonths(months);
              }}
            />
          )}

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
                      {selectedMonths.length > 1 && (
                        <button
                          onClick={() => {
                            hasEdited.current = true;
                            setSelectedMonths(prev => prev.filter(s => !(s.month === sm.month && s.year === sm.year)));
                          }}
                          className="hover:text-[var(--text-1)] transition-colors duration-150"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Calendar */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-2)] leading-relaxed">
              Tap highlighted dates to block them.
            </p>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-[10px] text-[var(--text-3)]">Holiday</span>
              </div>
              <span className="text-[10px] text-[var(--text-3)] font-mono tabular-nums">
                {remainingTrips} of {potentialTrips.length} options
              </span>
            </div>
          </div>
          <div className="space-y-4">
            {monthGroups.map((group) => {
              const firstDow = group.dates[0].dayOfWeek;
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
                          <div
                            key={d.date}
                            className="flex flex-col items-center justify-center rounded text-sm min-h-[44px] text-[var(--text-3)] opacity-30 relative"
                            title={holidays?.join(", ")}
                          >
                            {holidays && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 opacity-50" />}
                            <span>{dayNum}</span>
                            {dayAvg && <span className="text-[8px] font-mono tabular-nums leading-none mt-0.5">{formatTemp(dayAvg.highC, unitSystem)}</span>}
                          </div>
                        );
                      }

                      return (
                        <button
                          key={d.date}
                          onClick={() => toggleDate(d.date)}
                          title={holidays?.join(", ")}
                          className={`flex flex-col items-center justify-center text-sm transition-all duration-100 min-h-[44px] relative ${
                            pos?.isStart && pos?.isEnd ? "rounded" :
                            pos?.isStart ? "rounded-l" :
                            pos?.isEnd ? "rounded-r" : ""
                          } ${
                            excluded
                              ? "bg-[var(--red-soft)] text-[var(--red)] font-semibold ring-1 ring-[var(--red-border)] rounded"
                              : "bg-[var(--blue-soft)] text-[var(--text-1)] hover:bg-[var(--blue-soft)] hover:brightness-95"
                          }`}
                        >
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
              <button onClick={() => { hasEdited.current = true; setExcludedDates([]); }}
                className="text-[11px] text-[var(--red)] opacity-70 hover:opacity-100 transition-opacity duration-150 font-medium">
                Clear
              </button>
            </div>
          )}
        </ConfigSection>
      </div>

      {/* Footer */}
      <div className="shrink-0 pt-3 mt-3 border-t border-[var(--border-default)] space-y-2">
        {hasChanges && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
            <span className="text-[var(--gold)]">Unsaved changes</span>
            {(citiesChanged || selectedMonthsChanged) && (
              <span className="text-[var(--text-3)]">
                — triggers refresh{estimatedMinutes > 0 && <> (~{estimatedMinutes} min)</>}
              </span>
            )}
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
        Configure
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
