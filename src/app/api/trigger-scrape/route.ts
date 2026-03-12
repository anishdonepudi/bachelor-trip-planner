import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const scrapeType = body.scrape_type || "all";

    const githubPat = process.env.GITHUB_PAT;
    const githubRepo = process.env.GITHUB_REPO;

    if (!githubPat || !githubRepo) {
      return NextResponse.json(
        { error: "GitHub integration not configured" },
        { status: 500 }
      );
    }

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
          ref: "main",
          inputs: {
            scrape_type: scrapeType,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${errorText}`);
    }

    return NextResponse.json({ success: true, message: "Scrape triggered" });
  } catch (error) {
    console.error("Error triggering scrape:", error);
    return NextResponse.json(
      { error: "Failed to trigger scrape" },
      { status: 500 }
    );
  }
}
