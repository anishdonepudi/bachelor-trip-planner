"use client";

import { useState } from "react";

interface DataUpdateModalProps {
  open: boolean;
  onRefresh: () => Promise<void>;
  onDismissed?: () => void;
}

export function DataUpdateModal({ open, onRefresh, onDismissed }: DataUpdateModalProps) {
  const [loading, setLoading] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await onRefresh();
    // Data is now rendered underneath — fade out the modal to reveal it
    setFadingOut(true);
  };

  if (!open && !fadingOut) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      onTransitionEnd={() => {
        if (fadingOut) {
          setFadingOut(false);
          setLoading(false);
          onDismissed?.();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-xs" />

      {/* Modal */}
      <div className="relative w-full max-w-[calc(100%-2rem)] sm:max-w-sm rounded-xl bg-[var(--surface-1)] border border-[var(--border-hover)] text-[var(--text-1)] p-4 shadow-lg">
        <div className="flex flex-col gap-2 mb-4">
          <h2 className="text-base leading-none font-heading font-medium">
            {loading ? "Loading..." : "New Data Available"}
          </h2>
          <p className="text-sm text-[var(--text-2)]">
            {loading
              ? "Fetching latest results and computing rank changes..."
              : "Prices have been updated. Refresh to see the latest results."}
          </p>
        </div>
        <button
          onClick={handleClick}
          disabled={loading}
          className={`w-full h-9 rounded-md bg-[var(--blue)] text-white font-medium text-sm transition-all duration-150 ${
            loading ? "opacity-60 cursor-not-allowed" : "hover:brightness-110"
          }`}
        >
          {loading ? "Updating..." : "Refresh Data"}
        </button>
      </div>
    </div>
  );
}
