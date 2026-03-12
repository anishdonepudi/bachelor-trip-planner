import { CityConfig } from "@/lib/types";

export const DEFAULT_CITIES: CityConfig[] = [
  {
    city: "San Francisco",
    people: 8,
    primaryAirports: ["SFO"],
    nearbyAirports: ["OAK", "SJC"],
  },
  {
    city: "New York City",
    people: 1,
    primaryAirports: ["JFK"],
    nearbyAirports: ["EWR", "LGA"],
  },
  {
    city: "Philadelphia",
    people: 1,
    primaryAirports: ["PHL"],
    nearbyAirports: [],
  },
  {
    city: "Houston",
    people: 1,
    primaryAirports: ["IAH"],
    nearbyAirports: ["HOU"],
  },
  {
    city: "New Orleans",
    people: 1,
    primaryAirports: ["MSY"],
    nearbyAirports: [],
  },
  {
    city: "Washington DC",
    people: 1,
    primaryAirports: ["DCA"],
    nearbyAirports: ["IAD", "BWI"],
  },
  {
    city: "Chicago",
    people: 1,
    primaryAirports: ["ORD"],
    nearbyAirports: ["MDW"],
  },
  {
    city: "Los Angeles",
    people: 1,
    primaryAirports: ["LAX"],
    nearbyAirports: ["BUR", "LGB", "SNA"],
  },
  {
    city: "Phoenix",
    people: 1,
    primaryAirports: ["PHX"],
    nearbyAirports: ["AZA"],
  },
  {
    city: "Irvine",
    people: 1,
    primaryAirports: ["SNA"],
    nearbyAirports: ["LAX", "LGB", "ONT"],
  },
];

export const DEFAULT_DESTINATION_AIRPORT = "CUN";
export const DEFAULT_TOTAL_PEOPLE = 17;
