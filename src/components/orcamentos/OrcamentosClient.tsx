"use client";

import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";
import { MonthSelector } from "@/components/shared/MonthSelector";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FluxoCaixaClient } from "./FluxoCaixaClient";
import { BillsManager } from "./BillsManager";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Target, Loader2, TrendingDown, AlertTriangle, CheckCircle2,
  CheckCheck, DollarSign, LayoutGrid, ArrowUpDown, Trash2,
  Plus, X, ChevronDown, ChevronRight, Receipt,
} from "lucide-react";

function getStatusInfo(percentage: number) {
  if (percentage >= 100) return { label: "Limite atingido", color: "text-red-600", badgeColor: "bg-red-100 text-red-700", icon: AlertTriangle, progressColor: "bg-red-500" };
  if (percentage >= 80) return { label: "Atenção", color: "text-amber-600", badgeColor: "bg-amber-100 text-amber-700", icon: AlertTriangle, progressColor: "bg-amber-500" };
  if (percentage >= 50) return { label: "No caminho", color: "text-blue-600", badgeColor: "bg-blue-100 text-blue-700", icon: CheckCircle2, progressColor: "bg-blue-500" };
  return { label: "OK", color: "text-emerald-600", badgeColor: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, progressColor: "bg-emerald-500" };
}

const CATEGORY_COLORS = [
  "#6366f1","#3b82f6","#10b981","#f59e0b","#ec4899",
  "#06b6d4","#f97316","#8b5cf6","#ef4444","#14b8a6",
];

