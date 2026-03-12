"use client";

import { FlightOptionRow } from "@/lib/types";
import { DESTINATION_AIRPORT } from "@/lib/airports";

export function FlightDetails({ flight }: { flight: FlightOptionRow }) {
  const out = flight.outbound_details;
  const ret = flight.return_details;
  const apt = flight.airport_used ?? "???";
  const dest = DESTINATION_AIRPORT;

  return (
    <div className="text-xs text-zinc-500 space-y-0.5">
      {out && (
        <div>
          <span className="text-zinc-400">{apt} → {dest}</span>
          {" · "}
          <span className="text-zinc-400">{flight.airline ?? "Unknown"}</span>
          {out.duration && <span> · {out.duration}</span>}
          {out.stops === 0 ? (
            <span> · Nonstop</span>
          ) : (
            <span>
              {" "}
              · {out.stops} stop
              {out.layoverAirport && ` (${out.layoverAirport})`}
            </span>
          )}
          {out.departTime && out.arriveTime && (
            <span>
              {" "}
              · {out.departTime}–{out.arriveTime}
            </span>
          )}
        </div>
      )}
      {ret && ret.departTime && (
        <div>
          <span className="text-zinc-400">{dest} → {apt}</span>
          {" · "}
          <span className="text-zinc-400">{flight.airline ?? "Unknown"}</span>
          {ret.duration && <span> · {ret.duration}</span>}
          {ret.stops === 0 ? (
            <span> · Nonstop</span>
          ) : (
            <span>
              {" "}
              · {ret.stops} stop
              {ret.layoverAirport && ` (${ret.layoverAirport})`}
            </span>
          )}
          {ret.departTime && ret.arriveTime && (
            <span>
              {" "}
              · {ret.departTime}–{ret.arriveTime}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
