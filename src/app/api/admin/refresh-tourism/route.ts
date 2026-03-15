import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateTourismData } from "@/lib/gemini";

interface RefreshResult {
  city: string;
  status: "generated" | "skipped" | "failed";
  reason?: string;
}

export async function POST(request: NextRequest) {
  // Protect with service key check
  const authHeader = request.headers.get("authorization");
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const forceRefresh = body.force === true;
  const maxCities = body.limit ?? 50;

  // Get user destination cities from trips
  let userCities: string[] = [];
  try {
    const { data: trips } = await supabaseAdmin
      .from("trips")
      .select("destination_city")
      .not("destination_city", "is", null);

    if (trips) {
      userCities = [...new Set(
        trips
          .map((t) => t.destination_city as string)
          .filter(Boolean)
      )];
    }
  } catch {
    // trips table may not exist yet
  }

  // Filter out cities already in DB (unless force refresh)
  let citiesToProcess = userCities;
  if (!forceRefresh) {
    try {
      const { data: existing } = await supabaseAdmin
        .from("tourism_data")
        .select("city");

      if (existing) {
        const existingSet = new Set(existing.map((r) => r.city));
        citiesToProcess = userCities.filter(
          (c) => !existingSet.has(c.toLowerCase().trim())
        );
      }
    } catch {
      // Table may not exist
    }
  }

  const batch = citiesToProcess.slice(0, maxCities);
  const results: RefreshResult[] = [];

  for (const city of batch) {
    const normalized = city.toLowerCase().trim();

    try {
      const generated = await generateTourismData(city);
      if (!generated) {
        results.push({ city, status: "failed", reason: "Gemini returned no data" });
        continue;
      }

      const { error } = await supabaseAdmin
        .from("tourism_data")
        .upsert({
          city: normalized,
          data: generated.data,
          model_used: generated.model,
          source: "gemini",
          generated_at: new Date().toISOString(),
        });

      if (error) {
        results.push({ city, status: "failed", reason: error.message });
      } else {
        results.push({ city, status: "generated" });
      }
    } catch (err) {
      results.push({
        city,
        status: "failed",
        reason: err instanceof Error ? err.message : "Unknown error",
      });
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  const generated = results.filter((r) => r.status === "generated").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({
    totalQueued: userCities.length,
    processed: batch.length,
    remaining: citiesToProcess.length - batch.length,
    generated,
    failed,
    results,
  });
}
