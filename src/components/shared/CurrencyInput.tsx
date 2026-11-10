"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (val: number) => void;
}

export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    const currentNumeric = parseCurrency(displayValue);
    if (currentNumeric !== value) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const parseCurrency = (str: string) => {
    const raw = str.replace(/\D/g, "");
    return Number(raw) / 100;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = parseCurrency(e.target.value);
    setDisplayValue(formatCurrency(numericValue));
    onChange(numericValue);
  };

  const isLarge = className?.includes("text-3xl") || className?.includes("text-2xl");

  // Extract background/rounded/text-color classes for the wrapper
  const bgClasses = (className || "").split(" ").filter(c => c.startsWith("bg-")).join(" ");
  const roundedClasses = (className || "").split(" ").filter(c => c.startsWith("rounded")).join(" ");
  const textColorClasses = (className || "").split(" ").filter(c => /^text-\w+-700$/.test(c)).join(" ");
  const heightClasses = (className || "").split(" ").filter(c => c.startsWith("h-")).join(" ");
  const widthClasses = (className || "").split(" ").filter(c => c.startsWith("w-")).join(" ");
  // Classes that should remain only on the inner input  
  const innerClasses = (className || "").split(" ").filter(c => 
    !c.startsWith("bg-") && 
    !c.startsWith("rounded") && 
    !c.startsWith("h-") && 
    !c.startsWith("w-") &&
    !c.startsWith("border") &&
    !c.startsWith("outline") &&
    !c.startsWith("focus")
  ).join(" ");

  return (
    <div className={cn(
      "flex items-center gap-1 shrink-0",
      bgClasses || "bg-background",
      roundedClasses || "rounded-md",
      heightClasses || (isLarge ? "h-12" : "h-8"),
      widthClasses || "w-full",
      "px-2",
      !className?.includes("border-none") && "border border-input focus-within:ring-2 focus-within:ring-ring focus-within:border-ring transition-all",
    )}>
      <span className={cn(
        "font-medium select-none tabular-nums shrink-0",
        isLarge ? "text-xl" : "text-xs",
        textColorClasses || "text-gray-400"
      )}>
        R$
      </span>
      <Input
        type="text"
        value={displayValue}
        onChange={handleChange}
        className={cn(
          "w-full bg-transparent border-none p-0 shadow-none focus-visible:ring-0 tabular-nums",
          isLarge ? "h-10" : "h-6",
          innerClasses
        )}
        {...props}
      />
    </div>
  );
}
