import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fetchAll(table: string) {
  const rows: Record<string, unknown>[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

export async function GET() {
  try {
    const [flights, flightOptions, airbnbListings] = await Promise.all([
      fetchAll("flights"),
      fetchAll("flight_options"),
      fetchAll("airbnb_listings"),
    ]);

    return NextResponse.json({ flights, flightOptions, airbnbListings });
  } catch (error) {
    console.error("Error fetching weekends:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekend data" },
      { status: 500 }
    );
  }
}
