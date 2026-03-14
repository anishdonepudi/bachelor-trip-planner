"use client";

import { useState } from "react";
import { AirbnbListingRow, BudgetTier } from "@/lib/types";
import { TOTAL_PEOPLE, NIGHTS } from "@/lib/constants";

interface AirbnbGridProps {
  listings: AirbnbListingRow[];
  budgetTier: BudgetTier;
  departDate: string;
  returnDate: string;
  selectedAirbnbUrl: string | null;
}

const BAYESIAN_M = 5;

function AmenityPills({ amenities }: { amenities: string[] }) {
  const [showAll, setShowAll] = useState(false);
  if (amenities.length === 0) return null;
  const visible = showAll ? amenities : amenities.slice(0, 4);
  const hasMore = amenities.length > 4;

  return (
    <div className="flex flex-wrap gap-1 mb-2">
      {visible.map((a) => (
        <span key={a} className="text-[11px] md:text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-3)] border border-[var(--border-default)]">
          {a}
        </span>
      ))}
      {hasMore && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAll(!showAll); }}
          className="text-[11px] md:text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--blue)] hover:text-[var(--text-1)] border border-[var(--border-default)] transition-colors duration-150"
        >
          {showAll ? "Show less" : `+${amenities.length - 4}`}
        </button>
      )}
    </div>
  );
}

function rankListings(tierListings: AirbnbListingRow[]) {
  const rated = tierListings.filter((l) => (l.rating ?? 0) > 0);
  const avgRating = rated.length > 0
    ? rated.reduce((sum, l) => sum + (l.rating ?? 0), 0) / rated.length
    : 4.5;

  return {
    avgRating,
    ranked: tierListings
      .map((l) => {
        const v = l.review_count ?? 0;
        const r = l.rating ?? 0;
        const weightedScore = r > 0 ? (v / (v + BAYESIAN_M)) * r + (BAYESIAN_M / (v + BAYESIAN_M)) * avgRating : 0;
        return { ...l, _score: weightedScore };
      })
      .sort((a, b) => b._score - a._score),
  };
}

