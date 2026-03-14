"use client";

import { useState, useMemo } from "react";
import { FlightOptionRow, FlightCategory, CostBreakdown } from "@/lib/types";
import { FLIGHT_CATEGORIES } from "@/lib/constants";
import { FlightDetails } from "./FlightDetails";

interface FlightAllOptionsProps {
  flightOptions: FlightOptionRow[];
  cities: string[];
  perCityCosts: CostBreakdown[];
  selectedCategory: FlightCategory;
}

type PriceTier = "cheap" | "mid" | "expensive" | "none";

function getPriceTier(price: number | null, min: number, max: number): PriceTier {
  if (price == null) return "none";
  if (max === min) return "mid";
  const ratio = (price - min) / (max - min);
  if (ratio <= 0.25) return "cheap";
  if (ratio >= 0.75) return "expensive";
  return "mid";
}

const TIER_BG: Record<PriceTier, string> = {
  cheap: "bg-[oklch(0.72_0.15_175_/_8%)]",
  mid: "",
  expensive: "bg-[oklch(0.65_0.2_25_/_8%)]",
  none: "",
};

function CompactFlightInfo({ flight }: { flight: FlightOptionRow }) {
  const out = flight.outbound_details;
  const ret = flight.return_details;

  function to12h(time: string): string {
    const match = time.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return time;
    let h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${m} ${ampm}`;
  }

  function LegLine({ leg, label }: { leg: typeof out; label: string }) {
    if (!leg) return null;
    return (
      <div className="flex items-center gap-1 text-[10px] text-[var(--text-3)] leading-tight">
        <span className="text-[var(--text-3)] w-6 shrink-0">{label}</span>
        {leg.stops === 0 ? (
          <span className="text-[var(--teal)]">Direct</span>
        ) : (
          <span className="text-[var(--orange)]">
            {leg.stops} stop{leg.layoverAirport && ` ${leg.layoverAirport}`}{leg.layoverDuration && ` (${leg.layoverDuration})`}
          </span>
        )}
        {leg.duration && (
          <>
            <span className="text-[var(--text-3)]">&middot;</span>
            <span>{leg.duration}</span>
          </>
        )}
        {leg.departTime && leg.arriveTime && (
          <>
            <span className="text-[var(--text-3)]">&middot;</span>
            <span className="font-mono tabular-nums">{to12h(leg.departTime)}-{to12h(leg.arriveTime)}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="text-[10px] text-[var(--text-2)]">{flight.airline ?? "Unknown"}</div>
      <LegLine leg={out} label="Out" />
      <LegLine leg={ret} label="Ret" />
    </div>
  );
}

function FlightCell({
  options,
  isSelected,
  isCheapestInRow,
  priceTier,
}: {
  options: FlightOptionRow[];
  isSelected: boolean;
  isCheapestInRow: boolean;
  priceTier: PriceTier;
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = options.filter((f) => f.price != null).sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  const cheapest = sorted[0] ?? null;
  const alternates = sorted.slice(1, 3);
  const hasAlternates = alternates.length > 0;

  if (!cheapest) {
    return (
      <td className="py-3 px-3 align-top">
        <div className="flex flex-col items-center justify-center py-2 rounded border border-dashed border-[var(--border-default)]">
          <span className="text-[10px] text-[var(--text-3)]">No flights</span>
        </div>
      </td>
    );
  }

  const activeBorder = isSelected ? "ring-1 ring-[var(--teal)] ring-inset" : "";
  const tierBg = isSelected ? "bg-[var(--teal-soft)]" : TIER_BG[priceTier];

  return (
    <td className={`py-2 px-2 align-top ${tierBg} ${activeBorder}`}>
      <div className="space-y-1.5">
        {/* Price row */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            {isCheapestInRow && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--teal-border)] font-semibold uppercase tracking-wide">
                Best
              </span>
            )}
            {isSelected && !isCheapestInRow && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--blue-soft)] text-[var(--blue)] border border-[var(--blue-border)] font-medium">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <a
              href={cheapest.google_flights_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-mono font-semibold text-sm tabular-nums transition-colors duration-150 hover:text-[var(--blue)] ${
                isCheapestInRow ? "text-[var(--teal)]" : "text-[var(--gold)]"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              ${cheapest.price}
            </a>
            {hasAlternates && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150 p-0.5"
              >
                <svg className={`w-3 h-3 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Compact flight info */}
        <CompactFlightInfo flight={cheapest} />

        {/* Alternates */}
        {expanded && alternates.map((alt, i) => (
          <div key={i} className="pt-1.5 mt-1 border-t border-[var(--border-default)]">
            <div className="flex items-center justify-end mb-1">
              <a
                href={alt.google_flights_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs tabular-nums text-[var(--text-1)] hover:text-[var(--blue)] transition-colors duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                ${alt.price}
              </a>
            </div>
            <CompactFlightInfo flight={alt} />
          </div>
        ))}
      </div>
    </td>
  );
}