function CategoryTransactions({ categoryId, month, year, color, categoryName }: { categoryId: string; month: number; year: number; color: string; categoryName: string }) {
  const { data: transactions = [], isLoading } = trpc.budget.transactions.useQuery({ categoryId, month, year });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2 text-foreground-muted">
        <Receipt className="w-8 h-8 opacity-30" />
        <p className="text-sm font-medium">Nenhum lançamento em "{categoryName}" neste mês.</p>
        <p className="text-xs opacity-70">Os gastos de outros meses não contam aqui.</p>
      </div>
    );
  }

  const total = transactions.reduce((acc: number, t: any) => acc + Number(t.amount), 0);

  return (
    <div className="divide-y divide-border">
      {transactions.map((t: any) => (
        <div key={t.id} className="flex items-center justify-between px-6 py-3 hover:bg-surface-elevated/60 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {t.description || <span className="italic text-foreground-muted">Sem descrição</span>}
                {t.parentId && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded font-semibold">Parcela</span>}
              </p>
              <p className="text-xs text-foreground-muted">
                {format(new Date(t.transactionDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <span className="text-sm font-bold text-red-500 flex-shrink-0 ml-4">
            {formatCurrency(Number(t.amount))}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between px-6 py-2.5 bg-surface-elevated/80">
        <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">{transactions.length} lançamento{transactions.length > 1 ? 's' : ''}</span>
        <span className="text-sm font-bold text-red-600">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}


export function OrcamentosClient() {
  const { selectedMonth } = useAppStore();
  const month = selectedMonth.getMonth() + 1;
  const year = selectedMonth.getFullYear();
  const [activeTab, setActiveTab] = useState<"budgets" | "cashflow" | "bills">("budgets");
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: categories = [] } = trpc.category.list.useQuery({ type: "EXPENSE" });
  const { data: budgets = [], isLoading } = trpc.budget.list.useQuery({ month, year });

  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryLimit, setNewCategoryLimit] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const newNameRef = useRef<HTMLInputElement>(null);

  const upsertMutation = trpc.budget.upsert.useMutation({
    onSuccess: () => utils.budget.list.invalidate(),
    onError: () => toast.error("Erro ao salvar orçamento."),
  });

  const createCategoryMutation = trpc.category.create.useMutation({
    onSuccess: () => { utils.category.list.invalidate(); utils.budget.list.invalidate(); },
    onError: (err) => toast.error(err.message?.includes("já existe") ? "Categoria já existe." : "Erro ao criar categoria."),
  });

  const deleteCategoryMutation = trpc.category.delete.useMutation({
    onSuccess: () => { utils.category.list.invalidate(); utils.budget.list.invalidate(); toast.success("Categoria removida."); },
    onError: () => toast.error("Erro ao remover categoria."),
  });

  const markAsPaidMutation = trpc.cashflow.markAsPaid.useMutation({
    onSuccess: (data) => {
      utils.budget.list.invalidate();
      utils.transaction.list.invalidate();
      if (data.created) toast.success("✅ Lançamento criado!");
      else toast.info("ℹ️ Lançamento já existe para este item.");
    },
    onError: () => toast.error("Erro ao criar lançamento."),
  });

  const handleSaveBudget = async (categoryId: string) => {
    const raw = editingValues[categoryId];
    if (raw === undefined || raw === "") return;
    const amount = parseFloat(raw.replace(",", "."));
    if (isNaN(amount) || amount < 0) return;
    setSavingId(categoryId);
    await upsertMutation.mutateAsync({ categoryId, amount, month, year });
    setSavingId(null);
    const newValues = { ...editingValues };
    delete newValues[categoryId];
    setEditingValues(newValues);
    toast.success("Limite salvo!");
  };

  const handleKeyDownBudget = (e: React.KeyboardEvent, categoryId: string) => {
    if (e.key === "Enter") handleSaveBudget(categoryId);
    if (e.key === "Escape") { const v = { ...editingValues }; delete v[categoryId]; setEditingValues(v); }
  };

  const handleAddNewCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) { newNameRef.current?.focus(); return; }
    const limitAmount = parseFloat(newCategoryLimit.replace(",", "."));
    setIsAddingCategory(true);
    try {
      const created = await createCategoryMutation.mutateAsync({ name, type: "EXPENSE" });
      if (!isNaN(limitAmount) && limitAmount > 0) {
        await upsertMutation.mutateAsync({ categoryId: created.id, amount: limitAmount, month, year });
      }
      toast.success(`Categoria "${name}" criada!`);
      setNewCategoryName(""); setNewCategoryLimit("");
      newNameRef.current?.focus();
    } catch { /* handled */ } finally { setIsAddingCategory(false); }
  };

  const totalBudgeted = budgets.reduce((acc, b: any) => acc + b.amount, 0);
  const totalSpent = budgets.reduce((acc, b: any) => acc + b.spent, 0);
  const overBudget = budgets.filter((b: any) => b.percentage >= 100).length;
  const nearLimit = budgets.filter((b: any) => b.percentage >= 80 && b.percentage < 100).length;

  const categoriesWithBudget = useMemo(() => {
    const budgetMap = new Map((budgets as any[]).map((b) => [b.categoryId, b]));
    return categories.map((cat, idx) => ({
      cat,
      budget: budgetMap.get(cat.id) || null,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [categories, budgets]);

  const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const monthName = MONTH_NAMES[selectedMonth.getMonth()];

  return (
    <div className="container max-w-6xl mx-auto py-6 md:py-10 space-y-8 px-4 md:px-0">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Orçamentos</h1>
          </div>
          <p className="text-foreground-muted ml-14">
            Planejamento financeiro mensal — <span className="font-medium text-foreground">{monthName} {year}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <MonthSelector />
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 p-1 bg-surface-elevated rounded-xl border border-border w-fit">
        <button
          onClick={() => setActiveTab("budgets")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${activeTab === "budgets" ? "bg-card text-foreground shadow-sm border border-border" : "text-foreground-muted hover:text-foreground"}`}
        >
          <LayoutGrid className="w-4 h-4" />
          Orçamentos
        </button>
        <button
          onClick={() => setActiveTab("bills")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${activeTab === "bills" ? "bg-card text-foreground shadow-sm border border-border" : "text-foreground-muted hover:text-foreground"}`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Contas a Pagar
        </button>
        <button
          onClick={() => setActiveTab("cashflow")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${activeTab === "cashflow" ? "bg-card text-foreground shadow-sm border border-border" : "text-foreground-muted hover:text-foreground"}`}
        >
          <ArrowUpDown className="w-4 h-4" />
          Fluxo de Caixa
        </button>
      </div>

      {activeTab === "cashflow" && <FluxoCaixaClient />}
      {activeTab === "bills" && <BillsManager />}

      {activeTab === "budgets" && (
        <>
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-1">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Total Orçado</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalBudgeted)}</p>
              <p className="text-xs text-foreground-muted">{budgets.length} categorias</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-1">
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Total Gasto</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalSpent)}</p>
              <p className="text-xs text-foreground-muted">{totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}% do orçamento</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-1">
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Disponível</p>
              <p className={`text-xl font-bold ${totalBudgeted - totalSpent >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatCurrency(Math.max(0, totalBudgeted - totalSpent))}
              </p>
              <p className="text-xs text-foreground-muted">restante no mês</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-1">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">Alertas</p>
              <p className="text-xl font-bold text-foreground">{overBudget + nearLimit}</p>
              <p className="text-xs text-foreground-muted">
                {overBudget > 0 && <span className="text-red-500 font-medium">{overBudget} no limite</span>}
                {overBudget > 0 && nearLimit > 0 && " · "}
                {nearLimit > 0 && <span className="text-amber-500 font-medium">{nearLimit} quase no limite</span>}
                {overBudget === 0 && nearLimit === 0 && <span className="text-emerald-500">Tudo sob controle</span>}
              </p>
            </div>
          </div>

          {/* TABLE */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-sm text-foreground-muted">Carregando orçamentos...</p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-surface-elevated border-b border-border text-xs font-bold text-foreground-muted uppercase tracking-wider">
                <div className="col-span-4">Categoria</div>
                <div className="col-span-3 text-right">Limite (R$)</div>
                <div className="col-span-2 text-right">Gasto real</div>
                <div className="col-span-2 text-right">Disponível</div>
                <div className="col-span-1" />
              </div>

              {categoriesWithBudget.map(({ cat, budget, color }) => {
                const currentLimit = budget?.amount ?? 0;
                const spent = budget?.spent ?? 0;
                const percentage = budget?.percentage ?? 0;
                const available = Math.max(0, currentLimit - spent);
                const isEditing = editingValues[cat.id] !== undefined;
                const isSaving = savingId === cat.id;
                const status = getStatusInfo(percentage);
                const isOver = percentage >= 100;
                const isExpanded = expandedCategoryId === cat.id;

                return (
                  <div key={cat.id} className={`border-b border-border last:border-b-0 ${isOver ? "bg-red-500/5" : ""}`}>
                    {/* Main row */}
                    <div className={`group grid grid-cols-12 gap-2 px-5 py-3.5 items-center hover:bg-surface-elevated/50 transition-colors`}>
                      {/* Category + progress — CLICÁVEL */}
                      <div
                        className="col-span-4 flex items-center gap-3 min-w-0 cursor-pointer select-none"
                        onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {isExpanded
                              ? <ChevronDown className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                              : <ChevronRight className="w-3.5 h-3.5 text-foreground-muted/50 flex-shrink-0" />
                            }
                            <p className="font-semibold text-sm text-foreground truncate">{cat.name}</p>
                          </div>
                          {currentLimit > 0 && (
                            <div className="flex items-center gap-1.5 mt-1 ml-5">
                              <div className="flex-1 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${status.progressColor}`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                              <span className={`text-[10px] font-bold ${status.color}`}>
                                {Math.round(percentage)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Limit input */}
                      <div className="col-span-3 flex items-center justify-end gap-1.5">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">R$</span>
                          <Input
                            type="number" min="0" step="0.01"
                            className="w-28 pl-7 h-8 text-sm font-semibold text-right pr-2 rounded-lg border-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300"
                            value={isEditing ? editingValues[cat.id] : (currentLimit === 0 ? "" : currentLimit)}
                            placeholder="0,00"
                            onFocus={() => { if (!isEditing) setEditingValues({ ...editingValues, [cat.id]: currentLimit > 0 ? String(currentLimit) : "" }); }}
                            onChange={(e) => setEditingValues({ ...editingValues, [cat.id]: e.target.value })}
                            onKeyDown={(e) => handleKeyDownBudget(e, cat.id)}
                            onBlur={() => { if (isEditing) handleSaveBudget(cat.id); }}
                          />
                        </div>
                        {isEditing && (
                          <button
                            onClick={() => handleSaveBudget(cat.id)}
                            disabled={isSaving}
                            className="h-8 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "OK"}
                          </button>
                        )}
                      </div>

                      {/* Spent */}
                      <div className="col-span-2 text-right">
                        <span className={`text-sm font-bold ${isOver ? "text-red-500" : "text-foreground"}`}>
                          {formatCurrency(spent)}
                        </span>
                      </div>

                      {/* Available */}
                      <div className="col-span-2 text-right">
                        {currentLimit > 0 ? (
                          <span className={`text-sm font-bold ${isOver ? "text-red-500" : "text-emerald-500"}`}>
                            {isOver ? `−${formatCurrency(spent - currentLimit)}` : formatCurrency(available)}
                          </span>
                        ) : (
                          <span className="text-sm text-foreground-muted/50">—</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex justify-end items-center gap-1">
                        <button
                          onClick={() => markAsPaidMutation.mutate({ id: undefined, categoryId: cat.id, month, year, categoryName: cat.name, amount: currentLimit })}
                          title="Marcar como pago e lançar"
                          className="w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors shadow-sm shrink-0"
                          disabled={markAsPaidMutation.isPending || currentLimit === 0}
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>

                        {confirmDeleteId === cat.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { deleteCategoryMutation.mutate({ id: cat.id }); setConfirmDeleteId(null); }}
                              className="text-[10px] px-1.5 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 font-semibold"
                            >OK</button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[10px] px-1 py-1 rounded hover:bg-surface-elevated text-foreground-muted"
                            ><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(cat.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-foreground-muted/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Remover categoria"
                          ><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </div>

                    {/* Expanded transactions panel */}
                    {isExpanded && (
                      <div className="border-t border-border/60 bg-surface-elevated/40">
                        <div className="px-6 py-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5" />
                            Gastos de {monthName} — {cat.name}
                          </span>
                          <span className="text-xs font-bold text-red-500">{formatCurrency(spent)} gastos</span>
                        </div>
                        <CategoryTransactions categoryId={cat.id} month={month} year={year} color={color} categoryName={cat.name} />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* New category row */}
              <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-indigo-500/5 border-t border-indigo-200/30 dark:border-indigo-700/30 items-center">
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-surface-elevated border border-border flex-shrink-0" />
                  <Input
                    ref={newNameRef}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddNewCategory(); if (e.key === "Escape") { setNewCategoryName(""); setNewCategoryLimit(""); } }}
                    placeholder="Nova categoria..."
                    className="h-8 text-sm border-border focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300 bg-card"
                  />
                </div>
                <div className="col-span-3 flex items-center justify-end gap-1.5">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">R$</span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={newCategoryLimit}
                      onChange={(e) => setNewCategoryLimit(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddNewCategory(); }}
                      placeholder="Limite"
                      className="w-28 pl-7 h-8 text-sm font-semibold text-right pr-2 rounded-lg border-border focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300 bg-card"
                    />
                  </div>
                </div>
                <div className="col-span-4 flex items-center gap-2">
                  <button
                    onClick={handleAddNewCategory}
                    disabled={isAddingCategory || !newCategoryName.trim()}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {isAddingCategory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Adicionar
                  </button>
                  <span className="text-[10px] text-foreground-muted hidden sm:block">
                    ou pressione <kbd className="bg-card border border-border px-1 rounded text-[10px]">Enter</kbd>
                  </span>
                </div>
                <div className="col-span-1" />
              </div>
            </div>
          )}

          {/* TIPS */}
          {budgets.length > 0 && (
            <div className="bg-surface-elevated border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-500" />
                Resumo — {monthName} {year}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-foreground-muted">
                    <strong className="text-foreground">{budgets.filter((b: any) => b.percentage < 80).length}</strong> categorias dentro do limite
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-foreground-muted">
                    <strong className="text-foreground">{nearLimit}</strong> próximas ao limite
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-foreground-muted">
                    <strong className="text-foreground">{overBudget}</strong> no limite ou acima
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
