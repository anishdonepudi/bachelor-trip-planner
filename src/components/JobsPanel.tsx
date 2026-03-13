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
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function duration(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function StatusDot({ status }: { status: string }) {
  if (status === "running" || status === "queued" || status === "in_progress") {
    return <span className="w-2 h-2 rounded-full bg-[var(--blue)] animate-pulse-soft shrink-0" />;
  }
  if (status === "completed" || status === "success") {
    return <span className="w-2 h-2 rounded-full bg-[var(--teal)] shrink-0" />;
  }
  if (status === "skipped" || status === "cancelled") {
    return <span className="w-2 h-2 rounded-full bg-[var(--text-3)] shrink-0" />;
  }
  return <span className="w-2 h-2 rounded-full bg-[var(--red)] shrink-0" />;
}

function RunStatusLabel({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    success: { label: "Done", cls: "text-[var(--teal)]" },
    completed: { label: "Done", cls: "text-[var(--teal)]" },
    failure: { label: "Failed", cls: "text-[var(--red)]" },
    failed: { label: "Failed", cls: "text-[var(--red)]" },
    cancelled: { label: "Cancelled", cls: "text-[var(--text-3)]" },
    in_progress: { label: "Running", cls: "text-[var(--blue)]" },
    running: { label: "Running", cls: "text-[var(--blue)]" },
    queued: { label: "Queued", cls: "text-[var(--blue)]" },
  };
  const s = map[status] ?? { label: status, cls: "text-[var(--text-3)]" };
  return <span className={`text-[11px] font-medium ${s.cls}`}>{s.label}</span>;
}

function RunCard({ run, defaultExpanded }: { run: Run; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isActive = run.status === "in_progress" || run.status === "running" || run.status === "queued";
  const visibleJobs = run.jobs.filter((j) => j.status !== "skipped");
  const completed = visibleJobs.filter((j) => j.status === "completed").length;
  const failed = visibleJobs.filter((j) => j.status === "failed").length;

  return (
    <div className={`rounded-md border ${isActive ? "border-[var(--blue-border)] bg-[var(--blue-soft)]" : "border-[var(--border-default)] bg-[var(--surface-1)]"}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--surface-2)] transition-colors duration-100 rounded-md"
      >
        <StatusDot status={run.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <RunStatusLabel status={run.status} />
            <span className="text-[10px] text-[var(--text-3)] font-mono">#{run.run_id}</span>
          </div>
          <div className="text-[10px] text-[var(--text-3)] mt-0.5">
            {formatDateTime(run.created_at)}
            {!isActive && run.updated_at && <span> &middot; {duration(run.created_at, run.updated_at)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {visibleJobs.length > 0 && (
            <span className="text-[10px] text-[var(--text-3)] font-mono tabular-nums">
              {completed}/{visibleJobs.length}
              {failed > 0 && <span className="text-[var(--red)] ml-0.5">({failed}!)</span>}
            </span>
          )}
          <a
            href={run.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors duration-150"
            title="View on GitHub"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          <svg className={`w-3.5 h-3.5 text-[var(--text-3)] transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && visibleJobs.length > 0 && (
        <div className="border-t border-[var(--border-default)] px-3 py-1.5 space-y-0.5">
          {visibleJobs.map((job) => (
            <div key={job.id}
              className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] ${job.status === "failed" ? "bg-[var(--red-soft)]" : ""}`}>
              <StatusDot status={job.status} />
              <span className="flex-1 min-w-0 text-[var(--text-1)] truncate">{job.name}</span>
              <span className="text-[var(--text-3)] shrink-0 font-mono tabular-nums text-[10px]">
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
        className={`inline-flex items-center justify-center w-7 h-7 rounded-md border transition-all duration-150 ${
          hasRunning
            ? "bg-transparent border-transparent text-transparent hover:bg-[var(--blue-soft)] hover:border-[var(--blue-border)] hover:text-[var(--blue)]"
            : "bg-transparent border-transparent text-transparent hover:bg-[var(--surface-1)] hover:border-[var(--border-default)] hover:text-[var(--text-2)]"
        }`}
        title="Job History"
      >
        {hasRunning ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        )}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}>
          <div className="bg-[var(--surface-0)] border border-[var(--border-hover)] shadow-2xl w-full h-full sm:max-w-xl sm:max-h-[75vh] sm:h-auto rounded-none sm:rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
              <h3 className="text-sm font-heading font-semibold text-[var(--text-1)]">Job History</h3>
              <button onClick={() => setOpen(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-3 space-y-2 scrollbar-thin">
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
