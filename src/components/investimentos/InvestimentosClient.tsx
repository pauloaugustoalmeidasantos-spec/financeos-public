"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, RefreshCw, TrendingUp, TrendingDown, BarChart2, Wallet, ArrowUpDown } from "lucide-react";
import { InvestimentoForm } from "./InvestimentoForm";
import { PortfolioDistributionChart } from "./PortfolioDistributionChart";
import { TopPerformersList } from "./TopPerformersList";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/shared/ChartSkeleton";

const RentabilidadeChart = dynamic(
  () => import("./RentabilidadeChart").then((m) => m.RentabilidadeChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

function KPICard({ title, value, subtitle, icon: Icon, color }: { title: string; value: string; subtitle?: string; icon: any; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && <p className="text-xs text-foreground-muted mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export function InvestimentosClient() {
  const { data: assets, refetch } = trpc.asset.list.useQuery();
  const refreshQuotes = trpc.asset.refreshQuotes.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success(`${data.updated} cotações atualizadas!`);
    },
    onError: () => toast.error("Erro ao atualizar cotações"),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<any>(null);

  const investments = assets?.financial?.filter(a => a.source === "BRAPI" || a.autoUpdate || a.ticker) ?? [];
  const manualInvestments = assets?.financial?.filter(a => !a.autoUpdate && !a.ticker) ?? [];
  const allInvestments = [...investments, ...manualInvestments];

  // Totals
  const totalInvested = allInvestments.reduce((acc, a) => {
    const purchase = a.averagePrice ? a.averagePrice * (a.quantity ?? 1) : (a.purchaseValue ?? 0);
    return acc + purchase;
  }, 0);
  const totalCurrent = allInvestments.reduce((acc, a) => acc + a.currentValue, 0);
  const totalGain = totalCurrent - totalInvested;
  const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  return (
    <div className="container max-w-6xl mx-auto py-6 md:py-10 space-y-8 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Investimentos</h1>
          <p className="text-foreground-muted mt-1">Acompanhe seus ativos e rentabilidade em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => refreshQuotes.mutate()}
            disabled={refreshQuotes.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshQuotes.isPending ? "animate-spin" : ""}`} />
            Atualizar Cotações
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-full" onClick={() => { setEditingAsset(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Investimento
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Investido" value={formatCurrency(totalInvested)} icon={Wallet} color="bg-indigo-500" />
        <KPICard title="Valor Atual" value={formatCurrency(totalCurrent)} icon={BarChart2} color="bg-violet-600" />
        <KPICard
          title="Rentabilidade"
          value={`${totalGainPercent >= 0 ? "+" : ""}${totalGainPercent.toFixed(1)}%`}
          subtitle={formatCurrency(totalGain)}
          icon={totalGain >= 0 ? TrendingUp : TrendingDown}
          color={totalGain >= 0 ? "bg-emerald-500" : "bg-red-500"}
        />
        <KPICard title="Nº de Ativos" value={String(allInvestments.length)} icon={ArrowUpDown} color="bg-amber-500" />
      </div>

      {/* Dashboard Charts */}
      {allInvestments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <PortfolioDistributionChart assets={allInvestments} />
          </div>
          <div className="lg:col-span-1">
            <TopPerformersList assets={allInvestments} />
          </div>
        </div>
      )}

      {/* Asset List */}
      {allInvestments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface-elevated/30 rounded-3xl border border-dashed border-border">
          <BarChart2 className="w-12 h-12 text-foreground-muted mb-4" />
          <p className="text-foreground-muted font-medium">Nenhum investimento cadastrado.</p>
          <Button variant="link" onClick={() => setFormOpen(true)} className="text-indigo-600 mt-2">
            Adicionar primeiro investimento
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-bold text-foreground text-lg">Carteira</h2>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border">
            {allInvestments.map((asset) => {
              const purchaseCost = asset.averagePrice ? asset.averagePrice * (asset.quantity ?? 1) : (asset.purchaseValue ?? 0);
              const gain = asset.currentValue - purchaseCost;
              const gainPercent = purchaseCost > 0 ? (gain / purchaseCost) * 100 : 0;
              const isPositive = gain >= 0;

              return (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedAssetId(selectedAssetId === asset.id ? null : asset.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPositive ? "bg-emerald-50" : "bg-red-50"}`}>
                      {isPositive ? (
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{asset.name}</span>
                        {asset.ticker && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">{asset.ticker}</Badge>
                        )}
                        {asset.autoUpdate && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-indigo-50 text-indigo-600 border-indigo-100">AUTO</Badge>
                        )}
                      </div>
                      <span className="text-xs text-foreground-muted">
                        {asset.quantity ?? 1} {asset.category === 'Ações' ? (asset.quantity === 1 ? 'ação' : 'ações') : (asset.quantity === 1 ? 'cota' : 'cotas')} · {asset.broker || "Sem corretora"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-bold text-foreground text-sm">{formatCurrency(asset.currentValue)}</p>
                      <p className={`text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                        {isPositive ? "+" : ""}{gainPercent.toFixed(1)}% ({isPositive ? "+" : ""}{formatCurrency(gain)})
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      onClick={(e) => { e.stopPropagation(); setEditingAsset(asset); setFormOpen(true); }}
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rentabilidade Chart */}
      {selectedAssetId && (
        <div className="bg-card border rounded-2xl p-6 shadow-sm animate-in fade-in duration-300">
          <RentabilidadeChart assetId={selectedAssetId} />
        </div>
      )}

      {/* Form */}
      <InvestimentoForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => refetch()}
        asset={editingAsset}
      />
    </div>
  );
}
