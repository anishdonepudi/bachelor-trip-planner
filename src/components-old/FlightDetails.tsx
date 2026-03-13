"use client";

import { FlightOptionRow } from "@/lib/types";
import { DESTINATION_AIRPORT } from "@/lib/airports";

export function FlightDetails({ flight }: { flight: FlightOptionRow }) {
  const out = flight.outbound_details;
  const ret = flight.return_details;
  const apt = flight.airport_used ?? "???";
  const dest = DESTINATION_AIRPORT;

  return (
    <div className="text-xs text-[var(--color-text-secondary)] space-y-0.5">
      {out && (
        <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
          <span className="text-[var(--color-text-secondary)]">{apt} → {dest}</span>
          <span>·</span>
          <span className="text-[var(--color-text-secondary)]">{flight.airline ?? "Unknown"}</span>
          {out.duration && <><span>·</span><span>{out.duration}</span></>}
          {out.stops === 0 ? (
            <><span>·</span><span>Nonstop</span></>
          ) : (
            <><span>·</span><span>{out.stops} stop{out.layoverAirport && ` (${out.layoverAirport})`}</span></>
          )}
          {out.departTime && out.arriveTime && (
            <><span>·</span><span>{out.departTime}–{out.arriveTime}</span></>
          )}
        </div>
      )}
      {ret && ret.departTime && (
        <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
          <span className="text-[var(--color-text-secondary)]">{dest} → {apt}</span>
          <span>·</span>
          <span className="text-[var(--color-text-secondary)]">{flight.airline ?? "Unknown"}</span>
          {ret.duration && <><span>·</span><span>{ret.duration}</span></>}
          {ret.stops === 0 ? (
            <><span>·</span><span>Nonstop</span></>
          ) : (
            <><span>·</span><span>{ret.stops} stop{ret.layoverAirport && ` (${ret.layoverAirport})`}</span></>
          )}
          {ret.departTime && ret.arriveTime && (
            <><span>·</span><span>{ret.departTime}–{ret.arriveTime}</span></>
          )}
        </div>
      )}
    </div>
  );
}
