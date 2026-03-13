"use client";

import { useState, useCallback, useEffect } from "react";

interface ScrapeStatusProps {
  lastUpdated: string | null;
  isRunning?: boolean;
  onTriggered?: () => void;
}

export function ScrapeStatus({ lastUpdated, isRunning, onTriggered }: ScrapeStatusProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Clear message when data updates (scrape completed and new data loaded)
  useEffect(() => {
    if (lastUpdated) setMessage(null);
  }, [lastUpdated]);

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const triggerRefresh = useCallback(async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/trigger-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scrape_type: "all" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.already_running) {
          setMessage("Already running");
        } else {
          setMessage("Triggered");
        }
        onTriggered?.();
      } else {
        setMessage("Failed");
      }
    } catch {
      setMessage("Error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="hidden sm:inline text-[11px] text-[var(--text-3)] font-mono tabular-nums">
        {getTimeAgo(lastUpdated)}
      </span>
      <button
        onClick={triggerRefresh}
        disabled={refreshing || isRunning}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-[var(--surface-2)] border border-[var(--border-default)] text-[var(--text-1)] hover:bg-[var(--surface-3)] hover:border-[var(--border-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 text-xs font-medium"
        title={`Last updated: ${getTimeAgo(lastUpdated)}`}
      >
        <svg
          className={`w-3.5 h-3.5 ${refreshing || isRunning ? "animate-spin" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="hidden sm:inline">
          {isRunning ? "Running..." : refreshing ? "Starting..." : "Refresh"}
        </span>
      </button>
      {message && (
        <span className="hidden sm:inline text-[11px] text-[var(--gold)]">{message}</span>
      )}
    </div>
  );
}
