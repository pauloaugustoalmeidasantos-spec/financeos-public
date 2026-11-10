import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-gray-200 rounded-md", className)} />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white border border-default shadow-card rounded-xl p-5 flex flex-col gap-4", className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-20 w-full mt-2" />
    </div>
  );
}

export function SkeletonChart({ className, height = "h-[300px]" }: { className?: string; height?: string }) {
  return (
    <div className={cn("bg-white border border-default shadow-card rounded-xl p-5 flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-3 w-1/6" />
      </div>
      <Skeleton className={cn("w-full rounded-lg", height)} />
    </div>
  );
}

export function SkeletonList({ className, count = 5 }: { className?: string; count?: number }) {
  return (
    <div className={cn("bg-white border border-default shadow-card rounded-xl overflow-hidden", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "p-4 flex items-center justify-between gap-4",
            i !== count - 1 && "border-b border-default"
          )}
        >
          <div className="flex items-center gap-3 w-2/3">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}
