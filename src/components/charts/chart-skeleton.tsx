"use client";

import { Skeleton } from "@/components/ui/skeleton";

// ponytail: the one skeleton pattern for every chart.
export function ChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      className="flex h-64 w-full items-end justify-around sm:h-[280px]"
    >
      {[60, 80, 45, 90, 55, 70, 85].map((h, i) => (
        <div key={i} className="w-4" style={{ height: `${h}%` }}>
          <Skeleton className="h-full w-full rounded-sm" />
        </div>
      ))}
    </div>
  );
}
