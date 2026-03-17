import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { SearchMode } from "@/lib/types";

async function fetchAll(table: string, tripId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const rows: Record<string, unknown>[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .eq("trip_id", tripId)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { tripId } = await params;

  try {
    // Read trip's search_mode
    const { data: trip } = await supabaseAdmin
      .from("trips")
      .select("search_mode")
      .eq("id", tripId)
      .single();

    const searchMode: SearchMode = (trip?.search_mode as SearchMode) ?? "both";

    const [flights, flightOptions, airbnbListings] = await Promise.all([
      searchMode !== "stays" ? fetchAll("flights", tripId) : Promise.resolve([]),
      searchMode !== "stays" ? fetchAll("flight_options", tripId) : Promise.resolve([]),
      searchMode !== "flights" ? fetchAll("airbnb_listings", tripId) : Promise.resolve([]),
    ]);

    return NextResponse.json({ flights, flightOptions, airbnbListings, searchMode });
  } catch (error) {
    console.error("Error fetching weekends:", error);
    return NextResponse.json({ error: "Failed to fetch weekend data" }, { status: 500 });
  }
}
