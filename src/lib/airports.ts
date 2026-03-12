export const CITY_AIRPORTS: Record<
  string,
  { primary: string[]; nearby: string[] }
> = {
  "San Francisco": { primary: ["SFO"], nearby: ["OAK", "SJC"] },
  "New York City": { primary: ["JFK"], nearby: ["EWR", "LGA"] },
  Philadelphia: { primary: ["PHL"], nearby: [] },
  Houston: { primary: ["IAH"], nearby: ["HOU"] },
  "New Orleans": { primary: ["MSY"], nearby: [] },
  "Washington DC": { primary: ["DCA"], nearby: ["IAD", "BWI"] },
  Chicago: { primary: ["ORD"], nearby: ["MDW"] },
  "Los Angeles": { primary: ["LAX"], nearby: ["BUR", "LGB", "SNA"] },
  Phoenix: { primary: ["PHX"], nearby: ["AZA"] },
  Irvine: { primary: ["SNA"], nearby: ["LAX", "LGB", "ONT"] },
};

export const DESTINATION_AIRPORT = "CUN";

/**
 * Get all airports (primary + nearby) for a city
 */
export function getAllAirports(city: string): string[] {
  const airports = CITY_AIRPORTS[city];
  if (!airports) return [];
  return [...airports.primary, ...airports.nearby];
}
