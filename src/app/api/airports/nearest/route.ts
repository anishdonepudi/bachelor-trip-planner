import { NextRequest, NextResponse } from "next/server";
import { haversineKm } from "@/lib/geo";
import airportsData from "@/data/airports.json";

interface Airport {
  iata: string;
  name: string;
  lat: number;
  lng: number;
  type: "large_airport" | "medium_airport";
  country: string;
}

const airports: Airport[] = airportsData as Airport[];

interface AirportResult {
  iata: string;
  name: string;
  distanceKm: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng query parameters are required" },
      { status: 400 }
    );
  }

  // Calculate distances for all airports
  const withDistance = airports.map((a) => ({
    ...a,
    distanceKm: haversineKm(lat, lng, a.lat, a.lng),
  }));

  // Primary: large airports within 100km, closest 2
  const largePrimary = withDistance
    .filter((a) => a.type === "large_airport" && a.distanceKm <= 100)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 2);

  // If no large airport within 100km, promote closest medium
  let primary: typeof withDistance;
  if (largePrimary.length === 0) {
    const closestMedium = withDistance
      .filter((a) => a.distanceKm <= 200)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 1);
    primary = closestMedium;
  } else {
    primary = largePrimary;
  }

  const primaryIatas = new Set(primary.map((a) => a.iata));

  // Nearby: remaining large + medium airports within 200km, closest 4
  const nearby = withDistance
    .filter((a) => a.distanceKm <= 200 && !primaryIatas.has(a.iata))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 4);

  const format = (a: (typeof withDistance)[0]): AirportResult => ({
    iata: a.iata,
    name: a.name,
    distanceKm: Math.round(a.distanceKm),
  });

  return NextResponse.json({
    primary: primary.map(format),
    nearby: nearby.map(format),
  });
}
