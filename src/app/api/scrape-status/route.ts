import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("scrape_jobs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    // Also get the most recent scraped_at from flights to show data freshness
    const { data: latestFlight } = await supabase
      .from("flights")
      .select("scraped_at")
      .order("scraped_at", { ascending: false })
      .limit(1);

    return NextResponse.json({
      jobs: data ?? [],
      lastFlightUpdate: latestFlight?.[0]?.scraped_at ?? null,
    });
  } catch (error) {
    console.error("Error fetching scrape status:", error);
    return NextResponse.json(
      { error: "Failed to fetch scrape status" },
      { status: 500 }
    );
  }
}
