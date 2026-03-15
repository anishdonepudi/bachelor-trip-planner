import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import popularCities from "@/data/popular-cities.json";

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase config");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from("popular_cities")
      .select("name, state, country, country_code, lat, lng, population")
      .order("popularity_score", { ascending: false })
      .limit(200);

    if (error || !data) {
      throw new Error(error?.message ?? "No data returned");
    }

    // Map country_code to countryCode to maintain API contract
    const mapped = data.map((city) => ({
      name: city.name,
      state: city.state,
      country: city.country,
      countryCode: city.country_code,
      lat: city.lat,
      lng: city.lng,
      population: city.population,
    }));

    return NextResponse.json(mapped, {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    // Fall back to static JSON
    return NextResponse.json(popularCities, {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
}
