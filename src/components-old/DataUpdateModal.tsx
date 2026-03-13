"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DataUpdateModalProps {
  open: boolean;
  onRefresh: () => void;
}

export function DataUpdateModal({ open, onRefresh }: DataUpdateModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="font-heading">New Data Available</DialogTitle>
          <DialogDescription>
            Flight and Airbnb prices have been updated with the latest data.
            Refresh to see the new results.
          </DialogDescription>
        </DialogHeader>
        <button
          onClick={onRefresh}
          className="w-full mt-2 px-4 py-2.5 rounded-xl bg-[var(--color-indigo)] text-white font-medium hover:bg-[oklch(0.6_0.2_265)] shadow-[var(--glow-indigo)] transition-colors"
        >
          Refresh Data
        </button>
      </DialogContent>
    </Dialog>
  );
}
