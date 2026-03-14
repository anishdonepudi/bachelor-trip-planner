"use client";

import { useState } from "react";
import { CostBreakdown } from "@/lib/types";
import { FLIGHT_CATEGORIES } from "@/lib/constants";
import { FlightDetails } from "./FlightDetails";
import { FlightCategory, FlightOptionRow } from "@/lib/types";
import { DESTINATION_AIRPORT } from "@/lib/airports";

interface FlightSummaryProps {
  perCityCosts: CostBreakdown[];
  flightCategoryLabel: string;
  selectedCategory: FlightCategory;
}

function getCategoryLabel(value: string): string {
  return FLIGHT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

const CATEGORY_HIERARCHY: FlightCategory[] = [
  "nonstop_carryon",
  "nonstop_no_carryon",
  "onestop_carryon",
  "onestop_no_carryon",
];

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

/** Structured leg display matching the MobileCityCard / FlightAllOptions style */
function FlightLeg({ leg, fromAirport, toAirport, label }: {
  leg: { stops: number; layoverAirport?: string | null; layoverDuration?: string | null; duration?: string | null; departTime?: string | null; arriveTime?: string | null };
  fromAirport: string;
  toAirport: string;
  label: string;
}) {
  return (
    <div className="grid grid-cols-[auto_auto_12px_auto_1fr_auto] items-center gap-x-1.5 text-[11px] whitespace-nowrap">
      <span className="text-[10px] text-[var(--text-3)] uppercase font-medium">{label}</span>
      <span className="font-mono font-medium text-[var(--text-1)]">{fromAirport}</span>
      <svg className="w-3 h-3 text-[var(--text-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
      <span className="font-mono font-medium text-[var(--text-1)]">{toAirport}</span>
      <span className="truncate">
        {leg.stops === 0 ? (
          <span className="text-[var(--teal)] font-medium">Direct</span>
        ) : (
          <span className="text-[var(--orange)]">{leg.stops} stop{leg.layoverAirport && ` ${leg.layoverAirport}`}{leg.layoverDuration && ` (${leg.layoverDuration})`}</span>
        )}
      </span>
      {leg.duration ? (
        <span className="text-[var(--text-3)] text-right">{leg.duration}</span>
      ) : <span />}
    </div>
  );
}

/** Mobile card layout for a single city's flight — matches FlightAllOptions MobileCityCard style */
function MobileCityFlightCard({ cost }: { cost: CostBreakdown }) {
  const [showAlternates, setShowAlternates] = useState(false);
  const { alternateFlights } = cost;
  const hasAlternates = alternateFlights.length > 1;
  const primaryOption = alternateFlights[0] ?? cost.flight ?? null;
  const apt = primaryOption?.airport_used ?? "???";
  const dest = DESTINATION_AIRPORT;

  return (
    <div className={`rounded-lg border overflow-hidden ${
      cost.fallbackCategory
        ? "border-[var(--orange-border)] bg-[var(--surface-0)]"
        : "border-[var(--border-default)] bg-[var(--surface-0)]"
    }`}>
      {/* Header: city + price */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--surface-1)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-1)]">{cost.city}</span>
          {cost.people > 1 && (
            <span className="text-[11px] text-[var(--text-3)]">{cost.people} travelers</span>
          )}
          {cost.fallbackCategory && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--orange-soft)] text-[var(--orange)] border border-[var(--orange-border)] font-medium">
              {getCategoryLabel(cost.fallbackCategory)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {cost.flightCost !== null ? (
            cost.flight?.google_flights_url ? (
              <a
                href={cost.flight.google_flights_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono font-semibold tabular-nums text-[var(--gold)] hover:text-[var(--blue)] transition-colors duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                ${cost.flightCost}
              </a>
            ) : (
              <span className="text-sm font-mono font-semibold tabular-nums text-[var(--gold)]">
                ${cost.flightCost}
              </span>
            )
          ) : (
            <span className="text-xs text-[var(--text-3)]">No flights</span>
          )}
          {hasAlternates && (
            <button
              onClick={() => setShowAlternates(!showAlternates)}
              className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors p-1 min-w-[28px] min-h-[28px] flex items-center justify-center"
            >
              <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${showAlternates ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Flight legs */}
      {primaryOption && (
        <div className="px-3 py-2 space-y-1.5">
          <div className="text-[11px] text-[var(--text-2)] font-medium">{primaryOption.airline ?? "Unknown"}</div>
          {primaryOption.outbound_details && (
            <FlightLeg
              leg={primaryOption.outbound_details}
              fromAirport={apt}
              toAirport={dest}
              label="Out"
            />
          )}
          {primaryOption.return_details && primaryOption.return_details.departTime && (
            <FlightLeg
              leg={primaryOption.return_details}
              fromAirport={dest}
              toAirport={apt}
              label="Ret"
            />
          )}
          {/* Times */}
          {primaryOption.outbound_details?.departTime && primaryOption.outbound_details?.arriveTime && (
            <div className="flex items-center gap-3 pt-1.5 border-t border-[var(--border-default)] whitespace-nowrap overflow-hidden">
              <div className="flex items-center gap-1 text-[11px] text-[var(--text-3)] shrink-0">
                <span className="text-[10px] uppercase font-medium">Out</span>
                <span className="font-mono tabular-nums">{to12h(primaryOption.outbound_details.departTime)}–{to12h(primaryOption.outbound_details.arriveTime)}</span>
              </div>
              {primaryOption.return_details?.departTime && primaryOption.return_details?.arriveTime && (
                <div className="flex items-center gap-1 text-[11px] text-[var(--text-3)] shrink-0">
                  <span className="text-[10px] uppercase font-medium">Ret</span>
                  <span className="font-mono tabular-nums">{to12h(primaryOption.return_details.departTime)}–{to12h(primaryOption.return_details.arriveTime)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fallback explanation */}
      {cost.fallbackCategory && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-md bg-[var(--orange-soft)] border border-[var(--orange-border)]">
          <p className="text-[11px] text-[var(--orange)] leading-relaxed">
            No{" "}
            {cost.skippedCategories.map((cat, i) => (
              <span key={cat}>
                {i > 0 && " or "}
                <span className="font-semibold">{getCategoryLabel(cat)}</span>
              </span>
            ))}
            {" "}found. Showing <span className="font-semibold">{getCategoryLabel(cost.fallbackCategory)}</span>.
          </p>
        </div>
      )}

      {/* Alternate flights */}
      {showAlternates && alternateFlights.length > 1 && (
        <div className="border-t border-[var(--border-default)]">
          {alternateFlights.slice(1).map((alt, i) => (
            <div key={i} className="px-3 py-2 border-b border-[var(--border-default)] last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[var(--text-2)] font-medium">{alt.airline ?? "Unknown"}</span>
                {alt.google_flights_url ? (
                  <a
                    href={alt.google_flights_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono tabular-nums text-[var(--text-1)] hover:text-[var(--blue)] transition-colors duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ${alt.price}
                  </a>
                ) : (
                  <span className="text-sm font-mono tabular-nums text-[var(--text-1)]">${alt.price}</span>
                )}
              </div>
              {alt.outbound_details && (
                <FlightLeg leg={alt.outbound_details} fromAirport={alt.airport_used ?? "???"} toAirport={dest} label="Out" />
              )}
              {alt.return_details && alt.return_details.departTime && (
                <FlightLeg leg={alt.return_details} fromAirport={dest} toAirport={alt.airport_used ?? "???"} label="Ret" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Desktop: original compact row layout */
function DesktopCityFlightRow({ cost, selectedCategory }: { cost: CostBreakdown; selectedCategory: FlightCategory }) {
  const [showAlternates, setShowAlternates] = useState(false);
  const { alternateFlights } = cost;
  const hasAlternates = alternateFlights.length > 1;
  const primaryOption = alternateFlights[0] ?? cost.flight ?? null;

  return (
    <div className="group">
      <div className="flex items-start gap-3 py-2 px-3 rounded-md hover:bg-[var(--surface-1)] transition-colors duration-150">
        <div className="shrink-0 w-32">
          <div className="text-sm font-medium text-[var(--text-1)]">{cost.city}</div>
          {cost.people > 1 && (
            <div className="text-[11px] text-[var(--text-3)]">{cost.people} travelers</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {primaryOption ? (
            <FlightDetails flight={primaryOption} />
          ) : (
            <span className="text-[11px] text-[var(--text-3)]">No flights found</span>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {cost.fallbackCategory && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--orange-soft)] text-[var(--orange)] border border-[var(--orange-border)] whitespace-nowrap font-medium">
              {getCategoryLabel(cost.fallbackCategory)}
            </span>
          )}
          <div className="text-right min-w-[4rem]">
            {cost.flightCost !== null ? (
              cost.flight?.google_flights_url ? (
                <a href={cost.flight.google_flights_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-mono font-semibold tabular-nums text-[var(--gold)] hover:text-[var(--blue)] transition-colors duration-150"
                  onClick={(e) => e.stopPropagation()}>
                  ${cost.flightCost}
                </a>
              ) : (
                <span className="text-sm font-mono font-semibold tabular-nums text-[var(--gold)]">${cost.flightCost}</span>
              )
            ) : (
              <span className="text-xs text-[var(--text-3)]">-</span>
            )}
          </div>
          <div className="w-4">
            {hasAlternates && (
              <button onClick={() => setShowAlternates(!showAlternates)}
                className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150">
                <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${showAlternates ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {cost.fallbackCategory && (
        <div className="mx-3 mb-1 px-3 py-2 rounded-md bg-[var(--orange-soft)] border border-[var(--orange-border)]">
          <p className="text-[11px] text-[var(--orange)] leading-relaxed">
            No{" "}
            {cost.skippedCategories.map((cat, i) => (
              <span key={cat}>
                {i > 0 && " or "}
                <span className="font-semibold">{getCategoryLabel(cat)}</span>
              </span>
            ))}
            {" "}found. Showing <span className="font-semibold">{getCategoryLabel(cost.fallbackCategory)}</span> instead.
          </p>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-[var(--text-3)]">
            {CATEGORY_HIERARCHY.map((cat, i) => {
              const label = getCategoryLabel(cat);
              const isSkipped = cost.skippedCategories.includes(cat);
              const isFallback = cat === cost.fallbackCategory;
              return (
                <span key={cat} className="flex items-center gap-1">
                  {i > 0 && <span>&rarr;</span>}
                  <span className={
                    isFallback ? "text-[var(--orange)] font-semibold"
                      : isSkipped ? "line-through text-[var(--red)]"
                        : ""
                  }>{label}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {showAlternates && alternateFlights.length > 1 && (
        <div className="ml-3 mr-3 mb-1 pl-3 border-l-2 border-[var(--border-default)] space-y-1.5">
          <div className="text-[10px] text-[var(--text-3)] uppercase tracking-wider font-medium pt-1">
            Other options
          </div>
          {alternateFlights.slice(1).map((alt, i) => (
            <div key={i} className="flex items-start gap-3 py-1">
              <div className="flex-1 min-w-0">
                <FlightDetails flight={alt} />
              </div>
              <div className="shrink-0 min-w-[4rem] text-right">
                {alt.google_flights_url ? (
                  <a href={alt.google_flights_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-mono tabular-nums text-[var(--text-1)] hover:text-[var(--blue)] transition-colors duration-150">
                    ${alt.price}
                  </a>
                ) : (
                  <span className="text-sm font-mono tabular-nums text-[var(--text-1)]">${alt.price}</span>
                )}
              </div>
              <div className="w-4" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FlightSummary({
  perCityCosts,
  flightCategoryLabel,
  selectedCategory,
}: FlightSummaryProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <h4 className="font-heading text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">
          Flights
        </h4>
        <span className="text-[11px] text-[var(--text-3)] font-mono">{flightCategoryLabel}</span>
      </div>

      {/* Mobile: card-based layout */}
      <div className="md:hidden space-y-2">
        {perCityCosts.map((cost) => (
          <MobileCityFlightCard key={cost.city} cost={cost} />
        ))}
      </div>

      {/* Desktop: compact row layout */}
      <div className="hidden md:block divide-y divide-[var(--border-default)]">
        {perCityCosts.map((cost) => (
          <DesktopCityFlightRow key={cost.city} cost={cost} selectedCategory={selectedCategory} />
        ))}
      </div>
    </section>
  );
}
