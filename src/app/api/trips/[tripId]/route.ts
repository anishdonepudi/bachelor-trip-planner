import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthUser, canEditTrip } from "@/lib/auth-check";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { tripId } = await params;

  try {
    const { data, error } = await supabaseAdmin
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching trip:", error);
    return NextResponse.json({ error: "Failed to fetch trip" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { tripId } = await params;

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await canEditTrip(user.id, tripId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { cities, destination_airport, destination_city, total_people, excluded_dates, flight_categories, flight_time_filters, selected_months, trip_duration, budget_tiers, airbnb_amenities, airbnb_min_bedrooms, airbnb_min_bathrooms, airbnb_min_beds, skip_scrape, search_mode } = body;

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (cities !== undefined) payload.cities = cities;
    if (destination_airport !== undefined) payload.destination_airport = destination_airport;
    if (destination_city !== undefined) payload.destination_city = destination_city;
    if (total_people !== undefined) payload.total_people = total_people;
    if (excluded_dates !== undefined) payload.excluded_dates = excluded_dates;
    if (flight_categories !== undefined) payload.flight_categories = flight_categories;
    if (flight_time_filters !== undefined) payload.flight_time_filters = flight_time_filters;
    if (selected_months !== undefined) payload.selected_months = selected_months;
    if (trip_duration !== undefined) payload.trip_duration = trip_duration;
    if (budget_tiers !== undefined) payload.budget_tiers = budget_tiers;
    if (airbnb_amenities !== undefined) payload.airbnb_amenities = airbnb_amenities;
    if (airbnb_min_bedrooms !== undefined) payload.airbnb_min_bedrooms = airbnb_min_bedrooms;
    if (airbnb_min_bathrooms !== undefined) payload.airbnb_min_bathrooms = airbnb_min_bathrooms;
    if (airbnb_min_beds !== undefined) payload.airbnb_min_beds = airbnb_min_beds;
    if (search_mode !== undefined) payload.search_mode = search_mode;

    const { data, error } = await supabaseAdmin
      .from("trips")
      .update(payload)
      .eq("id", tripId)
      .select()
      .single();

    if (error) throw error;

    // Trigger scrape workflow
    if (!skip_scrape && process.env.GITHUB_PAT && process.env.GITHUB_REPO) {
      const repo = process.env.GITHUB_REPO;
      const ref = process.env.SCRAPE_WORKFLOW_REF || "main";
      const ghHeaders = {
        Authorization: `token ${process.env.GITHUB_PAT}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      };

      try {
        await fetch(
          `https://api.github.com/repos/${repo}/actions/workflows/scrape.yml/dispatches`,
          {
            method: "POST",
            headers: ghHeaders,
            body: JSON.stringify({
              ref,
              inputs: {
                scrape_type: search_mode === "flights" ? "flights" : search_mode === "stays" ? "airbnb" : "all",
                triggered_by: "config_changed",
                environment: process.env.ENVIRONMENT || "production",
                trip_id: tripId,
              },
            }),
          }
        );
      } catch (ghError) {
        console.error("Failed to trigger GitHub Actions:", ghError);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating trip:", error);
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}
