export const CITY_AIRPORTS: Record<
  string,
  { primary: string[]; nearby: string[] }
> = {
  // Existing entries
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

  // Southeast
  Atlanta: { primary: ["ATL"], nearby: [] },
  Miami: { primary: ["MIA"], nearby: ["FLL", "PBI"] },
  Tampa: { primary: ["TPA"], nearby: ["SRQ", "PIE"] },
  Orlando: { primary: ["MCO"], nearby: ["SFB", "DAB"] },
  Jacksonville: { primary: ["JAX"], nearby: [] },
  Charlotte: { primary: ["CLT"], nearby: ["GSP"] },
  Raleigh: { primary: ["RDU"], nearby: [] },
  Nashville: { primary: ["BNA"], nearby: [] },
  Memphis: { primary: ["MEM"], nearby: [] },
  Richmond: { primary: ["RIC"], nearby: [] },
  "Fort Lauderdale": { primary: ["FLL"], nearby: ["MIA", "PBI"] },

  // Northeast
  Boston: { primary: ["BOS"], nearby: ["PVD", "MHT"] },
  Baltimore: { primary: ["BWI"], nearby: ["DCA", "IAD"] },
  Pittsburgh: { primary: ["PIT"], nearby: [] },
  Hartford: { primary: ["BDL"], nearby: [] },
  Buffalo: { primary: ["BUF"], nearby: [] },
  Providence: { primary: ["PVD"], nearby: ["BOS"] },

  // Texas
  Dallas: { primary: ["DFW"], nearby: ["DAL"] },
  Austin: { primary: ["AUS"], nearby: [] },
  "San Antonio": { primary: ["SAT"], nearby: ["AUS"] },
  "Fort Worth": { primary: ["DFW"], nearby: ["DAL"] },
  "El Paso": { primary: ["ELP"], nearby: [] },

  // Midwest
  Minneapolis: { primary: ["MSP"], nearby: [] },
  Detroit: { primary: ["DTW"], nearby: [] },
  Indianapolis: { primary: ["IND"], nearby: [] },
  Columbus: { primary: ["CMH"], nearby: [] },
  Cincinnati: { primary: ["CVG"], nearby: ["DAY"] },
  "St Louis": { primary: ["STL"], nearby: [] },
  "Kansas City": { primary: ["MCI"], nearby: [] },
  Milwaukee: { primary: ["MKE"], nearby: ["ORD"] },
  Cleveland: { primary: ["CLE"], nearby: ["CAK"] },
  Louisville: { primary: ["SDF"], nearby: [] },
  "Oklahoma City": { primary: ["OKC"], nearby: [] },
  Omaha: { primary: ["OMA"], nearby: [] },

  // West
  Seattle: { primary: ["SEA"], nearby: [] },
  Denver: { primary: ["DEN"], nearby: [] },
  Portland: { primary: ["PDX"], nearby: [] },
  "Las Vegas": { primary: ["LAS"], nearby: [] },
  "Salt Lake City": { primary: ["SLC"], nearby: [] },
  "San Diego": { primary: ["SAN"], nearby: [] },
  Sacramento: { primary: ["SMF"], nearby: [] },
  "San Jose": { primary: ["SJC"], nearby: ["SFO", "OAK"] },
  Tucson: { primary: ["TUS"], nearby: [] },
  Albuquerque: { primary: ["ABQ"], nearby: [] },
  Boise: { primary: ["BOI"], nearby: [] },
  "Colorado Springs": { primary: ["COS"], nearby: ["DEN"] },
  Oakland: { primary: ["OAK"], nearby: ["SFO", "SJC"] },
  Ontario: { primary: ["ONT"], nearby: ["LAX", "BUR", "SNA"] },

  // Other
  Honolulu: { primary: ["HNL"], nearby: [] },
  Anchorage: { primary: ["ANC"], nearby: [] },
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
