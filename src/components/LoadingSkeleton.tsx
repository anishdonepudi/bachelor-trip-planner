"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filter bar skeleton */}
      <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl">
        <div className="flex gap-6">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-20 bg-zinc-800" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 bg-zinc-800 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-24 bg-zinc-800" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 bg-zinc-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Weekend cards skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-20 bg-zinc-800 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32 bg-zinc-800" />
                <Skeleton className="h-3 w-16 bg-zinc-800" />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 bg-zinc-800" />
                <Skeleton className="h-6 w-24 bg-zinc-800" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
