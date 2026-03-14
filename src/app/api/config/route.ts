import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("config")
      .select("*")
      .limit(1)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching config:", error);
    return NextResponse.json(
      { error: "Failed to fetch config" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { cities, destination_airport, destination_city, total_people, excluded_dates, flight_categories, skip_scrape } = body;

    const { data: existing } = await supabase
      .from("config")
      .select("id")
      .limit(1)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from("config")
        .update({
          cities,
          destination_airport,
          destination_city: destination_city ?? null,
          total_people,
          excluded_dates: excluded_dates ?? [],
          flight_categories: flight_categories ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("config")
        .insert({ cities, destination_airport, destination_city: destination_city ?? null, total_people, excluded_dates: excluded_dates ?? [], flight_categories: flight_categories ?? null })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    // Cancel any in-progress scrape workflows, then trigger a new one (skip if only weekend exclusions changed)
    if (!skip_scrape && process.env.GITHUB_PAT && process.env.GITHUB_REPO) {
      const ghHeaders = {
        Authorization: `token ${process.env.GITHUB_PAT}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      };
      const repo = process.env.GITHUB_REPO;

      try {
        // Find and cancel all in-progress and queued runs
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
        // Dispatch new workflow with updated config
        await fetch(
          `https://api.github.com/repos/${repo}/dispatches`,
          {
            method: "POST",
            headers: ghHeaders,
            body: JSON.stringify({
              event_type: "config-changed",
            }),
          }
        );
      } catch (ghError) {
        console.error("Failed to trigger GitHub Actions:", ghError);
      }
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error updating config:", error);
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
