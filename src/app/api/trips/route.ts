import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getAuthUser } from "@/lib/auth-check";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get trips where user is owner or collaborator
  const { data: ownedTrips, error: ownedError } = await supabaseAdmin
    .from("trips")
    .select("id, name, destination_city, destination_airport, cities, total_people, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (ownedError) {
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
  }

  const { data: collabRows } = await supabaseAdmin
    .from("trip_collaborators")
    .select("trip_id")
    .eq("user_id", user.id);

  let collabTrips: typeof ownedTrips = [];
  if (collabRows && collabRows.length > 0) {
    const collabIds = collabRows.map((r) => r.trip_id);
    const { data } = await supabaseAdmin
      .from("trips")
      .select("id, name, destination_city, destination_airport, cities, total_people, created_at, updated_at")
      .in("id", collabIds)
      .order("updated_at", { ascending: false });
    collabTrips = data ?? [];
  }

  // Deduplicate
  const seen = new Set<string>();
  const allTrips = [];
  for (const trip of [...(ownedTrips ?? []), ...collabTrips]) {
    if (!seen.has(trip.id)) {
      seen.add(trip.id);
      allTrips.push(trip);
    }
  }

  return NextResponse.json({ trips: allTrips });
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, cities, destination_airport, destination_city, total_people, excluded_dates, flight_categories, flight_time_filters, selected_months, trip_duration, budget_tiers, airbnb_amenities, airbnb_min_bedrooms, airbnb_min_bathrooms, airbnb_min_beds, search_mode } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const tripId = nanoid(10);

    const { data, error } = await supabaseAdmin
      .from("trips")
      .insert({
        id: tripId,
        name,
        owner_id: user.id,
        cities: cities ?? [],
        destination_airport,
        destination_city: destination_city ?? null,
        total_people: total_people ?? 1,
        excluded_dates: excluded_dates ?? [],
        flight_categories: flight_categories ?? null,
        flight_time_filters: flight_time_filters ?? null,
        selected_months: selected_months ?? null,
        trip_duration: trip_duration ?? { nights: 3, departDays: [4, 5] },
        budget_tiers: budget_tiers ?? null,
        airbnb_amenities: airbnb_amenities ?? null,
        airbnb_min_bedrooms: airbnb_min_bedrooms ?? null,
        airbnb_min_bathrooms: airbnb_min_bathrooms ?? null,
        airbnb_min_beds: airbnb_min_beds ?? null,
        search_mode: search_mode ?? "both",
      })
      .select()
      .single();

    if (error) throw error;

    // Also add owner as collaborator with 'owner' role
    await supabaseAdmin
      .from("trip_collaborators")
      .insert({ trip_id: tripId, user_id: user.id, role: "owner" });

    // Auto-trigger initial scrape
    if (process.env.GITHUB_PAT && process.env.GITHUB_REPO) {
      const ref = process.env.SCRAPE_WORKFLOW_REF || "main";
      fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/actions/workflows/scrape.yml/dispatches`, {
        method: "POST",
        headers: {
          Authorization: `token ${process.env.GITHUB_PAT}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref,
          inputs: {
            scrape_type: search_mode === "flights" ? "flights" : search_mode === "stays" ? "airbnb" : "all",
            triggered_by: "trip_creation",
            environment: process.env.ENVIRONMENT || "production",
            trip_id: tripId,
          },
        }),
      }).catch(err => console.error("Failed to trigger initial scrape:", err));
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}
