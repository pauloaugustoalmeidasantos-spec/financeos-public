"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";
import { AlertTriangle, X, ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * BudgetAlertBanner — exibido na Home (Dashboard) quando alguma categoria
 * ultrapassou o limite do orçamento no mês atual.
 */
export function BudgetAlertBanner() {
  const now = new Date();
  const { data: budgets, isLoading } = trpc.budget.list.useQuery({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const [dismissed, setDismissed] = useState(false);

  if (isLoading || dismissed || !budgets || budgets.length === 0) return null;

  // Filtra categorias que ultrapassaram 100%
  const atLimit = (budgets as any[]).filter((b) => b.percentage >= 100);
  const nearLimit = (budgets as any[]).filter((b) => b.percentage >= 80 && b.percentage < 100);

  if (atLimit.length === 0 && nearLimit.length === 0) return null;

  const isAtLimit = atLimit.length > 0;

  return (
    <div
      className={`relative rounded-2xl border p-4 md:p-5 animate-in fade-in slide-in-from-top-2 duration-500 ${
        isAtLimit
          ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200"
          : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
      }`}
    >
      {/* Dismiss button */}
      <button
        id="budget-alert-dismiss"
        onClick={() => setDismissed(true)}
        className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors ${
          isAtLimit
            ? "text-red-400 hover:text-red-600 hover:bg-red-100"
            : "text-amber-400 hover:text-amber-600 hover:bg-amber-100"
        }`}
        aria-label="Ignorar alerta de orçamento"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4 pr-8">
        {/* Icon */}
        <div
          className={`shrink-0 p-2.5 rounded-xl ${
            isAtLimit ? "bg-red-100" : "bg-amber-100"
          }`}
        >
          <AlertTriangle
            className={`h-5 w-5 ${isAtLimit ? "text-red-600" : "text-amber-600"}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
              isAtLimit ? "text-red-500" : "text-amber-500"
            }`}
          >
            {isAtLimit ? "⚠️ Limite de orçamento atingido" : "⚡ Orçamento quase no limite"}
          </p>

          {/* Over budget list */}
          {atLimit.length > 0 && (
            <div className="mb-2 space-y-1">
              {atLimit.slice(0, 3).map((b: any) => (
                <p key={b.id} className="text-sm text-red-800">
                  <span className="font-bold">{b.category.name}</span>
                  {" — "}gasto <span className="font-bold">{formatCurrency(b.spent)}</span>
                  {" de "}{formatCurrency(b.amount)}
                  {" "}
                  <span className="bg-red-200 text-red-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {Math.round(b.percentage)}% do limite
                  </span>
                </p>
              ))}
              {atLimit.length > 3 && (
                <p className="text-xs text-red-600 font-medium">
                  + {atLimit.length - 3} outras categorias no limite
                </p>
              )}
            </div>
          )}

          {/* Near limit list (only if no over budget, to avoid cluttering) */}
          {atLimit.length === 0 && nearLimit.length > 0 && (
            <div className="mb-2 space-y-1">
              {nearLimit.slice(0, 3).map((b: any) => (
                <p key={b.id} className="text-sm text-amber-800">
                  <span className="font-bold">{b.category.name}</span>
                  {" — "}gasto <span className="font-bold">{formatCurrency(b.spent)}</span>
                  {" de "}{formatCurrency(b.amount)}
                  {" "}
                  <span className="bg-amber-200 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {Math.round(b.percentage)}%
                  </span>
                </p>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mt-3">
            <Link
              id="budget-alert-view"
              href="/orcamentos"
              className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                isAtLimit
                  ? "text-red-700 hover:text-red-800"
                  : "text-amber-700 hover:text-amber-800"
              }`}
            >
              Visualizar orçamentos
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className={`text-xs font-medium transition-colors ${
                isAtLimit ? "text-red-400 hover:text-red-600" : "text-amber-400 hover:text-amber-600"
              }`}
            >
              Ignorar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
