import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const body = await request.json();
    const { name, countryCode, lat, lng, state, country, population } = body;

    if (!name || !countryCode) {
      return NextResponse.json(
        { error: "name and countryCode are required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("city_selections").insert({
      city_name: name,
      country_code: countryCode,
      lat: lat ?? null,
      lng: lng ?? null,
      state: state ?? null,
      country: country ?? null,
      population: population ?? null,
    });

    if (error) {
      console.error("city_selections insert failed:", error.message, error.code);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("track-selection error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
