import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center min-h-[300px]",
        className
      )}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 mb-4">
        <Icon className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-navy max-w-sm">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mt-2">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6 font-semibold bg-brand text-white hover:bg-brand-light">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
