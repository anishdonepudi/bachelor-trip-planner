"use client";

import { Skeleton } from "@/components/ui/skeleton";

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <Skeleton className="h-full w-full bg-[var(--surface-2)]" />
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Toolbar skeleton */}
      <div className="hidden md:flex items-center gap-3">
        <ShimmerBlock className="h-8 w-44 rounded-md" />
        <div className="flex-1" />
        <ShimmerBlock className="h-8 w-28 rounded-md" />
        <ShimmerBlock className="h-8 w-28 rounded-md" />
        <ShimmerBlock className="h-8 w-28 rounded-md" />
      </div>

      {/* Mobile chips */}
      <div className="md:hidden flex gap-2">
        {[1, 2, 3].map((i) => (
          <ShimmerBlock key={i} className="h-7 w-24 rounded-md shrink-0" />
        ))}
      </div>

      {/* Card skeletons */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-0)]"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {/* Mobile — matches compact horizontal card layout */}
          <div className="sm:hidden flex items-center gap-2.5 px-3 py-2.5 min-h-[72px]">
            <ShimmerBlock className="h-8 w-8 rounded-md" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <ShimmerBlock className="h-4 w-36 rounded" />
              <ShimmerBlock className="h-3 w-28 rounded" />
            </div>
            <ShimmerBlock className="h-5 w-14 rounded" />
          </div>

          {/* Desktop */}
          <div className="hidden sm:flex items-center gap-4 p-4">
            <ShimmerBlock className="h-4 w-8 rounded" />
            <ShimmerBlock className="h-3 w-10 rounded" />
            <ShimmerBlock className="h-5 w-36 rounded" />
            <div className="flex-1" />
            <ShimmerBlock className="h-5 w-16 rounded" />
            <ShimmerBlock className="h-5 w-20 rounded" />
            <ShimmerBlock className="h-5 w-16 rounded" />
            <ShimmerBlock className="h-5 w-14 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
