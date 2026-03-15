export const CITY_AIRPORTS: Record<
  string,
  { primary: string[]; nearby: string[]; location: string }
> = {
  // Existing entries
  "San Francisco": { primary: ["SFO"], nearby: ["OAK", "SJC"], location: "San Francisco, California, US" },
  "New York City": { primary: ["JFK"], nearby: ["EWR", "LGA"], location: "New York City, New York, US" },
  Philadelphia: { primary: ["PHL"], nearby: [], location: "Philadelphia, Pennsylvania, US" },
  Houston: { primary: ["IAH"], nearby: ["HOU"], location: "Houston, Texas, US" },
  "New Orleans": { primary: ["MSY"], nearby: [], location: "New Orleans, Louisiana, US" },
  "Washington DC": { primary: ["DCA"], nearby: ["IAD", "BWI"], location: "Washington DC, District of Columbia, US" },
  Chicago: { primary: ["ORD"], nearby: ["MDW"], location: "Chicago, Illinois, US" },
  "Los Angeles": { primary: ["LAX"], nearby: ["BUR", "LGB", "SNA"], location: "Los Angeles, California, US" },
  Phoenix: { primary: ["PHX"], nearby: ["AZA"], location: "Phoenix, Arizona, US" },
  Irvine: { primary: ["SNA"], nearby: ["LAX", "LGB", "ONT"], location: "Irvine, California, US" },

  // Southeast
  Atlanta: { primary: ["ATL"], nearby: [], location: "Atlanta, Georgia, US" },
  Miami: { primary: ["MIA"], nearby: ["FLL", "PBI"], location: "Miami, Florida, US" },
  Tampa: { primary: ["TPA"], nearby: ["SRQ", "PIE"], location: "Tampa, Florida, US" },
  Orlando: { primary: ["MCO"], nearby: ["SFB", "DAB"], location: "Orlando, Florida, US" },
  Jacksonville: { primary: ["JAX"], nearby: [], location: "Jacksonville, Florida, US" },
  Charlotte: { primary: ["CLT"], nearby: ["GSP"], location: "Charlotte, North Carolina, US" },
  Raleigh: { primary: ["RDU"], nearby: [], location: "Raleigh, North Carolina, US" },
  Nashville: { primary: ["BNA"], nearby: [], location: "Nashville, Tennessee, US" },
  Memphis: { primary: ["MEM"], nearby: [], location: "Memphis, Tennessee, US" },
  Richmond: { primary: ["RIC"], nearby: [], location: "Richmond, Virginia, US" },
  "Fort Lauderdale": { primary: ["FLL"], nearby: ["MIA", "PBI"], location: "Fort Lauderdale, Florida, US" },

  // Northeast
  Boston: { primary: ["BOS"], nearby: ["PVD", "MHT"], location: "Boston, Massachusetts, US" },
  Baltimore: { primary: ["BWI"], nearby: ["DCA", "IAD"], location: "Baltimore, Maryland, US" },
  Pittsburgh: { primary: ["PIT"], nearby: [], location: "Pittsburgh, Pennsylvania, US" },
  Hartford: { primary: ["BDL"], nearby: [], location: "Hartford, Connecticut, US" },
  Buffalo: { primary: ["BUF"], nearby: [], location: "Buffalo, New York, US" },
  Providence: { primary: ["PVD"], nearby: ["BOS"], location: "Providence, Rhode Island, US" },

  // Texas
  Dallas: { primary: ["DFW"], nearby: ["DAL"], location: "Dallas, Texas, US" },
  Austin: { primary: ["AUS"], nearby: [], location: "Austin, Texas, US" },
  "San Antonio": { primary: ["SAT"], nearby: ["AUS"], location: "San Antonio, Texas, US" },
  "Fort Worth": { primary: ["DFW"], nearby: ["DAL"], location: "Fort Worth, Texas, US" },
  "El Paso": { primary: ["ELP"], nearby: [], location: "El Paso, Texas, US" },

  // Midwest
  Minneapolis: { primary: ["MSP"], nearby: [], location: "Minneapolis, Minnesota, US" },
  Detroit: { primary: ["DTW"], nearby: [], location: "Detroit, Michigan, US" },
  Indianapolis: { primary: ["IND"], nearby: [], location: "Indianapolis, Indiana, US" },
  Columbus: { primary: ["CMH"], nearby: [], location: "Columbus, Ohio, US" },
  Cincinnati: { primary: ["CVG"], nearby: ["DAY"], location: "Cincinnati, Ohio, US" },
  "St Louis": { primary: ["STL"], nearby: [], location: "St Louis, Missouri, US" },
  "Kansas City": { primary: ["MCI"], nearby: [], location: "Kansas City, Missouri, US" },
  Milwaukee: { primary: ["MKE"], nearby: ["ORD"], location: "Milwaukee, Wisconsin, US" },
  Cleveland: { primary: ["CLE"], nearby: ["CAK"], location: "Cleveland, Ohio, US" },
  Louisville: { primary: ["SDF"], nearby: [], location: "Louisville, Kentucky, US" },
  "Oklahoma City": { primary: ["OKC"], nearby: [], location: "Oklahoma City, Oklahoma, US" },
  Omaha: { primary: ["OMA"], nearby: [], location: "Omaha, Nebraska, US" },

  // West
  Seattle: { primary: ["SEA"], nearby: [], location: "Seattle, Washington, US" },
  Denver: { primary: ["DEN"], nearby: [], location: "Denver, Colorado, US" },
  Portland: { primary: ["PDX"], nearby: [], location: "Portland, Oregon, US" },
  "Las Vegas": { primary: ["LAS"], nearby: [], location: "Las Vegas, Nevada, US" },
  "Salt Lake City": { primary: ["SLC"], nearby: [], location: "Salt Lake City, Utah, US" },
  "San Diego": { primary: ["SAN"], nearby: [], location: "San Diego, California, US" },
  Sacramento: { primary: ["SMF"], nearby: [], location: "Sacramento, California, US" },
  "San Jose": { primary: ["SJC"], nearby: ["SFO", "OAK"], location: "San Jose, California, US" },
  Tucson: { primary: ["TUS"], nearby: [], location: "Tucson, Arizona, US" },
  Albuquerque: { primary: ["ABQ"], nearby: [], location: "Albuquerque, New Mexico, US" },
  Boise: { primary: ["BOI"], nearby: [], location: "Boise, Idaho, US" },
  "Colorado Springs": { primary: ["COS"], nearby: ["DEN"], location: "Colorado Springs, Colorado, US" },
  Oakland: { primary: ["OAK"], nearby: ["SFO", "SJC"], location: "Oakland, California, US" },
  Ontario: { primary: ["ONT"], nearby: ["LAX", "BUR", "SNA"], location: "Ontario, California, US" },

  // Other
  Honolulu: { primary: ["HNL"], nearby: [], location: "Honolulu, Hawaii, US" },
  Anchorage: { primary: ["ANC"], nearby: [], location: "Anchorage, Alaska, US" },
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

export function getCityLocation(city: string): string {
  return CITY_AIRPORTS[city]?.location ?? city;
}
