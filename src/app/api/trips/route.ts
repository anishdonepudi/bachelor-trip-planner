import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getAuthUser } from "@/lib/auth-check";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
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
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, cities, destination_airport, destination_city, total_people, excluded_dates, flight_categories, flight_time_filters, month_range, selected_months, trip_duration } = body;

    if (!name || !destination_airport) {
      return NextResponse.json({ error: "Name and destination airport are required" }, { status: 400 });
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
        month_range: month_range ?? null,
        selected_months: selected_months ?? null,
        trip_duration: trip_duration ?? { nights: 3, departDays: [4, 5] },
      })
      .select()
      .single();

    if (error) throw error;

    // Also add owner as collaborator with 'owner' role
    await supabaseAdmin
      .from("trip_collaborators")
      .insert({ trip_id: tripId, user_id: user.id, role: "owner" });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}
