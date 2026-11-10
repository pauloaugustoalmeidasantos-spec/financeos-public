"use client";

import { trpc } from "@/lib/trpc-client";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InsightCardProps {
  id: string;
  module: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: Date | string;
  onUpdate?: () => void;
}

const TYPE_CONFIG = {
  ALERT: {
    icon: AlertCircle,
    color: "text-red-500",
    border: "border-l-red-500",
    bg: "bg-red-50",
    badge: "bg-red-100 text-red-700",
  },
  WARNING: {
    icon: AlertTriangle,
    color: "text-amber-500",
    border: "border-l-amber-500",
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
  },
  INFO: {
    icon: Info,
    color: "text-blue-500",
    border: "border-l-blue-500",
    bg: "bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
  },
  RECOMMENDATION: {
    icon: Lightbulb,
    color: "text-emerald-500",
    border: "border-l-emerald-500",
    bg: "bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
  },
} as const;

const MODULE_LABELS: Record<string, string> = {
  DASHBOARD: "Dashboard",
  FINANCES: "Finanças",
  GOALS: "Metas",
  FUTURE: "Futuro",
  PATRIMONY: "Patrimônio",
};

export function InsightCard({
  id,
  module,
  type,
  title,
  content,
  isRead,
  createdAt,
  onUpdate,
}: InsightCardProps) {
  const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.INFO;
  const Icon = config.icon;

  const utils = trpc.useUtils();

  const markAsRead = trpc.ai.markAsRead.useMutation({
    onSuccess: () => {
      utils.ai.getInsights.invalidate();
      utils.ai.getUnreadCount.invalidate();
      onUpdate?.();
    },
  });

  const dismiss = trpc.ai.dismiss.useMutation({
    onSuccess: () => {
      utils.ai.getInsights.invalidate();
      utils.ai.getUnreadCount.invalidate();
      onUpdate?.();
    },
  });

  const timeAgo = formatDistanceToNow(
    typeof createdAt === "string" ? new Date(createdAt) : createdAt,
    { addSuffix: true, locale: ptBR }
  );

  return (
    <div
      className={cn(
        "relative border-l-4 rounded-xl p-4 transition-all hover:shadow-md",
        config.border,
        isRead
          ? "bg-white border border-gray-200"
          : `${config.bg} border border-gray-100`
      )}
    >
      {/* Module badge */}
      <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
        {MODULE_LABELS[module] || module}
      </span>

      {/* Header */}
      <div className="flex items-start gap-3 pr-20">
        <div className={cn("mt-0.5 shrink-0", config.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 leading-tight">
            {title}
          </h4>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
            {content}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
        <span className="text-[11px] text-gray-400">{timeAgo}</span>

        <div className="flex items-center gap-1.5">
          {!isRead && (
            <button
              onClick={() => markAsRead.mutate({ id })}
              disabled={markAsRead.isPending}
              className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Lido
            </button>
          )}
          <button
            onClick={() => dismiss.mutate({ id })}
            disabled={dismiss.isPending}
            className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 px-2 py-1 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
