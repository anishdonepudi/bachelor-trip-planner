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

// ── In-memory cache keyed by rounded lat/lng (~11km grid) ──
interface CacheEntry {
  data: { primary: AirportResult[]; nearby: AirportResult[] };
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_MAX_ENTRIES = 500;

function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(1)},${lng.toFixed(1)}`;
}

function evictStaleEntries() {
  if (cache.size <= CACHE_MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL_MS) cache.delete(key);
  }
  // If still over limit, remove oldest entries
  if (cache.size > CACHE_MAX_ENTRIES) {
    const entries = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, cache.size - CACHE_MAX_ENTRIES);
    for (const [key] of toRemove) cache.delete(key);
  }
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

  // Check cache
  const cacheKey = getCacheKey(lat, lng);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // Calculate distances for all airports
  const withDistance = airports.map((a) => ({
    ...a,
    distanceKm: haversineKm(lat, lng, a.lat, a.lng),
  }));

  // Primary: large airports within 150km, closest 2
  const largePrimary = withDistance
    .filter((a) => a.type === "large_airport" && a.distanceKm <= 150)
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

  // Nearby: remaining large airports within 200km, closest 4
  const nearby = withDistance
    .filter((a) => a.type === "large_airport" && a.distanceKm <= 200 && !primaryIatas.has(a.iata))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 4);

  const format = (a: (typeof withDistance)[0]): AirportResult => ({
    iata: a.iata,
    name: a.name,
    distanceKm: Math.round(a.distanceKm),
  });

  const result = {
    primary: primary.map(format),
    nearby: nearby.map(format),
  };

  // Store in cache
  cache.set(cacheKey, { data: result, timestamp: Date.now() });
  evictStaleEntries();

  return NextResponse.json(result);
}
