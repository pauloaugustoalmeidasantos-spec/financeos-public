"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/formatters";

interface Props {
  current: number;
  target: number;
  percentComplete: number;
  height?: string;
}

export function GoalProgress({ current, target, percentComplete, height = "h-3" }: Props) {
  const [width, setWidth] = useState(0);

  // Trigger animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentComplete), 50);
    return () => clearTimeout(timer);
  }, [percentComplete]);

  const isCompleted = percentComplete >= 100;

  return (
    <div className="w-full space-y-2">
      <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${height}`}>
        <div 
          className={`h-full transition-all duration-700 ease-out ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
        <span>{formatCurrency(current)}</span>
        <span>de {formatCurrency(target)} ({Math.round(percentComplete)}%)</span>
      </div>
    </div>
  );
}
