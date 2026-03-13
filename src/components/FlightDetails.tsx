"use client";

import { FlightOptionRow } from "@/lib/types";
import { DESTINATION_AIRPORT } from "@/lib/airports";

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

export function FlightDetails({ flight }: { flight: FlightOptionRow }) {
  const out = flight.outbound_details;
  const ret = flight.return_details;
  const apt = flight.airport_used ?? "???";
  const dest = DESTINATION_AIRPORT;

  return (
    <div className="space-y-0.5">
      {out && (
        <div className="flex items-center gap-1 text-[11px] text-[var(--text-2)]">
          <span className="font-mono text-[var(--text-1)] font-medium">{apt}</span>
          <svg className="w-3 h-3 text-[var(--text-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span className="font-mono text-[var(--text-1)] font-medium">{dest}</span>
          <span className="mx-0.5 text-[var(--text-3)]">&middot;</span>
          <span>{flight.airline ?? "Unknown"}</span>
          {out.duration && (
            <>
              <span className="mx-0.5 text-[var(--text-3)]">&middot;</span>
              <span>{out.duration}</span>
            </>
          )}
          {out.stops === 0 ? (
            <>
              <span className="mx-0.5 text-[var(--text-3)]">&middot;</span>
              <span className="text-[var(--teal)]">Direct</span>
            </>
          ) : (
            <>
              <span className="mx-0.5 text-[var(--text-3)]">&middot;</span>
              <span className="text-[var(--orange)]">{out.stops} stop{out.layoverAirport && ` ${out.layoverAirport}`}{out.layoverDuration && ` (${out.layoverDuration})`}</span>
            </>
          )}
          {out.departTime && out.arriveTime && (
            <>
              <span className="mx-0.5 text-[var(--text-3)]">&middot;</span>
              <span className="font-mono tabular-nums">{to12h(out.departTime)}-{to12h(out.arriveTime)}</span>
            </>
          )}
        </div>
      )}
      {ret && ret.departTime && (
        <div className="flex items-center gap-1 text-[11px] text-[var(--text-2)]">
          <span className="font-mono text-[var(--text-1)] font-medium">{dest}</span>
          <svg className="w-3 h-3 text-[var(--text-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span className="font-mono text-[var(--text-1)] font-medium">{apt}</span>
          <span className="mx-0.5 text-[var(--text-3)]">&middot;</span>
          <span>{flight.airline ?? "Unknown"}</span>
          {ret.duration && (
            <>
              <span className="mx-0.5 text-[var(--text-3)]">&middot;</span>
              <span>{ret.duration}</span>
            </>
          )}
          {ret.stops === 0 ? (
            <>
              <span className="mx-0.5 text-[var(--text-3)]">&middot;</span>
              <span className="text-[var(--teal)]">Direct</span>
            </>
          ) : (
            <>
              <span className="mx-0.5 text-[var(--text-3)]">&middot;</span>
              <span className="text-[var(--orange)]">{ret.stops} stop{ret.layoverAirport && ` ${ret.layoverAirport}`}{ret.layoverDuration && ` (${ret.layoverDuration})`}</span>
            </>
          )}
          {ret.departTime && ret.arriveTime && (
            <>
              <span className="mx-0.5 text-[var(--text-3)]">&middot;</span>
              <span className="font-mono tabular-nums">{to12h(ret.departTime)}-{to12h(ret.arriveTime)}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
