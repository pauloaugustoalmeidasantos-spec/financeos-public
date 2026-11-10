"use client";

import { trpc } from "@/lib/trpc-client";
import { Sparkles, ArrowRight, X } from "lucide-react";
import Link from "next/link";

export function AlertasIAWidget() {
  const { data: insights, isLoading } = trpc.ai.getInsights.useQuery({
    unreadOnly: true,
  });

  const utils = trpc.useUtils();

  const dismiss = trpc.ai.dismiss.useMutation({
    onSuccess: () => {
      utils.ai.getInsights.invalidate();
      utils.ai.getUnreadCount.invalidate();
    },
  });

  // Don't render if loading or no unread insights
  if (isLoading || !insights || insights.length === 0) {
    return null;
  }

  const first = insights[0];
  const remaining = insights.length - 1;

  const TYPE_BADGE: Record<string, { label: string; className: string }> = {
    ALERT: { label: "Alerta", className: "bg-danger/10 text-danger" },
    WARNING: { label: "Atenção", className: "bg-warning/10 text-warning" },
    INFO: { label: "Info", className: "bg-info/10 text-info" },
    RECOMMENDATION: {
      label: "Dica",
      className: "bg-success/10 text-success",
    },
  };

  const badge = TYPE_BADGE[first.type] ?? TYPE_BADGE.INFO;

  return (
    <div className="relative bg-gradient-to-r from-primary/10 via-chart-4/10 to-primary/5 border border-primary/20 rounded-xl p-4 md:p-5 animate-in fade-in slide-in-from-top-2 duration-500">
      {/* Dismiss entire widget */}
      <button
        onClick={() => dismiss.mutate({ id: first.id })}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface/80 transition-colors"
        aria-label="Dispensar"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4 pr-8">
        {/* Icon */}
        <div className="shrink-0 p-2.5 bg-primary/15 rounded-xl">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Insights da IA
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>

          <h4 className="font-semibold text-sm text-foreground">{first.title}</h4>
          <p className="text-sm text-foreground-muted mt-0.5 line-clamp-2">
            {first.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-3">
            <Link
              href="/dash-ia"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
            >
              Ver todos{remaining > 0 && ` (${remaining}+ não lidos)`}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
