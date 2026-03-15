import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUser, canEditTrip } from "@/lib/auth-check";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
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
    const { cities, destination_airport, destination_city, total_people, excluded_dates, flight_categories, flight_time_filters, selected_months, trip_duration, skip_scrape } = body;

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

    const { data, error } = await supabaseAdmin
      .from("trips")
      .update(payload)
      .eq("id", tripId)
      .select()
      .single();

    if (error) throw error;

    // Trigger scrape if needed (same logic as /api/config)
    if (!skip_scrape && process.env.GITHUB_PAT && process.env.GITHUB_REPO) {
      const ghHeaders = {
        Authorization: `token ${process.env.GITHUB_PAT}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      };
      const repo = process.env.GITHUB_REPO;

      try {
        for (const status of ["in_progress", "queued"] as const) {
          const runsRes = await fetch(
            `https://api.github.com/repos/${repo}/actions/workflows/scrape.yml/runs?status=${status}&per_page=10`,
            { headers: ghHeaders }
          );
          if (runsRes.ok) {
            const runsData = await runsRes.json();
            for (const run of runsData.workflow_runs ?? []) {
              await fetch(
                `https://api.github.com/repos/${repo}/actions/runs/${run.id}/cancel`,
                { method: "POST", headers: ghHeaders }
              );
            }
          }
        }
      } catch (cancelError) {
        console.error("Failed to cancel existing workflows:", cancelError);
      }

      try {
        await fetch(
          `https://api.github.com/repos/${repo}/dispatches`,
          {
            method: "POST",
            headers: ghHeaders,
            body: JSON.stringify({ event_type: "config-changed" }),
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
