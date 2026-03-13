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

function rankListings(tierListings: AirbnbListingRow[]) {
  const rated = tierListings.filter((l) => (l.rating ?? 0) > 0);
  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, l) => sum + (l.rating ?? 0), 0) / rated.length
      : 4.5;

  return { avgRating, ranked: tierListings
    .map((l) => {
      const v = l.review_count ?? 0;
      const r = l.rating ?? 0;
      const weightedScore =
        r > 0 ? (v / (v + BAYESIAN_M)) * r + (BAYESIAN_M / (v + BAYESIAN_M)) * avgRating : 0;
      return { ...l, _score: weightedScore };
    })
    .sort((a, b) => b._score - a._score) };
}

function SelectedBadge({ listing, avgRating }: { listing: AirbnbListingRow & { _score: number }; avgRating: number }) {
  const [show, setShow] = useState(false);
  const v = listing.review_count ?? 0;
  const r = listing.rating ?? 0;

  return (
    <div
      className="absolute top-2 left-2 z-10"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-emerald)] text-white font-semibold cursor-help">
        SELECTED
      </span>
      {show && (
        <div className="absolute top-full left-0 mt-1.5 w-64 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--border-hover)] shadow-xl p-3 text-xs">
          <div className="text-[var(--color-text-secondary)] font-semibold uppercase tracking-wider mb-1.5">
            Why this listing?
          </div>
          <p className="text-[var(--color-text-secondary)] mb-2 leading-relaxed">
            Selected using Bayesian weighted rating — balances actual rating with review confidence so new listings with few reviews don&apos;t rank artificially high.
          </p>
          <div className="space-y-1.5 text-[var(--color-text-primary)]">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Rating</span>
              <span className="font-mono">{r > 0 ? r.toFixed(1) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Reviews</span>
              <span className="font-mono">{v}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Tier avg rating</span>
              <span className="font-mono">{avgRating.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--border-hover)] pt-1.5">
              <span className="text-[var(--color-text-secondary)] font-semibold">Weighted score</span>
              <span className="font-mono font-semibold text-emerald-400">{listing._score.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AirbnbGrid({
  listings,
  budgetTier,
  departDate,
  returnDate,
  selectedAirbnbUrl,
}: AirbnbGridProps) {
  const [showAll, setShowAll] = useState(false);

  const tierListings = listings.filter((l) => l.budget_tier === budgetTier);
  const { avgRating, ranked } = rankListings(tierListings);
  const top6 = ranked.slice(0, 6);
  const rest = ranked.slice(6);

  if (ranked.length === 0) {
    const searchUrl = `https://www.airbnb.com/s/Tulum--Quintana-Roo--Mexico/homes?tab_id=home_tab&checkin=${departDate}&checkout=${returnDate}&adults=${TOTAL_PEOPLE}&property_type_id%5B%5D=4&amenities%5B%5D=7&currency=USD`;
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-[var(--color-text-secondary)] mb-2">
          No villas found for this tier and dates
        </p>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--color-indigo)] hover:text-[oklch(0.6_0.2_265)]"
        >
          Search on Airbnb
        </a>
      </div>
    );
  }

  return (
    <div>
      <h4 className="font-heading text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
        Airbnb Villas ({ranked.length} listings)
      </h4>

      {/* Top 6 — card grid with images */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {top6.map((listing, i) => {
          const isSelected = listing.airbnb_url === selectedAirbnbUrl;
          return (
          <a
            key={listing.id ?? i}
            href={listing.airbnb_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`group block rounded-2xl border bg-[var(--color-surface-base)]/50 hover:bg-[var(--color-surface-base)] transition-all overflow-hidden relative ${
              isSelected
                ? "border-2 border-[var(--color-emerald)] ring-2 ring-[oklch(0.62_0.17_165_/_40%)] shadow-[var(--glow-emerald)]"
                : "border-[var(--border)] hover:border-[var(--border-hover)]"
            }`}
          >
            {isSelected && (
              <SelectedBadge listing={listing} avgRating={avgRating} />
            )}
            {listing.image_url && (
              <div className="aspect-[16/10] overflow-hidden bg-[var(--color-surface-elevated)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={listing.image_url}
                  alt={listing.listing_name ?? "Villa"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h5 className="text-sm font-medium text-[var(--color-text-primary)] line-clamp-1">
                  {listing.listing_name ?? "Villa in Tulum"}
                </h5>
                {listing.superhost && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    Superhost
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mb-2">
                {listing.rating != null && (
                  <span className="flex items-center gap-0.5">
                    <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {listing.rating}
                  </span>
                )}
                {listing.review_count != null && (
                  <span>({listing.review_count})</span>
                )}
                {listing.bedrooms != null && listing.bedrooms > 0 && (
                  <span>{listing.bedrooms}bd</span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-[var(--color-amber)] font-mono">
                  ${listing.price_per_person_per_night?.toFixed(0) ?? "?"}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">/person/night</span>
              </div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                ${listing.total_stay_cost?.toFixed(0) ?? "?"} total ({NIGHTS} nights)
              </div>
            </div>
          </a>
          );
        })}
      </div>

      {/* Show all button + list view for remaining */}
      {rest.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-[var(--color-indigo)] hover:text-[oklch(0.6_0.2_265)] transition-colors"
          >
            {showAll ? "Hide" : `Show ${rest.length} more listings`}
          </button>

          {showAll && (
            <>
              {/* Mobile: compact cards */}
              <div className="mt-3 space-y-2 sm:hidden">
                {rest.map((listing, i) => (
                  <a
                    key={listing.id ?? i}
                    href={listing.airbnb_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--color-surface-base)]/30 hover:bg-[var(--color-surface-base)]/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--color-text-primary)] truncate">
                        {listing.listing_name ?? "Villa in Tulum"}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mt-0.5">
                        {listing.rating != null && (
                          <span className="flex items-center gap-0.5">
                            <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {listing.rating}
                          </span>
                        )}
                        {listing.review_count != null && <span>({listing.review_count})</span>}
                        {listing.bedrooms != null && listing.bedrooms > 0 && <span>{listing.bedrooms}bd</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold font-mono text-[var(--color-text-primary)]">
                        ${listing.price_per_person_per_night?.toFixed(0) ?? "?"}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-secondary)]">/pp/night</div>
                    </div>
                  </a>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="mt-3 border border-[var(--border)] rounded-2xl overflow-hidden hidden sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--color-surface-base)]/80 text-[var(--color-text-secondary)] text-xs uppercase tracking-wider">
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-right px-3 py-2">Rating</th>
                      <th className="text-right px-3 py-2">Reviews</th>
                      <th className="text-right px-3 py-2">Beds</th>
                      <th className="text-right px-3 py-2">$/person/night</th>
                      <th className="text-right px-3 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((listing, i) => (
                      <tr
                        key={listing.id ?? i}
                        className="border-t border-[var(--border)] hover:bg-[var(--color-surface-base)]/50 transition-colors"
                      >
                        <td className="px-3 py-2">
                          <a
                            href={listing.airbnb_url ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-text-primary)] hover:text-[var(--color-indigo)] transition-colors line-clamp-1"
                          >
                            {listing.listing_name ?? "Villa in Tulum"}
                            {listing.superhost && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                Superhost
                              </span>
                            )}
                          </a>
                        </td>
                        <td className="text-right px-3 py-2 text-[var(--color-text-primary)] font-mono">
                          {listing.rating ?? "-"}
                        </td>
                        <td className="text-right px-3 py-2 text-[var(--color-text-secondary)] font-mono">
                          {listing.review_count ?? "-"}
                        </td>
                        <td className="text-right px-3 py-2 text-[var(--color-text-secondary)] font-mono">
                          {listing.bedrooms && listing.bedrooms > 0
                            ? listing.bedrooms
                            : "-"}
                        </td>
                        <td className="text-right px-3 py-2 text-[var(--color-text-primary)] font-mono font-semibold">
                          ${listing.price_per_person_per_night?.toFixed(0) ?? "?"}
                        </td>
                        <td className="text-right px-3 py-2 text-[var(--color-text-secondary)] font-mono">
                          ${listing.total_stay_cost?.toFixed(0) ?? "?"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
