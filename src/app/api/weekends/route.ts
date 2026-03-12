import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const [flightsRes, flightOptionsRes, airbnbRes] = await Promise.all([
      supabase.from("flights").select("*"),
      supabase.from("flight_options").select("*"),
      supabase.from("airbnb_listings").select("*"),
    ]);

    if (flightsRes.error) throw flightsRes.error;
    if (flightOptionsRes.error) throw flightOptionsRes.error;
    if (airbnbRes.error) throw airbnbRes.error;

    return NextResponse.json({
      flights: flightsRes.data ?? [],
      flightOptions: flightOptionsRes.data ?? [],
      airbnbListings: airbnbRes.data ?? [],
    });
  } catch (error) {
    console.error("Error fetching weekends:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekend data" },
      { status: 500 }
    );
  }
}
