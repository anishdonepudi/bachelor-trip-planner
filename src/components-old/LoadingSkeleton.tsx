"use client";

import { Skeleton } from "@/components/ui/skeleton";

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <Skeleton className="h-full w-full bg-[var(--color-surface-elevated)]" />
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filter bar skeleton — hidden on mobile (uses filter sheet) */}
      <div className="hidden md:block p-4 bg-[var(--color-surface-base)]/80 border border-[var(--border)] rounded-2xl">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="flex-1 space-y-3">
            <ShimmerSkeleton className="h-4 w-20 rounded" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <ShimmerSkeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <ShimmerSkeleton className="h-4 w-24 rounded" />
            {[1, 2, 3].map((i) => (
              <ShimmerSkeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: chip row skeleton */}
      <div className="md:hidden flex gap-2 px-0">
        {[1, 2, 3].map((i) => (
          <ShimmerSkeleton key={i} className="h-7 w-24 rounded-full shrink-0" />
        ))}
      </div>

      {/* Weekend cards skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--border)] bg-[var(--color-surface-deep)]/50 p-4 sm:p-5"
        >
          {/* Mobile card skeleton */}
          <div className="sm:hidden space-y-3">
            <div className="flex items-center gap-3">
              <ShimmerSkeleton className="h-7 w-16 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <ShimmerSkeleton className="h-4 w-36 rounded" />
                <ShimmerSkeleton className="h-3 w-20 rounded" />
              </div>
            </div>
            <ShimmerSkeleton className="h-8 w-28 rounded" />
            <div className="flex gap-2">
              <ShimmerSkeleton className="h-5 w-16 rounded-md" />
              <ShimmerSkeleton className="h-5 w-20 rounded-md" />
            </div>
          </div>

          {/* Desktop card skeleton */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ShimmerSkeleton className="h-8 w-20 rounded-full" />
              <div className="space-y-2">
                <ShimmerSkeleton className="h-5 w-32 rounded" />
                <ShimmerSkeleton className="h-3 w-16 rounded" />
              </div>
            </div>
            <div className="flex gap-3">
              <ShimmerSkeleton className="h-8 w-32 rounded-lg" />
              <ShimmerSkeleton className="h-8 w-20 rounded-lg" />
              <ShimmerSkeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