/** Mobile: category tabs + vertical city cards */
function MobileFlightOptions({
  flightOptions,
  cities,
  selectedKeys,
  priceRange,
}: {
  flightOptions: FlightOptionRow[];
  cities: string[];
  selectedKeys: Set<string>;
  priceRange: { min: number; max: number };
}) {
  const [activeCat, setActiveCat] = useState<FlightCategory>(FLIGHT_CATEGORIES[0].value);

  return (
    <div className="space-y-3">
      {/* Category tabs */}
      <div className="flex overflow-x-auto gap-1.5 -mx-1 px-1 pb-1 scrollbar-thin">
        {FLIGHT_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCat(cat.value)}
            className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150 ${
              activeCat === cat.value
                ? "bg-[var(--blue-soft)] text-[var(--blue)] border border-[var(--blue-border)]"
                : "bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-default)]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* City cards for active category */}
      <div className="space-y-2">
        {cities.map((city) => {
          const options = flightOptions
            .filter((f) => f.origin_city === city && f.category === activeCat && f.price != null)
            .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
          const isSelected = selectedKeys.has(`${city}|${activeCat}`);
          const cheapest = options[0] ?? null;
          const alternates = options.slice(1, 3);
          const tier = getPriceTier(cheapest?.price ?? null, priceRange.min, priceRange.max);

          return (
            <MobileCityCard
              key={city}
              city={city}
              cheapest={cheapest}
              alternates={alternates}
              isSelected={isSelected}
              tier={tier}
            />
          );
        })}
      </div>
    </div>
  );
}

function MobileCityCard({
  city,
  cheapest,
  alternates,
  isSelected,
  tier,
}: {
  city: string;
  cheapest: FlightOptionRow | null;
  alternates: FlightOptionRow[];
  isSelected: boolean;
  tier: PriceTier;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasAlternates = alternates.length > 0;

  return (
    <div className={`rounded-md border overflow-hidden ${
      isSelected ? "border-[var(--teal-border)] bg-[var(--teal-soft)]" : "border-[var(--border-default)] bg-[var(--surface-0)]"
    }`}>
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-1)]">{city}</span>
          {cheapest?.airport_used && (
            <span className="text-[11px] font-mono text-[var(--text-3)]">{cheapest.airport_used}</span>
          )}
          {isSelected && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--teal-border)] font-medium">
              Active
            </span>
          )}
        </div>
        {cheapest ? (
          <div className="flex items-center gap-1.5">
            <a
              href={cheapest.google_flights_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-mono font-semibold text-sm tabular-nums transition-colors duration-150 hover:text-[var(--blue)] ${
                tier === "cheap" ? "text-[var(--teal)]" : tier === "expensive" ? "text-[var(--orange)]" : "text-[var(--gold)]"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              ${cheapest.price}
            </a>
            {hasAlternates && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors p-0.5"
              >
                <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-[var(--text-3)]">No flights</span>
        )}
      </div>

      {cheapest && (
        <div className="px-3 pb-2.5">
          <CompactFlightInfo flight={cheapest} />
        </div>
      )}

      {expanded && alternates.map((alt, i) => (
        <div key={i} className="px-3 pb-2.5 pt-1.5 border-t border-[var(--border-default)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[var(--text-3)]">Option {i + 2}{alt.airport_used ? ` · ${alt.airport_used}` : ""}</span>
            <a
              href={alt.google_flights_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs tabular-nums text-[var(--text-1)] hover:text-[var(--blue)] transition-colors duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              ${alt.price}
            </a>
          </div>
          <CompactFlightInfo flight={alt} />
        </div>
      ))}
    </div>
  );
}

export function FlightAllOptions({ flightOptions, cities, perCityCosts, selectedCategory }: FlightAllOptionsProps) {
  const [expanded, setExpanded] = useState(false);

  if (flightOptions.length === 0 && perCityCosts.every((c) => !c.flight)) return null;

  const selectedKeys = new Set<string>();
  for (const cost of perCityCosts) {
    if (cost.flight) {
      const effectiveCat = cost.fallbackCategory ?? selectedCategory;
      selectedKeys.add(`${cost.city}|${effectiveCat}`);
    }
  }

  // Compute global price range for heatmap
  const priceRange = useMemo(() => {
    const prices = flightOptions.filter((f) => f.price != null).map((f) => f.price!);
    if (prices.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [flightOptions]);

  // Compute cheapest price per city (across all categories) for "Best" badge
  const cheapestPerCity = useMemo(() => {
    const map = new Map<string, number>();
    for (const city of cities) {
      let min = Infinity;
      for (const cat of FLIGHT_CATEGORIES) {
        const options = flightOptions.filter(
          (f) => f.origin_city === city && f.category === cat.value && f.price != null
        );
        for (const o of options) {
          if (o.price != null && o.price < min) min = o.price;
        }
      }
      if (min !== Infinity) map.set(city, min);
    }
    return map;
  }, [flightOptions, cities]);

  return (
    <section>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors duration-150"
      >
        <svg className={`w-3 h-3 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-heading uppercase tracking-wider">All Flight Options</span>
        <span className="text-[10px] text-[var(--text-3)] font-normal normal-case tracking-normal">
          {cities.length} cities &times; {FLIGHT_CATEGORIES.length} categories
        </span>
      </button>

      {expanded && (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block mt-3 overflow-x-auto rounded-lg border border-[var(--border-default)]">
            <table className="min-w-[700px] w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[var(--surface-1)] text-[10px] text-[var(--text-3)] uppercase tracking-wider font-heading">
                  <th className="text-left py-2.5 px-3 font-semibold sticky left-0 bg-[var(--surface-1)] z-10 min-w-[120px]">
                    City
                  </th>
                  {FLIGHT_CATEGORIES.map((cat) => (
                    <th key={cat.value} className="py-2.5 px-2 font-semibold text-center min-w-[160px]">
                      <div>{cat.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {cities.map((city, rowIdx) => {
                  const cityMin = cheapestPerCity.get(city) ?? Infinity;
                  return (
                    <tr key={city} className={rowIdx % 2 === 1 ? "bg-[var(--surface-0)]" : ""}>
                      <td className="py-2.5 px-3 text-[var(--text-1)] font-medium align-top sticky left-0 bg-[var(--surface-0)] z-10 border-r border-[var(--border-default)]">
                        <div className="text-sm">{city}</div>
                        {perCityCosts.find((c) => c.city === city)?.people != null && (
                          <div className="text-[10px] text-[var(--text-3)]">
                            {perCityCosts.find((c) => c.city === city)!.people} travelers
                          </div>
                        )}
                      </td>
                      {FLIGHT_CATEGORIES.map((cat) => {
                        const options = flightOptions.filter(
                          (f) => f.origin_city === city && f.category === cat.value
                        );
                        const isSelected = selectedKeys.has(`${city}|${cat.value}`);
                        const cheapestPrice = options
                          .filter((f) => f.price != null)
                          .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0]?.price ?? null;
                        const isCheapestInRow = cheapestPrice != null && cheapestPrice === cityMin;
                        const priceTier = getPriceTier(cheapestPrice, priceRange.min, priceRange.max);

                        return (
                          <FlightCell
                            key={cat.value}
                            options={options}
                            isSelected={isSelected}
                            isCheapestInRow={isCheapestInRow}
                            priceTier={priceTier}
                          />
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Legend */}
            <div className="flex items-center gap-4 px-3 py-2 bg-[var(--surface-1)] border-t border-[var(--border-default)] text-[10px] text-[var(--text-3)]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[oklch(0.72_0.15_175_/_15%)] border border-[var(--teal-border)]" />
                <span>Cheapest quartile</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[oklch(0.65_0.2_25_/_15%)] border border-[var(--orange-border)]" />
                <span>Priciest quartile</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm border border-dashed border-[var(--border-default)]" />
                <span>No flights</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--teal-border)] font-semibold">Best</span>
                <span>Cheapest for this city</span>
              </div>
            </div>
          </div>

          {/* Mobile: tab-based view */}
          <div className="sm:hidden mt-3">
            <MobileFlightOptions
              flightOptions={flightOptions}
              cities={cities}
              selectedKeys={selectedKeys}
              priceRange={priceRange}
            />
          </div>
        </>
      )}
    </section>
  );
}
