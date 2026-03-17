import largeAirports from "@/data/large-airports.json";

interface AirportEntry {
  iata: string;
  lat: number;
  lng: number;
}

const airports: AirportEntry[] = largeAirports as AirportEntry[];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestAirports(lat: number, lng: number): { primary: string[]; nearby: string[] } {
  const withDistance = airports.map((a) => ({
    iata: a.iata,
    distanceKm: haversineKm(lat, lng, a.lat, a.lng),
  }));

  // Primary: closest 2 large airports within 150km
  const primary = withDistance
    .filter((a) => a.distanceKm <= 150)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 2)
    .map((a) => a.iata);

  const primarySet = new Set(primary);

  // Nearby: next closest large airports within 200km
  const nearby = withDistance
    .filter((a) => a.distanceKm <= 200 && !primarySet.has(a.iata))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 4)
    .map((a) => a.iata);

  return { primary, nearby };
}
