import React from "react";
import { cn } from "@/lib/utils";

interface FinancialValueProps {
  value: number;
  type?: "positive" | "negative" | "neutral" | "auto";
  size?: "sm" | "md" | "lg" | "display";
  showSign?: boolean;
  className?: string;
}

export function FinancialValue({
  value,
  type = "auto",
  size = "md",
  showSign = false,
  className,
}: FinancialValueProps) {
  // Determine display type based on value if "auto"
  const determinedType =
    type === "auto"
      ? value > 0
        ? "positive"
        : value < 0
        ? "negative"
        : "neutral"
      : type;

  // Format currency
  const formattedValue = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Math.abs(value)); // Abs because sign is added conditionally

  const prefix = showSign ? (value > 0 ? "+" : value < 0 ? "-" : "") : "";

  // Size mapping
  const sizeClasses = {
    sm: "text-sm font-medium",
    md: "text-base font-semibold",
    lg: "text-2xl font-bold",
    display: "text-4xl font-bold tracking-tight",
  };

  // Color mapping
  const colorClasses = {
    positive: "text-teal",
    negative: "text-coral",
    neutral: "text-gray-500",
  };

  return (
    <span
      className={cn(
        "tabular-nums whitespace-nowrap",
        sizeClasses[size],
        colorClasses[determinedType],
        className
      )}
    >
      {prefix}
      {formattedValue}
    </span>
  );
}
