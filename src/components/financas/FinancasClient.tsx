"use client";

import { useState, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { trpc } from "@/lib/trpc-client";
import { MonthSelector } from "@/components/shared/MonthSelector";
import { TransactionList } from "./TransactionList";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TransactionForm } from "./TransactionForm";
import { BulkTransactionForm } from "./BulkTransactionForm";
import { BudgetAlertInline } from "./BudgetAlertInline";
import { PlusCircle, Table2, TrendingUp, TrendingDown, Scale, ArrowDown } from "lucide-react";

// RECHARTS MODULES — lazy loaded for performance
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/shared/ChartSkeleton";

const GastosMensaisChart = dynamic(
  () => import("./GastosMensaisChart").then((m) => m.GastosMensaisChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const DistribuicaoPizzaChart = dynamic(
  () => import("./DistribuicaoPizzaChart").then((m) => m.DistribuicaoPizzaChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const ComparacaoMensalChart = dynamic(
  () => import("./ComparacaoMensalChart").then((m) => m.ComparacaoMensalChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export function FinancasClient() {
  const { selectedMonth } = useAppStore();
  const [analysisMonth, setAnalysisMonth] = useState<Date>(selectedMonth);
  const [tab, setTab] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [bulkFormOpen, setBulkFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [formDefaultCategory, setFormDefaultCategory] = useState<string | undefined>();

  // Refs for scroll-to behaviour
  const analysisRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: summary } = trpc.transaction.getMonthlySummary.useQuery({ month: selectedMonth });
  const { data: biggestExpenses } = trpc.transaction.getBiggestExpenses.useQuery({ month: analysisMonth });
  const { data: monthlyComparison } = trpc.transaction.getMonthlyComparison.useQuery({ months: 6 });

  // Map Donut chart prop
  const pieData = biggestExpenses?.map(d => ({
    name: d.category,
    value: d.total,
    color: d.color || '#cbd5e1'
  })) || [];

  // Card click handlers — set filter + scroll to analysis
  const handleCardClick = (filter: "ALL" | "INCOME" | "EXPENSE") => {
    setTab(filter);
    // Scroll to the analysis section for INCOME/EXPENSE, or to the list for ALL
    const target = filter === "ALL" ? listRef.current : analysisRef.current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-6 md:py-10 space-y-8 px-4 md:px-0">
      
      {/* HEADER & SELETOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Transações</h1>
          <p className="text-foreground-muted mt-1">Gerencie suas receitas e despesas mensais.</p>
        </div>
        
        <div className="flex items-center gap-2 self-start md:self-auto">
          <MonthSelector />
          <Button
            variant="outline"
            className="rounded-full shadow-sm gap-2"
            onClick={() => setBulkFormOpen(true)}
          >
            <Table2 className="w-4 h-4" />
            <span className="hidden sm:inline">Em Massa</span>
          </Button>
          <Button className="rounded-full shadow-sm" onClick={() => {
            setEditingTransaction(null);
            setFormDefaultCategory(undefined);
            setFormOpen(true);
          }}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* CARDS SUMÁRIO — interactive with hover animation + click to filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Receitas */}
        <button
          type="button"
          onClick={() => handleCardClick("INCOME")}
          className={`group bg-card p-5 rounded-2xl border shadow-sm relative overflow-hidden text-left
            transition-all duration-300 ease-out cursor-pointer
            hover:scale-[1.04] hover:shadow-lg hover:shadow-emerald-500/10
            active:scale-[0.98]
            ${tab === "INCOME"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/10"
              : "border-emerald-500/20"
            }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform duration-300 group-hover:scale-125" />
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-emerald-500">Receitas do Mês</p>
            <TrendingUp className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0" />
          </div>
          <h3 className="text-2xl font-bold text-foreground relative z-10">
            {summary ? formatCurrency(summary.totalIncome) : "R$ 0,00"}
          </h3>
          <p className="text-[10px] text-emerald-500/60 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 flex items-center gap-1">
            <ArrowDown className="w-3 h-3" />
            Clique para filtrar receitas
          </p>
        </button>
        
        {/* Despesas */}
        <button
          type="button"
          onClick={() => handleCardClick("EXPENSE")}
          className={`group bg-card p-5 rounded-2xl border shadow-sm relative overflow-hidden text-left
            transition-all duration-300 ease-out cursor-pointer
            hover:scale-[1.04] hover:shadow-lg hover:shadow-red-500/10
            active:scale-[0.98]
            ${tab === "EXPENSE"
              ? "border-red-500 ring-2 ring-red-500/20 shadow-md shadow-red-500/10"
              : "border-red-500/20"
            }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform duration-300 group-hover:scale-125" />
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-red-500">Despesas do Mês</p>
            <TrendingDown className="w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0" />
          </div>
          <h3 className="text-2xl font-bold text-foreground relative z-10">
            {summary ? formatCurrency(summary.totalExpenses) : "R$ 0,00"}
          </h3>
          <p className="text-[10px] text-red-500/60 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 flex items-center gap-1">
            <ArrowDown className="w-3 h-3" />
            Clique para ver onde gastou
          </p>
        </button>

        {/* Saldo */}
        <button
          type="button"
          onClick={() => handleCardClick("ALL")}
          className={`group bg-card p-5 rounded-2xl border shadow-sm relative overflow-hidden text-left
            transition-all duration-300 ease-out cursor-pointer
            hover:scale-[1.04] hover:shadow-lg hover:shadow-primary/10
            active:scale-[0.98]
            ${tab === "ALL"
              ? "border-primary/50 ring-2 ring-primary/20 shadow-md shadow-primary/10"
              : "border-border"
            }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-surface-elevated rounded-bl-full -mr-4 -mt-4 transition-transform duration-300 group-hover:scale-125" />
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-foreground-muted">Saldo Líquido</p>
            <Scale className="w-4 h-4 text-foreground-subtle opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0" />
          </div>
          <h3 className={`text-2xl font-bold relative z-10 ${summary && summary.balance < 0 ? "text-red-500" : "text-foreground"}`}>
            {summary ? formatCurrency(summary.balance) : "R$ 0,00"}
          </h3>
          <p className="text-[10px] text-foreground-subtle mt-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 flex items-center gap-1">
            <ArrowDown className="w-3 h-3" />
            Clique para ver tudo
          </p>
        </button>
      </div>

      {/* ANÁLISE GRÁFICA (P14) */}
      <div ref={analysisRef} className="space-y-4 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Análise</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground-muted">Mês de Análise:</label>
            <input 
              type="month" 
              className="px-3 py-1.5 text-sm border border-border rounded-lg text-foreground bg-card shadow-sm focus:ring-indigo-500"
              value={`${analysisMonth.getFullYear()}-${String(analysisMonth.getMonth() + 1).padStart(2, '0')}`}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, month] = e.target.value.split('-');
                  setAnalysisMonth(new Date(Number(year), Number(month) - 1, 1));
                }
              }}
            />
          </div>
        </div>
        <Tabs defaultValue="CURRENT_MONTH" className="w-full">
          <TabsList className="bg-card border shadow-sm p-1 rounded-xl mb-4 w-full sm:w-auto grid grid-cols-2 sm:flex">
            <TabsTrigger value="CURRENT_MONTH" className="rounded-lg">Mês Atual</TabsTrigger>
            <TabsTrigger value="HISTORY" className="rounded-lg">Histórico (6 meses)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="CURRENT_MONTH" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-3">
                 <GastosMensaisChart data={biggestExpenses || []} month={analysisMonth} />
              </div>
              <div className="md:col-span-2">
                 <DistribuicaoPizzaChart data={pieData} />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="HISTORY" className="mt-0">
            <div>
              <ComparacaoMensalChart data={monthlyComparison || []} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="pt-4 border-t border-border" />

      {/* Tabs de Filtro — controlled */}
      <div ref={listRef} className="scroll-mt-6">
        <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="w-full">
          <TabsList className="bg-card border shadow-sm p-1 rounded-xl">
            <TabsTrigger value="ALL" className="rounded-lg">Tudo</TabsTrigger>
            <TabsTrigger value="EXPENSE" className="rounded-lg">Despesas</TabsTrigger>
            <TabsTrigger value="INCOME" className="rounded-lg">Receitas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ALERTA INLINE DE ORÇAMENTOS + LISTA */}
      <div className="min-h-[400px] space-y-4">
        {/* Alerta discreto de orçamento — sempre visível quando há limite ultrapassado */}
        <BudgetAlertInline month={selectedMonth} />

        <TransactionList 
          month={selectedMonth} 
          typeFilter={tab as any} 
          onEdit={(tx) => {
            setEditingTransaction(tx);
            setFormOpen(true);
          }}
        />
      </div>

      {/* FORMULÁRIO */}
      <TransactionForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        transaction={editingTransaction}
        defaultCategoryId={formDefaultCategory}
        defaultType="EXPENSE"
        defaultDate={new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), Math.min(new Date().getDate(), new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate()))} 
      />

      {/* FORMULÁRIO EM MASSA */}
      <BulkTransactionForm
        open={bulkFormOpen}
        onOpenChange={setBulkFormOpen}
        defaultDate={new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), Math.min(new Date().getDate(), new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate()))}
      />
    </div>
  );
}
