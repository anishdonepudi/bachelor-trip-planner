import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Protect with service key check (same pattern as refresh-tourism)
  const authHeader = request.headers.get("authorization");
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Aggregate city selections
    const { data: aggregated, error: aggError } = await supabaseAdmin.rpc(
      "aggregate_city_selections"
    ).select("*");

    // If RPC doesn't exist, fall back to raw query approach
    let cityStats: Array<{
      city_name: string;
      country_code: string;
      selection_count_all: number;
      selection_count_30d: number;
      latest_lat: number | null;
      latest_lng: number | null;
      latest_state: string | null;
      latest_country: string | null;
      latest_population: number | null;
    }> = [];

    if (aggError || !aggregated) {
      // Use direct query via supabaseAdmin
      const { data: rawSelections, error: rawError } = await supabaseAdmin
        .from("city_selections")
        .select("city_name, country_code, lat, lng, state, country, population, selected_at")
        .order("selected_at", { ascending: false });

      if (rawError || !rawSelections) {
        return NextResponse.json(
          { error: "Failed to query city_selections", details: rawError?.message },
          { status: 500 }
        );
      }

      // Aggregate in JS
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const cityMap = new Map<string, {
        city_name: string;
        country_code: string;
        selection_count_all: number;
        selection_count_30d: number;
        latest_lat: number | null;
        latest_lng: number | null;
        latest_state: string | null;
        latest_country: string | null;
        latest_population: number | null;
      }>();

      for (const row of rawSelections) {
        const key = `${row.city_name}::${row.country_code}`;
        const existing = cityMap.get(key);
        const isRecent = new Date(row.selected_at) > thirtyDaysAgo;

        if (!existing) {
          // First (most recent) entry for this city
          cityMap.set(key, {
            city_name: row.city_name,
            country_code: row.country_code,
            selection_count_all: 1,
            selection_count_30d: isRecent ? 1 : 0,
            latest_lat: row.lat,
            latest_lng: row.lng,
            latest_state: row.state,
            latest_country: row.country,
            latest_population: row.population,
          });
        } else {
          existing.selection_count_all += 1;
          if (isRecent) existing.selection_count_30d += 1;
        }
      }

      cityStats = Array.from(cityMap.values());
    } else {
      cityStats = aggregated;
    }

    // Step 2: Filter cities with >= 2 total selections
    const qualified = cityStats.filter((c) => c.selection_count_all >= 2);

    let updated = 0;
    let added = 0;

    // Step 3: Upsert each qualified city into popular_cities
    for (const city of qualified) {
      const popularityScore = (city.selection_count_30d * 3) + city.selection_count_all;

      const { data: existing } = await supabaseAdmin
        .from("popular_cities")
        .select("id")
        .eq("name", city.city_name)
        .eq("country_code", city.country_code)
        .maybeSingle();

      if (existing) {
        // Update existing entry
        await supabaseAdmin
          .from("popular_cities")
          .update({
            popularity_score: popularityScore,
            selection_count_30d: city.selection_count_30d,
            selection_count_all: city.selection_count_all,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        updated++;
      } else {
        // Insert new entry
        await supabaseAdmin
          .from("popular_cities")
          .insert({
            name: city.city_name,
            country_code: city.country_code,
            lat: city.latest_lat ?? 0,
            lng: city.latest_lng ?? 0,
            state: city.latest_state,
            country: city.latest_country ?? "Unknown",
            population: city.latest_population ?? 0,
            popularity_score: popularityScore,
            selection_count_30d: city.selection_count_30d,
            selection_count_all: city.selection_count_all,
            source: "dynamic",
          });
        added++;
      }
    }

    // Step 4: Update scores for seed/pinned cities that also have selections
    const seedCitiesWithSelections = cityStats.filter(
      (c) => c.selection_count_all > 0 && !qualified.includes(c)
    );
    for (const city of seedCitiesWithSelections) {
      const popularityScore = (city.selection_count_30d * 3) + city.selection_count_all;
      const { data: existing } = await supabaseAdmin
        .from("popular_cities")
        .select("id, popularity_score")
        .eq("name", city.city_name)
        .eq("country_code", city.country_code)
        .maybeSingle();

      if (existing) {
        // Only update if the computed score is higher than the base
        const newScore = Math.max(existing.popularity_score, popularityScore);
        await supabaseAdmin
          .from("popular_cities")
          .update({
            popularity_score: newScore,
            selection_count_30d: city.selection_count_30d,
            selection_count_all: city.selection_count_all,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        updated++;
      }
    }

    // Get total count
    const { count } = await supabaseAdmin
      .from("popular_cities")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      updated,
      added,
      total: count ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
