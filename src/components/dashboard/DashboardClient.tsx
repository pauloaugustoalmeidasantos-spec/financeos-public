"use client";

import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc-client";
import { PatrimonioWidget } from "@/components/dashboard/PatrimonioWidget";
import { LiberdadeFinanceiraWidget } from "@/components/dashboard/LiberdadeFinanceiraWidget";
import { ResumoMensalWidget } from "@/components/dashboard/ResumoMensalWidget";
import { MetasTopWidget } from "@/components/dashboard/MetasTopWidget";
import { AlertasIAWidget } from "@/components/dashboard/AlertasIAWidget";
import { BudgetAlertBanner } from "@/components/dashboard/BudgetAlertBanner";

export function DashboardClient() {
  const { data, isLoading } = trpc.user.getDashboardData.useQuery();
  const hasTriedGenerate = useRef(false);

  // Auto-generate insights on first visit of the day (fire-and-forget)
  const generate = trpc.ai.generateInsights.useMutation();

  useEffect(() => {
    if (!hasTriedGenerate.current && data) {
      hasTriedGenerate.current = true;
      // Fire and forget — silently generate if not already cached today
      generate.mutate(undefined, {
        onError: () => {
          // Silently ignore — user may have hit rate limit or no API key
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="w-full mx-auto py-10 space-y-6 px-4 md:px-0">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-surface-elevated rounded-lg w-52" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 h-44 bg-surface-elevated rounded-xl" />
            <div className="lg:col-span-2 h-44 bg-surface-elevated rounded-xl" />
          </div>
          <div className="h-32 bg-surface-elevated rounded-xl" />
          <div className="h-40 bg-surface-elevated rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto py-6 md:py-10 space-y-6 px-4 md:px-0">
      {/* AI Alerts Banner */}
      <AlertasIAWidget />

      {/* Budget Overrun Alert */}
      <BudgetAlertBanner />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-foreground-muted mt-1">Visão consolidada das suas finanças pessoais.</p>
      </div>

      {/* Row 1: Patrimônio (60%) + Liberdade Financeira (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 stagger-children">
        <div className="lg:col-span-3">
          <PatrimonioWidget
            total={data.patrimonioTotal}
            change={data.balanceChange}
          />
        </div>
        <div className="lg:col-span-2">
          <LiberdadeFinanceiraWidget
            percent={data.freedomProgress.percent}
            have={data.freedomProgress.have}
            need={data.freedomProgress.need}
            missing={data.freedomProgress.missing}
            retirementNeeded={data.retirementNeeded}
          />
        </div>
      </div>

      {/* Row 2: Resumo Mensal */}
      <ResumoMensalWidget
        income={data.monthlySummary.income}
        expenses={data.monthlySummary.expenses}
        balance={data.monthlySummary.balance}
        prevBalance={data.previousMonth.balance}
      />

      {/* Row 3: Top Metas */}
      <MetasTopWidget goals={data.topGoals} />
    </div>
  );
}
