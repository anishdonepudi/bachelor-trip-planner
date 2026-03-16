import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const githubPat = process.env.GITHUB_PAT;
    const githubRepo = process.env.GITHUB_REPO;

    if (!githubPat || !githubRepo) {
      return NextResponse.json({ error: "GitHub integration not configured" }, { status: 500 });
    }

    // Per-trip duplicate check — look for running jobs with this trip_id
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: runningJobs } = await supabase
        .from("scrape_jobs")
        .select("id, status, started_at")
        .eq("trip_id", tripId)
        .in("status", ["pending", "running"])
        .order("started_at", { ascending: false })
        .limit(1);

      if (runningJobs && runningJobs.length > 0) {
        return NextResponse.json({
          success: true,
          message: "Scrape already in progress for this trip",
          already_running: true,
        });
      }
    }

    const ref = process.env.SCRAPE_WORKFLOW_REF || "main";

    const response = await fetch(
      `https://api.github.com/repos/${githubRepo}/actions/workflows/scrape.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${githubPat}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref,
          inputs: {
            scrape_type: "all",
            triggered_by: "web_app",
            environment: process.env.ENVIRONMENT || "production",
            trip_id: tripId,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${errorText}`);
    }

    return NextResponse.json({ success: true, message: "Scrape triggered", ref });
  } catch (error) {
    console.error("Error triggering scrape:", error);
    return NextResponse.json({ error: "Failed to trigger scrape" }, { status: 500 });
  }
}
