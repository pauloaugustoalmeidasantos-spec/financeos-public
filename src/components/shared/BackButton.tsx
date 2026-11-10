"use client";

import { ArrowLeft } from "lucide-react";

export function BackButton() {
  return (
    <button
      onClick={() => history.back()}
      className="inline-flex items-center gap-2 py-2.5 px-5 bg-surface-elevated hover:bg-surface border border-border text-foreground font-medium rounded-lg transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Voltar
    </button>
  );
}
