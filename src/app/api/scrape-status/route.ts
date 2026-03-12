import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface GitHubJob {
  id: number;
  name: string;
  status: string; // "queued" | "in_progress" | "completed"
  conclusion: string | null; // "success" | "failure" | "cancelled" | "skipped" | null
  started_at: string | null;
  completed_at: string | null;
}

interface GitHubRun {
  id: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

function mapStatus(job: GitHubJob): string {
  if (job.status === "queued") return "queued";
  if (job.status === "in_progress") return "running";
  if (job.conclusion === "success") return "completed";
  if (job.conclusion === "skipped") return "skipped";
  return "failed";
}

async function fetchGitHubJobs() {
  const githubPat = process.env.GITHUB_PAT;
  const githubRepo = process.env.GITHUB_REPO;

  if (!githubPat || !githubRepo) return null;

  // Get the 3 most recent workflow runs for scrape.yml
  const runsRes = await fetch(
    `https://api.github.com/repos/${githubRepo}/actions/workflows/scrape.yml/runs?per_page=5`,
    {
      headers: {
        Authorization: `token ${githubPat}`,
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!runsRes.ok) return null;
  const runsData = await runsRes.json();
  const runs: GitHubRun[] = runsData.workflow_runs ?? [];

  if (runs.length === 0) return { runs: [], jobs: [] };

  // Fetch jobs for each run in parallel
  const allJobs: { run: GitHubRun; jobs: GitHubJob[] }[] = await Promise.all(
    runs.map(async (run) => {
      const jobsRes = await fetch(
        `https://api.github.com/repos/${githubRepo}/actions/runs/${run.id}/jobs?per_page=100`,
        {
          headers: {
            Authorization: `token ${githubPat}`,
            Accept: "application/vnd.github.v3+json",
          },
          next: { revalidate: 0 },
        }
      );
      if (!jobsRes.ok) return { run, jobs: [] };
      const jobsData = await jobsRes.json();
      return { run, jobs: jobsData.jobs ?? [] };
    })
  );

  return { runs, allJobs };
}

export async function GET() {
  try {
    // Fetch GitHub Actions data and latest flight timestamp in parallel
    const [githubData, latestFlightResult] = await Promise.all([
      fetchGitHubJobs(),
      supabase
        .from("flights")
        .select("scraped_at")
        .order("scraped_at", { ascending: false })
        .limit(1),
    ]);

    const lastFlightUpdate = latestFlightResult.data?.[0]?.scraped_at ?? null;

    if (!githubData) {
      // Fallback to Supabase scrape_jobs if GitHub not configured
      const { data, error } = await supabase
        .from("scrape_jobs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return NextResponse.json({
        jobs: (data ?? []).map((j: Record<string, unknown>) => ({
          id: j.id,
          name: j.job_type,
          status: j.status,
          started_at: j.started_at,
          completed_at: j.completed_at,
          error_message: j.error_message,
          run_id: j.github_run_id,
        })),
        runs: [],
        lastFlightUpdate,
      });
    }

    // Map GitHub data to a flat list of jobs grouped by run
    const runs = (githubData.allJobs ?? []).map(({ run, jobs }) => ({
      run_id: run.id,
      status: run.status === "completed" ? (run.conclusion ?? "completed") : run.status,
      created_at: run.created_at,
      updated_at: run.updated_at,
      url: run.html_url,
      jobs: jobs.map((j) => ({
        id: j.id,
        name: j.name,
        status: mapStatus(j),
        started_at: j.started_at,
        completed_at: j.completed_at,
      })),
    }));

    return NextResponse.json({ runs, lastFlightUpdate });
  } catch (error) {
    console.error("Error fetching scrape status:", error);
    return NextResponse.json(
      { error: "Failed to fetch scrape status" },
      { status: 500 }
    );
  }
}
