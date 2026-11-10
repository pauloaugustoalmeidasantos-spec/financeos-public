"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IncomeSection } from "./IncomeSection";
import { InsuranceSection } from "./InsuranceSection";
import { EmergencyReserveCard } from "./EmergencyReserveCard";
import { Shield, Wallet, ShieldCheck, Loader2 } from "lucide-react";

export function ProtecaoClient() {
  const { data, isLoading, refetch } = trpc.protection.getSummary.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  const profile = data?.profile;
  const insurances = data?.insurances ?? [];
  const assets = data?.assets ?? [];
  const emergencyReserve = data?.emergencyReserve;
  const nextPaymentDate = data?.nextPaymentDate ?? null;
  const avgMonthlyIncome = data?.avgMonthlyIncome ?? 0;

  // KPI calculations
  const totalInsurancePremium = insurances.reduce((acc, i) => acc + (i.monthlyPremium || 0), 0);
  const insuranceCount = insurances.length;
  const pct = Math.min(100, Math.round(emergencyReserve?.percentComplete ?? 0));
  const isReserveOk = pct >= 100;

  return (
    <div className="container max-w-5xl mx-auto py-6 md:py-10 space-y-8 px-4 md:px-0">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-500" />
          Proteção Financeira
        </h1>
        <p className="text-foreground-muted mt-1">
          Seu escudo financeiro: renda, seguros e reserva de emergência em um só lugar.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Receita Média Mensal</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(avgMonthlyIncome)}</p>
            <p className="text-[10px] text-foreground-muted">média dos últimos 3 meses em lançamentos</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Seguros Ativos</p>
            <p className="text-xl font-bold text-foreground">{insuranceCount}</p>
            {totalInsurancePremium > 0 && (
              <p className="text-[10px] text-foreground-muted">{formatCurrency(totalInsurancePremium)}/mês</p>
            )}
          </div>
        </div>

        <div className={`rounded-2xl border shadow-sm p-5 flex items-center gap-4 ${isReserveOk ? "bg-emerald-500/10 border-emerald-500/20" : "bg-card border-border"}`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isReserveOk ? "bg-emerald-500/20" : "bg-amber-500/10"}`}>
            <ShieldCheck className={`w-5 h-5 ${isReserveOk ? "text-emerald-500" : "text-amber-500"}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Reserva de Emergência</p>
            <p className={`text-xl font-bold ${isReserveOk ? "text-emerald-500" : "text-foreground"}`}>
              {formatCurrency(emergencyReserve?.amount ?? 0)}
            </p>
            <p className="text-[10px] text-foreground-muted">
              {pct}% de {formatCurrency(emergencyReserve?.goal ?? 0)}
              {emergencyReserve?.linkedAsset && ` · ${emergencyReserve.linkedAsset.name}`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="reserve" className="w-full">
        <TabsList className="bg-card border border-border shadow-sm p-1 rounded-xl grid grid-cols-3 sm:flex w-full sm:w-auto">
          <TabsTrigger value="reserve" className="rounded-lg text-sm flex items-center gap-1.5">
            🚨 Reserva
          </TabsTrigger>
          <TabsTrigger value="income" className="rounded-lg text-sm flex items-center gap-1.5">
            💰 Renda
          </TabsTrigger>
          <TabsTrigger value="insurance" className="rounded-lg text-sm flex items-center gap-1.5">
            🛡️ Seguros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reserve" className="mt-6">
          {emergencyReserve ? (
            <EmergencyReserveCard
              reserve={emergencyReserve}
              essentialExpenses={profile?.essentialExpenses ?? []}
              assets={assets}
              onRefresh={() => refetch()}
            />
          ) : (
            <div className="text-center py-12 text-gray-400">
              Configure sua renda para calcular a reserva ideal.
            </div>
          )}
        </TabsContent>

        <TabsContent value="income" className="mt-6">
          <IncomeSection
            profile={profile}
            nextPaymentDate={nextPaymentDate}
            onRefresh={() => refetch()}
          />
        </TabsContent>

        <TabsContent value="insurance" className="mt-6">
          <InsuranceSection insurances={insurances} onRefresh={() => refetch()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
