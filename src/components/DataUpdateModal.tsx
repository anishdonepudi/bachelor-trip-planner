"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DataUpdateModalProps {
  open: boolean;
  onRefresh: () => Promise<void>;
}

export function DataUpdateModal({ open, onRefresh }: DataUpdateModalProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await onRefresh();
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-[var(--surface-1)] border-[var(--border-hover)] text-[var(--text-1)] sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="font-heading text-base">
            {loading ? "Loading..." : "New Data Available"}
          </DialogTitle>
          <DialogDescription className="text-[var(--text-2)] text-sm">
            {loading
              ? "Fetching latest results and computing rank changes..."
              : "Prices have been updated. Refresh to see the latest results."}
          </DialogDescription>
        </DialogHeader>
        <button
          onClick={handleClick}
          disabled={loading}
          className={`w-full mt-1 h-9 rounded-md bg-[var(--blue)] text-white font-medium text-sm transition-all duration-150 ${
            loading ? "opacity-60 cursor-not-allowed" : "hover:brightness-110"
          }`}
        >
          {loading ? "Updating..." : "Refresh Data"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
