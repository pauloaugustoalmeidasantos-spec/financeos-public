import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark" | "icon-only";
  size?: number; // Representa o tamanho base do wordmark ou do ícone
  className?: string;
}

export function Logo({ variant = "light", size = 20, className }: LogoProps) {
  // Tamanho proporcional do símbolo (32 quando size = 20)
  const iconSize = size * 1.6;

  const SvgIcon = () => (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <rect width="32" height="32" rx="8" fill="#1B6CF2" />
      <path
        d="M8 22 L14 14 L19 18 L25 10"
        stroke="#00D4AA"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="25" cy="10" r="2.5" fill="#00D4AA" />
    </svg>
  );

  if (variant === "icon-only") {
    return (
      <div className={cn("inline-flex items-center justify-center", className)}>
        <SvgIcon />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <SvgIcon />
      <span
        style={{ fontSize: size }}
        className={cn("font-bold tracking-tight font-sans leading-none text-foreground")}
      >
        Finance<span className="text-primary">OS</span>
      </span>
    </div>
  );
}
