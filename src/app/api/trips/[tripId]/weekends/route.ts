import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

async function fetchAll(table: string, tripId: string) {
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
  const { tripId } = await params;

  try {
    const [flights, flightOptions, airbnbListings] = await Promise.all([
      fetchAll("flights", tripId),
      fetchAll("flight_options", tripId),
      fetchAll("airbnb_listings", tripId),
    ]);

    return NextResponse.json({ flights, flightOptions, airbnbListings });
  } catch (error) {
    console.error("Error fetching weekends:", error);
    return NextResponse.json({ error: "Failed to fetch weekend data" }, { status: 500 });
  }
}
