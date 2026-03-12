import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DEFAULT_CITIES = [
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

async function seedConfig() {
  // Check if config already exists
  const { data: existing } = await supabase.from("config").select("id");

  if (existing && existing.length > 0) {
    console.log("Config already exists, updating...");
    const { error } = await supabase
      .from("config")
      .update({
        cities: DEFAULT_CITIES,
        destination_airport: "CUN",
        total_people: 17,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing[0].id);

    if (error) {
      console.error("Error updating config:", error);
      process.exit(1);
    }
  } else {
    console.log("Inserting default config...");
    const { error } = await supabase.from("config").insert({
      cities: DEFAULT_CITIES,
      destination_airport: "CUN",
      total_people: 17,
    });

    if (error) {
      console.error("Error inserting config:", error);
      process.exit(1);
    }
  }

  console.log("Config seeded successfully!");
  console.log(`  Cities: ${DEFAULT_CITIES.length}`);
  console.log(
    `  Total people: ${DEFAULT_CITIES.reduce((sum, c) => sum + c.people, 0)}`
  );
}

seedConfig();
