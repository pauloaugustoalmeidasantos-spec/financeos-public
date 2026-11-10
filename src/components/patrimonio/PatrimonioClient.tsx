"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { PatrimonioChart } from "./PatrimonioChart";
import { PatrimonioGrowthChart } from "./PatrimonioGrowthChart";
import { AssetList } from "./AssetList";
import { AssetForm } from "./AssetForm";
import { FinanciamentoForm } from "./FinanciamentoForm";
import { FinanciamentosList } from "./FinanciamentosList";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, Building2, TrendingUp, Briefcase, Home } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

function KPICard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(value)}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export function PatrimonioClient() {
  const { data: assets, refetch: refetchList, isLoading } = trpc.asset.list.useQuery();
  const { data: summary, refetch: refetchSummary } = trpc.asset.getSummary.useQuery();

  const deleteAsset = trpc.asset.delete.useMutation({
    onSuccess: () => { refetchList(); refetchSummary(); },
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFinanciamentoFormOpen, setIsFinanciamentoFormOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<any | null>(null);
  const [financiamentoToEdit, setFinanciamentoToEdit] = useState<any | null>(null);

  const openNew = () => { setAssetToEdit(null); setIsFormOpen(true); };
  const openEdit = (a: any) => { setAssetToEdit(a); setIsFormOpen(true); };
  const handleDelete = (id: string) => {
    if (confirm("Tem certeza? O ativo será desativado do seu patrimônio.")) {
      deleteAsset.mutate({ id });
    }
  };

  const deleteFinancing = trpc.financing.delete.useMutation({
    onSuccess: () => { refetchList(); refetchSummary(); },
  });

  const openNewFinancing = () => { setFinanciamentoToEdit(null); setIsFinanciamentoFormOpen(true); };
  const openEditFinancing = (f: any) => { setFinanciamentoToEdit(f); setIsFinanciamentoFormOpen(true); };
  const handleDeleteFinancing = (id: string) => {
    if (confirm("Tem certeza? O financiamento será arquivado.")) {
      deleteFinancing.mutate({ id });
    }
  };

  const refetchAll = () => { refetchList(); refetchSummary(); };

  return (
    <div className="container max-w-6xl mx-auto py-6 md:py-10 space-y-8 px-4 md:px-0">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Patrimônio</h1>
          <p className="text-foreground-muted mt-1">Controle total dos seus bens, investimentos e participações.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={openNewFinancing} className="rounded-full">
            <Home className="w-4 h-4 mr-2" />
            Novo Financiamento
          </Button>
          <Button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700 rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            Novo Ativo
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Financeiro" value={assets?.totalFinancial ?? 0} icon={TrendingUp} color="bg-indigo-500" />
        <KPICard title="Bens Físicos" value={assets?.totalPhysical ?? 0} icon={Building2} color="bg-emerald-500" />
        <KPICard title="Negócios" value={assets?.totalBusiness ?? 0} icon={Briefcase} color="bg-amber-500" />
        <KPICard title="Total Geral" value={assets?.grandTotal ?? 0} icon={Wallet} color="bg-violet-600" />
      </div>

      {/* Chart + Top 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-card border rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-foreground mb-4">Distribuição por Categoria</h2>
          <PatrimonioChart data={summary?.byCategory ?? []} />
        </div>

        <div className="lg:col-span-2 bg-card border rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-foreground mb-4">Maiores Ativos</h2>
          {summary?.byCategory?.slice(0, 3).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ${
                  idx === 0 ? 'bg-indigo-500' : idx === 1 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}>
                  {idx + 1}
                </div>
                <span className="font-medium text-sm text-foreground">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm text-foreground">{formatCurrency(item.value)}</span>
                <span className="block text-[10px] text-foreground-muted">{item.percentage}%</span>
              </div>
            </div>
          ))}
          {(!summary?.byCategory || summary.byCategory.length === 0) && (
            <p className="text-sm text-foreground-muted text-center py-8">Nenhum ativo cadastrado</p>
          )}
        </div>
      </div>

      {/* Growth Chart */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-foreground mb-4">Valorização dos Ativos (%)</h2>
        <PatrimonioGrowthChart data={summary?.withAppreciation ?? []} />
      </div>

      {/* Financiamentos Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground text-lg">Financiamentos</h2>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={openNewFinancing}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Novo
          </Button>
        </div>
        <FinanciamentosList 
          onRefresh={refetchAll} 
          onEdit={openEditFinancing}
          onDelete={handleDeleteFinancing}
        />
      </div>

      {/* Asset List Accordion */}
      <div>
        <h2 className="font-bold text-foreground mb-4 text-lg">Todos os Ativos</h2>
        <AssetList
          financial={assets?.financial ?? []}
          physical={assets?.physical ?? []}
          business={assets?.business ?? []}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Form Sheet */}
      <AssetForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={refetchAll}
        asset={assetToEdit}
      />

      {/* Financiamento Form */}
      <FinanciamentoForm
        isOpen={isFinanciamentoFormOpen}
        onClose={() => setIsFinanciamentoFormOpen(false)}
        onSuccess={refetchAll}
        initialData={financiamentoToEdit}
      />
    </div>
  );
}
