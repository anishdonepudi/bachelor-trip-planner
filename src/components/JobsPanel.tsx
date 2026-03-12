"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

interface Job {
  id: number;
  name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}

interface Run {
  run_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  url: string;
  jobs: Job[];
}

interface JobsPanelProps {
  runs: Run[];
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function duration(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function StatusIcon({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-5 h-5" : "w-4 h-4";
  if (status === "running" || status === "queued" || status === "in_progress") {
    return (
      <svg className={`${cls} text-sky-400 animate-spin shrink-0`} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    );
  }
  if (status === "completed" || status === "success") {
    return (
      <svg className={`${cls} text-emerald-400 shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (status === "skipped") {
    return (
      <svg className={`${cls} text-zinc-500 shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
      </svg>
    );
  }
  if (status === "cancelled") {
    return (
      <svg className={`${cls} text-zinc-500 shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    );
  }
  return (
    <svg className={`${cls} text-red-400 shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function RunStatusLabel({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    success: { label: "Success", color: "text-emerald-400" },
    completed: { label: "Success", color: "text-emerald-400" },
    failure: { label: "Failed", color: "text-red-400" },
    failed: { label: "Failed", color: "text-red-400" },
    cancelled: { label: "Cancelled", color: "text-zinc-500" },
    in_progress: { label: "In Progress", color: "text-sky-400" },
    running: { label: "In Progress", color: "text-sky-400" },
    queued: { label: "Queued", color: "text-sky-400" },
  };
  const s = map[status] ?? { label: status, color: "text-zinc-400" };
  return <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>;
}

function RunCard({ run, defaultExpanded }: { run: Run; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const isActive = run.status === "in_progress" || run.status === "running" || run.status === "queued";
  const visibleJobs = run.jobs.filter((j) => j.status !== "skipped");
  const completed = visibleJobs.filter((j) => j.status === "completed").length;
  const failed = visibleJobs.filter((j) => j.status === "failed").length;

  return (
    <div className={`rounded-lg border ${isActive ? "border-sky-500/30 bg-sky-500/5" : "border-zinc-800 bg-zinc-900/30"}`}>
      {/* Run header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800/30 transition-colors rounded-lg"
      >
        <StatusIcon status={run.status} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <RunStatusLabel status={run.status} />
            <span className="text-[10px] text-zinc-600 font-mono">#{run.run_id}</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {formatDateTime(run.created_at)}
            {!isActive && run.updated_at && (
              <span> — {duration(run.created_at, run.updated_at)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {visibleJobs.length > 0 && (
            <span className="text-[11px] text-zinc-500">
              {completed}/{visibleJobs.length} jobs
              {failed > 0 && <span className="text-red-400 ml-1">({failed} failed)</span>}
            </span>
          )}
          <a
            href={run.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
            title="View on GitHub"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          <svg
            className={`w-4 h-4 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Jobs list */}
      {expanded && visibleJobs.length > 0 && (
        <div className="border-t border-zinc-800/50 px-3 py-2 space-y-0.5">
          {visibleJobs.map((job) => (
            <div
              key={job.id}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs ${
                job.status === "failed" ? "bg-red-500/5" : ""
              }`}
            >
              <StatusIcon status={job.status} />
              <span className="flex-1 min-w-0 text-zinc-300 truncate">
                {job.name}
              </span>
              <span className="text-zinc-500 shrink-0 text-[11px]">
                {(job.status === "running" || job.status === "queued") && job.started_at && timeAgo(job.started_at)}
                {job.status !== "running" && job.status !== "queued" && job.started_at && job.completed_at && duration(job.started_at, job.completed_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function JobsPanel({ runs }: JobsPanelProps) {
  const [open, setOpen] = useState(false);

  if (runs.length === 0) return null;

  const allJobs = runs.flatMap((r) => r.jobs);
  const hasRunning = allJobs.some((j) => j.status === "running" || j.status === "queued");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
          hasRunning
            ? "opacity-0 hover:opacity-100 bg-sky-500/10 border-sky-500/30 text-sky-400"
            : "opacity-0 hover:opacity-100 bg-zinc-800/60 border-transparent hover:border-zinc-700/40 text-zinc-400 hover:text-zinc-200"
        }`}
        title="Data Refresh Job Run History"
      >
        {hasRunning ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        )}
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-200">Data Refresh Runs</h3>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Runs list */}
            <div className="overflow-y-auto max-h-[65vh] p-4 space-y-2">
              {runs.map((run, i) => (
                <RunCard key={run.run_id} run={run} defaultExpanded={i === 0} />
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
