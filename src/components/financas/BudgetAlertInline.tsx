"use client";

import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface BudgetAlertInlineProps {
  month: Date;
}

/**
 * BudgetAlertInline — exibido na página de Lançamentos como alerta discreto
 * quando alguma categoria de despesa ultrapassou o limite do orçamento.
 */
export function BudgetAlertInline({ month }: BudgetAlertInlineProps) {
  const { data: budgets } = trpc.budget.list.useQuery({
    month: month.getMonth() + 1,
    year: month.getFullYear(),
  });

  if (!budgets || budgets.length === 0) return null;

  const nearLimit = (budgets as any[]).filter((b) => b.percentage >= 80 && b.percentage < 100);
  const atLimit = (budgets as any[]).filter((b) => b.percentage >= 100);

  // Show: at limit (100%) first, then near limit (80-99%). Never show "above" — just "at limit".
  const hasAlert = atLimit.length > 0 || nearLimit.length > 0;
  if (!hasAlert) return null;

  const isAtLimit = atLimit.length > 0;
  const items = isAtLimit ? atLimit : nearLimit;

  return (
    <div
      className={`rounded-xl border p-3 flex items-start gap-3 text-sm ${
        isAtLimit
          ? "bg-red-50 border-red-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      <AlertTriangle
        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isAtLimit ? "text-red-500" : "text-amber-500"}`}
      />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-xs ${isAtLimit ? "text-red-700" : "text-amber-700"}`}>
          {isAtLimit
            ? `${atLimit.length} categoria${atLimit.length > 1 ? "s" : ""} no limite do orçamento:`
            : `${nearLimit.length} categoria${nearLimit.length > 1 ? "s" : ""} próximas ao limite:`}
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          {items.slice(0, 4).map((b: any) => (
            <span
              key={b.id}
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                isAtLimit
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {b.category.name}
              {" · "}
              {Math.round(b.percentage)}% ({formatCurrency(b.spent)} / {formatCurrency(b.amount)})
            </span>
          ))}
          {items.length > 4 && (
            <span className={`text-[11px] font-medium ${isAtLimit ? "text-red-600" : "text-amber-600"}`}>
              +{items.length - 4} mais
            </span>
          )}
        </div>
      </div>
      <Link
        href="/orcamentos"
        className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${
          isAtLimit ? "text-red-700 hover:text-red-900" : "text-amber-700 hover:text-amber-900"
        }`}
      >
        Ver orçamentos
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
