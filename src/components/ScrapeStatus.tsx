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

  // Re-render every 30s to keep "time ago" fresh
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

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
          setMessage("Scrape already in progress.");
        } else {
          setMessage("Scrape triggered! Data will update in ~30-45 min.");
        }
        onTriggered?.();
      } else {
        setMessage("Failed to trigger scrape. Check GitHub config.");
      }
    } catch {
      setMessage("Error triggering scrape.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <div className="flex items-center gap-1.5 sm:gap-3 text-sm">
      <span className="hidden sm:inline text-zinc-500">
        Last updated: {getTimeAgo(lastUpdated)}
      </span>
      <button
        onClick={triggerRefresh}
        disabled={refreshing || isRunning}
        className="inline-flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-medium"
        title={`Last updated: ${getTimeAgo(lastUpdated)}`}
      >
        <svg
          className={`w-3.5 h-3.5 ${refreshing || isRunning ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span className="hidden sm:inline">{isRunning ? "Refreshing..." : refreshing ? "Triggering..." : "Refresh Data"}</span>
      </button>
      {message && (
        <span className="hidden sm:inline text-xs text-amber-400">{message}</span>
      )}
    </div>
  );
}
