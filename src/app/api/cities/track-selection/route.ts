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

    await supabaseAdmin.from("city_selections").insert({
      city_name: name,
      country_code: countryCode,
      lat: lat ?? null,
      lng: lng ?? null,
      state: state ?? null,
      country: country ?? null,
      population: population ?? null,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
