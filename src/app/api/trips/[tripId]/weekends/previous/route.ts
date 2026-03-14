import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;

  try {
    const { data, error } = await supabaseAdmin
      .from("previous_weekend_snapshot")
      .select("snapshot, created_at")
      .eq("trip_id", tripId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ snapshot: null, created_at: null });
      }
      throw error;
    }

    return NextResponse.json({
      snapshot: data.snapshot,
      created_at: data.created_at,
    });
  } catch (error) {
    console.error("Error fetching previous weekend snapshot:", error);
    return NextResponse.json({ error: "Failed to fetch previous weekend snapshot" }, { status: 500 });
  }
}
