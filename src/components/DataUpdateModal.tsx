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
          <DialogTitle>New Data Available</DialogTitle>
          <DialogDescription>
            Flight and Airbnb prices have been updated with the latest data.
            Refresh to see the new results.
          </DialogDescription>
        </DialogHeader>
        <button
          onClick={onRefresh}
          className="w-full mt-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors"
        >
          Refresh Data
        </button>
      </DialogContent>
    </Dialog>
  );
}
