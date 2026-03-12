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
    const { cities, destination_airport, total_people } = body;

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
          total_people,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("config")
        .insert({ cities, destination_airport, total_people })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    // Trigger GitHub Actions scrape
    if (process.env.GITHUB_PAT && process.env.GITHUB_REPO) {
      try {
        await fetch(
          `https://api.github.com/repos/${process.env.GITHUB_REPO}/dispatches`,
          {
            method: "POST",
            headers: {
              Authorization: `token ${process.env.GITHUB_PAT}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
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
