import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("previous_weekend_snapshot")
      .select("snapshot, created_at")
      .eq("id", 1)
      .single();

    if (error) {
      // PGRST116 = no rows found — not an error, just no snapshot yet
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
    return NextResponse.json(
      { error: "Failed to fetch previous weekend snapshot" },
      { status: 500 }
    );
  }
}
