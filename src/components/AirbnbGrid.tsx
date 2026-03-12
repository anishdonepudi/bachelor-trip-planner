"use client";

import { AirbnbListingRow, BudgetTier } from "@/lib/types";
import { TOTAL_PEOPLE, NIGHTS } from "@/lib/constants";

interface AirbnbGridProps {
  listings: AirbnbListingRow[];
  budgetTier: BudgetTier;
  departDate: string;
  returnDate: string;
}

export function AirbnbGrid({
  listings,
  budgetTier,
  departDate,
  returnDate,
}: AirbnbGridProps) {
  const filtered = listings
    .filter((l) => l.budget_tier === budgetTier)
    .sort(
      (a, b) =>
        (a.price_per_person_per_night ?? Infinity) -
        (b.price_per_person_per_night ?? Infinity)
    )
    .slice(0, 6);

  if (filtered.length === 0) {
    const searchUrl = `https://www.airbnb.com/s/Tulum--Quintana-Roo--Mexico/homes?tab_id=home_tab&checkin=${departDate}&checkout=${returnDate}&adults=${TOTAL_PEOPLE}&property_type_id%5B%5D=4&amenities%5B%5D=7&currency=USD`;
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-zinc-500 mb-2">
          No villas found for this tier and dates
        </p>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-sky-500 hover:text-sky-400"
        >
          Search on Airbnb
        </a>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Airbnb Villas
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((listing, i) => (
          <a
            key={listing.id ?? i}
            href={listing.airbnb_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900 transition-all overflow-hidden"
          >
            {listing.image_url && (
              <div className="aspect-[16/10] overflow-hidden bg-zinc-800">
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
                <h5 className="text-sm font-medium text-zinc-200 line-clamp-1">
                  {listing.listing_name ?? "Villa in Tulum"}
                </h5>
                {listing.superhost && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    Superhost
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
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
                {listing.bedrooms != null && (
                  <span>{listing.bedrooms}bd/{listing.bathrooms ?? "?"}ba</span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-zinc-100 font-mono">
                  ${listing.price_per_person_per_night?.toFixed(0) ?? "?"}
                </span>
                <span className="text-xs text-zinc-500">/person/night</span>
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                ${listing.total_stay_cost?.toFixed(0) ?? "?"} total ({NIGHTS} nights)
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