function SelectedTooltip({ listing, avgRating }: { listing: AirbnbListingRow & { _score: number }; avgRating: number }) {
  const [show, setShow] = useState(false);
  const v = listing.review_count ?? 0;
  const r = listing.rating ?? 0;

  return (
    <div className="absolute top-2 left-2 z-10" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--teal)] text-white font-semibold tracking-wide cursor-help">
        SELECTED
      </span>
      {show && (
        <div className="absolute top-full left-0 mt-1.5 w-56 rounded-lg bg-[var(--surface-2)] border border-[var(--border-hover)] shadow-xl p-3 text-xs">
          <div className="font-heading text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5">
            Selection Method
          </div>
          <p className="text-[var(--text-2)] mb-2 leading-relaxed text-[11px]">
            Bayesian weighted rating balances actual rating with review confidence.
          </p>
          <div className="space-y-1 text-[var(--text-1)]">
            <div className="flex justify-between"><span className="text-[var(--text-2)]">Rating</span><span className="font-mono tabular-nums">{r > 0 ? r.toFixed(1) : "-"}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-2)]">Reviews</span><span className="font-mono tabular-nums">{v}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-2)]">Tier avg</span><span className="font-mono tabular-nums">{avgRating.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-[var(--border-hover)] pt-1.5">
              <span className="font-semibold text-[var(--text-2)]">Score</span>
              <span className="font-mono font-semibold text-[var(--teal)] tabular-nums">{listing._score.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AirbnbGrid({ listings, budgetTier, departDate, returnDate, selectedAirbnbUrl }: AirbnbGridProps) {
  const [showAll, setShowAll] = useState(false);

  const tierListings = listings.filter((l) => l.budget_tier === budgetTier);
  const { avgRating, ranked } = rankListings(tierListings);
  const top6 = ranked.slice(0, 6);
  const rest = ranked.slice(6);

  if (ranked.length === 0) {
    const searchUrl = `https://www.airbnb.com/s/Tulum--Quintana-Roo--Mexico/homes?tab_id=home_tab&checkin=${departDate}&checkout=${returnDate}&adults=${TOTAL_PEOPLE}&property_type_id%5B%5D=4&amenities%5B%5D=7&currency=USD`;
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-[var(--text-2)] mb-2">No villas found for this tier</p>
        <a href={searchUrl} target="_blank" rel="noopener noreferrer"
          className="text-sm text-[var(--blue)] hover:underline transition-colors duration-150">
          Search on Airbnb
        </a>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h4 className="font-heading text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">Stays</h4>
        <span className="text-[11px] text-[var(--text-3)] font-mono">{ranked.length} listings</span>
      </div>

      {/* Top 6 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {top6.map((listing, i) => {
          const isSelected = listing.airbnb_url === selectedAirbnbUrl;
          return (
            <a
              key={listing.id ?? i}
              href={listing.airbnb_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`group block rounded-lg border overflow-hidden transition-all duration-200 hover:translate-y-[-1px] hover:shadow-lg relative ${
                isSelected
                  ? "border-[var(--teal)] ring-1 ring-[var(--teal-border)] bg-[var(--surface-1)]"
                  : "border-[var(--border-default)] bg-[var(--surface-1)] hover:border-[var(--border-hover)]"
              }`}
            >
              {/* Rank badge */}
              <div className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono ${
                i === 0 ? "bg-[var(--gold)] text-white" : "bg-[var(--surface-0)] text-[var(--text-1)] border border-[var(--border-default)]"
              }`}>
                {i + 1}
              </div>
              {isSelected && <SelectedTooltip listing={listing} avgRating={avgRating} />}
              {listing.image_url && (
                <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-2)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={listing.image_url}
                    alt={listing.listing_name ?? "Villa"}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h5 className="text-sm font-medium text-[var(--text-1)] line-clamp-1">{listing.listing_name ?? "Villa in Tulum"}</h5>
                  {listing.superhost && (
                    <span className="shrink-0 text-[11px] md:text-[9px] px-1.5 py-0.5 rounded bg-[var(--rose-soft)] text-[var(--rose)] border border-[var(--rose-border)] font-semibold">
                      Superhost
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-2)] mb-2">
                  {listing.rating != null && (
                    <span className="flex items-center gap-0.5">
                      <svg className="w-3 h-3 text-[var(--gold)]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="font-mono tabular-nums">{listing.rating}</span>
                    </span>
                  )}
                  {listing.review_count != null && <span>({listing.review_count})</span>}
                  {listing.bedrooms != null && listing.bedrooms > 0 && <span>{listing.bedrooms} bed</span>}
                  {listing.bathrooms != null && listing.bathrooms > 0 && <span>{listing.bathrooms} bath</span>}
                </div>
                {listing.amenities && listing.amenities.length > 0 && (
                  <AmenityPills amenities={listing.amenities} />
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold text-[var(--gold)] font-mono tabular-nums">
                    ${listing.price_per_person_per_night?.toFixed(0) ?? "?"}
                  </span>
                  <span className="text-[11px] text-[var(--text-3)]">/pp/night</span>
                </div>
                <div className="text-[11px] text-[var(--text-3)] mt-0.5 font-mono tabular-nums">
                  ${listing.total_stay_cost?.toFixed(0) ?? "?"} total &middot; {NIGHTS} nights
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Show more */}
      {rest.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-medium text-[var(--blue)] hover:underline transition-colors duration-150"
          >
            {showAll ? "Show less" : `+${rest.length} more listings`}
          </button>

          {showAll && (
            <>
              {/* Mobile: compact list */}
              <div className="mt-2 space-y-1 sm:hidden">
                {rest.map((listing, i) => (
                  <a key={listing.id ?? i} href={listing.airbnb_url ?? "#"} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-[var(--surface-1)] transition-colors duration-150">
                    <span className="text-[11px] font-mono font-semibold text-[var(--text-3)] w-5 text-right shrink-0">{i + 7}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--text-1)] truncate">{listing.listing_name ?? "Villa in Tulum"}</div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-2)] mt-0.5">
                        {listing.rating != null && (
                          <span className="flex items-center gap-0.5">
                            <svg className="w-3 h-3 text-[var(--gold)]" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {listing.rating}
                          </span>
                        )}
                        {listing.review_count != null && <span>({listing.review_count})</span>}
                        {listing.bedrooms != null && listing.bedrooms > 0 && <span>{listing.bedrooms} bed</span>}
                        {listing.bathrooms != null && listing.bathrooms > 0 && <span>{listing.bathrooms} bath</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold font-mono tabular-nums text-[var(--text-1)]">${listing.price_per_person_per_night?.toFixed(0) ?? "?"}</div>
                      <div className="text-[10px] text-[var(--text-3)]">/pp/night</div>
                    </div>
                  </a>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="mt-2 rounded-lg border border-[var(--border-default)] overflow-hidden hidden sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--surface-1)] text-[10px] text-[var(--text-3)] uppercase tracking-wider font-heading">
                      <th className="text-right px-3 py-2 font-semibold w-8">#</th>
                      <th className="text-left px-3 py-2 font-semibold">Name</th>
                      <th className="text-right px-3 py-2 font-semibold">Rating</th>
                      <th className="text-right px-3 py-2 font-semibold">Reviews</th>
                      <th className="text-right px-3 py-2 font-semibold">Beds</th>
                      <th className="text-right px-3 py-2 font-semibold">Baths</th>
                      <th className="text-right px-3 py-2 font-semibold">$/pp/night</th>
                      <th className="text-right px-3 py-2 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {rest.map((listing, i) => (
                      <tr key={listing.id ?? i} className="hover:bg-[var(--surface-1)] transition-colors duration-100">
                        <td className="text-right px-3 py-2 font-mono tabular-nums text-[var(--text-3)] text-[11px] font-semibold">{i + 7}</td>
                        <td className="px-3 py-2">
                          <a href={listing.airbnb_url ?? "#"} target="_blank" rel="noopener noreferrer"
                            className="text-[var(--text-1)] hover:text-[var(--blue)] transition-colors duration-150 line-clamp-1">
                            {listing.listing_name ?? "Villa in Tulum"}
                            {listing.superhost && (
                              <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-[var(--rose-soft)] text-[var(--rose)] border border-[var(--rose-border)] font-semibold">
                                SH
                              </span>
                            )}
                          </a>
                        </td>
                        <td className="text-right px-3 py-2 font-mono tabular-nums text-[var(--text-1)]">{listing.rating ?? "-"}</td>
                        <td className="text-right px-3 py-2 font-mono tabular-nums text-[var(--text-2)]">{listing.review_count ?? "-"}</td>
                        <td className="text-right px-3 py-2 font-mono tabular-nums text-[var(--text-2)]">{listing.bedrooms && listing.bedrooms > 0 ? listing.bedrooms : "-"}</td>
                        <td className="text-right px-3 py-2 font-mono tabular-nums text-[var(--text-2)]">{listing.bathrooms && listing.bathrooms > 0 ? listing.bathrooms : "-"}</td>
                        <td className="text-right px-3 py-2 font-mono tabular-nums font-semibold text-[var(--text-1)]">${listing.price_per_person_per_night?.toFixed(0) ?? "?"}</td>
                        <td className="text-right px-3 py-2 font-mono tabular-nums text-[var(--text-2)]">${listing.total_stay_cost?.toFixed(0) ?? "?"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
