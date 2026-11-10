"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Repeat,
  CheckCircle2,
  CheckCheck,
  AlertTriangle,
  Edit2,
  X,
  Save,
} from "lucide-react";

// ─── Tipos ─────────────────────────────────────────────────────────────────

type EntryType = "INCOME" | "EXPENSE";

interface FormState {
  description: string;
  amount: string;
  isRecurring: boolean;
  recurrenceInterval: number;
}

const EMPTY_FORM: FormState = { description: "", amount: "", isRecurring: false, recurrenceInterval: 1 };

const INTERVAL_OPTIONS = [
  { value: 1,  label: "Mensal",     short: "Todo mês" },
  { value: 2,  label: "Bimestral",  short: "A cada 2 meses" },
  { value: 3,  label: "Trimestral", short: "A cada 3 meses" },
  { value: 6,  label: "Semestral",  short: "A cada 6 meses" },
  { value: 12, label: "Anual",      short: "Uma vez por ano" },
];


// ─── Sub-componente: Card de Resumo ────────────────────────────────────────

function SummaryCard({
  label,
  planned,
  real,
  type,
}: {
  label: string;
  planned: number;
  real: number;
  type: "income" | "expense" | "balance";
}) {
  const isBalance = type === "balance";
  const isPositive = real >= 0;
  const diff = real - planned;
  const hasDiff = Math.abs(diff) > 0.01;

  const colors = {
    income: { icon: ArrowUpCircle, accent: "text-emerald-600", border: "border-emerald-100", bg: "from-emerald-50 to-teal-50" },
    expense: { icon: ArrowDownCircle, accent: "text-red-500", border: "border-red-100", bg: "from-red-50 to-orange-50" },
    balance: {
      icon: Wallet,
      accent: isPositive ? "text-blue-600" : "text-red-600",
      border: isPositive ? "border-blue-100" : "border-red-200",
      bg: isPositive ? "from-blue-50 to-indigo-50" : "from-red-50 to-orange-50",
    },
  };

  const c = colors[type];
  const Icon = c.icon;

  return (
    <div className={`rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} p-4 space-y-2`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${c.accent}`} />
        <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">{label}</p>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-baseline">
          <span className="text-[11px] text-foreground-muted">Previsto</span>
          <span className="text-sm font-bold text-foreground">{formatCurrency(planned)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-[11px] text-foreground-muted">Real</span>
          <span className={`text-sm font-bold ${c.accent}`}>{formatCurrency(isBalance ? real : real)}</span>
        </div>
        {hasDiff && (
          <div className="flex justify-between items-baseline pt-1 border-t border-black/5">
            <span className="text-[11px] text-foreground-muted">Diferença</span>
            <span className={`text-xs font-semibold ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componente: Linha de item ──────────────────────────────────────────

function EntryRow({
  entry,
  onDelete,
  onUpdate,
  onMarkPaid,
}: {
  entry: { id: string; description: string; amount: number; isRecurring: boolean; isVirtual?: boolean; recurrenceInterval?: number };
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<FormState>) => void;
  onMarkPaid: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({
    description: entry.description,
    amount: String(entry.amount),
    isRecurring: entry.isRecurring,
    recurrenceInterval: entry.recurrenceInterval ?? 1,
  });

  const handleSave = () => {
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!form.description || isNaN(amount) || amount <= 0) return;
    onUpdate(entry.id, { ...form, amount: form.amount });
    setEditing(false);
  };

  // Virtual items (from budget) — read-only in cashflow, must be edited in Orçamentos
  if (entry.isVirtual) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-orange-50/50 border border-orange-100 group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">{entry.description}</span>
            <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-700 border-orange-200 px-1.5 py-0 shrink-0">
              do orçamento
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-600 border-indigo-200 px-1.5 py-0 shrink-0">
              <Repeat className="w-2.5 h-2.5 mr-1" />
              Fixo
            </Badge>
          </div>
          <p className="text-[10px] text-foreground-muted mt-0.5">Valor definido na aba Orçamentos</p>
        </div>
        <span className="text-sm font-bold text-foreground tabular-nums shrink-0">
          {formatCurrency(entry.amount)}
        </span>
        <button
          onClick={() => onMarkPaid(entry.id)}
          title="Marcar como pago nos lançamentos"
          className="shrink-0 w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors shadow-sm"
        >
          <CheckCheck className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-surface-elevated rounded-xl border border-border animate-in fade-in duration-150">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            className="flex-1 h-8 text-sm"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrição"
          />
          <div className="relative w-32 shrink-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-foreground-muted">R$</span>
            <Input
              type="number"
              className="pl-7 h-8 text-sm text-right font-semibold"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0,00"
            />
          </div>
          <button
            onClick={() => setForm({ ...form, isRecurring: !form.isRecurring })}
            className={`flex items-center gap-1.5 text-xs px-2.5 h-8 rounded-lg border transition-colors shrink-0 ${
              form.isRecurring
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-surface border-border text-foreground-muted hover:border-indigo-200"
            }`}
          >
            <Repeat className="w-3 h-3" />
            Recorrente
          </button>
          <div className="flex gap-1 shrink-0">
            <Button size="sm" className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" onClick={handleSave}>
              <Save className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2 rounded-lg" onClick={() => setEditing(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        {form.isRecurring && (
          <div className="flex flex-wrap gap-1 pl-1">
            <span className="text-[10px] text-foreground-muted font-medium mr-1 self-center">Periodicidade:</span>
            {INTERVAL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, recurrenceInterval: opt.value })}
                className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-colors ${
                  form.recurrenceInterval === opt.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-border text-foreground-muted hover:border-indigo-400 hover:text-indigo-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-elevated transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{entry.description}</span>
          {entry.isRecurring && (() => {
            const opt = INTERVAL_OPTIONS.find(o => o.value === (entry.recurrenceInterval ?? 1));
            return (
              <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-600 border-indigo-200 px-1.5 py-0 shrink-0">
                <Repeat className="w-2.5 h-2.5 mr-1" />
                {opt?.label ?? "Mensal"}
              </Badge>
            );
          })()}
        </div>
      </div>
      <span className="text-sm font-bold text-foreground tabular-nums shrink-0">
        {formatCurrency(entry.amount)}
      </span>
      {/* Botão verde “Pago” — sempre visível */}
      <button
        onClick={() => onMarkPaid(entry.id)}
        title="Marcar como pago nos lançamentos"
        className="shrink-0 w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors shadow-sm"
      >
        <CheckCheck className="w-3.5 h-3.5" />
      </button>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-1 rounded-md text-foreground-muted hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          className="p-1 rounded-md text-foreground-muted hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Sub-componente: Seção (Entradas ou Saídas) ─────────────────────────────

function FlowSection({
  title,
  type,
  entries,
  onAdd,
  onDelete,
  onUpdate,
  onMarkPaid,
  totalPlanned,
  totalReal,
}: {
  title: string;
  type: EntryType;
  entries: Array<{ id: string; description: string; amount: number; isRecurring: boolean }>;
  onAdd: (type: EntryType, form: FormState) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<FormState>) => void;
  onMarkPaid: (id: string) => void;
  totalPlanned: number;
  totalReal: number;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const isIncome = type === "INCOME";

  const handleAdd = () => {
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!form.description.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Preencha a descrição e o valor corretamente.");
      return;
    }
    onAdd(type, form);
    setForm(EMPTY_FORM);
    setAdding(false);
  };

  const accentColor = isIncome
    ? { bg: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", btn: "bg-emerald-600 hover:bg-emerald-700" }
    : { bg: "bg-red-500", light: "bg-red-50", text: "text-red-700", border: "border-red-200", btn: "bg-red-600 hover:bg-red-700" };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Cabeçalho */}
      <div className={`flex items-center justify-between px-5 py-4 border-b border-border`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl ${accentColor.bg} flex items-center justify-center`}>
            {isIncome ? (
              <TrendingUp className="w-4 h-4 text-white" />
            ) : (
              <TrendingDown className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{title}</p>
            <p className="text-xs text-foreground-muted">
              Previsto: <span className="font-semibold text-foreground">{formatCurrency(totalPlanned)}</span>
              {" · "}
              Real: <span className={`font-semibold ${isIncome ? "text-emerald-600" : "text-red-500"}`}>{formatCurrency(totalReal)}</span>
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className={`h-8 px-3 text-white rounded-xl text-xs ${accentColor.btn}`}
          onClick={() => setAdding(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Adicionar
        </Button>
      </div>

      {/* Formulário de adição */}
      {adding && (
        <div className="px-4 py-3 border-b border-border bg-surface-elevated">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              className="flex-1 h-9 text-sm"
              placeholder={isIncome ? "Ex: Salário, Freelance, Renda extra..." : "Ex: Aluguel, Supermercado, Academia..."}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
              autoFocus
            />
            <div className="relative w-36 shrink-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground-muted">R$</span>
              <Input
                type="number"
                className="pl-8 h-9 text-sm text-right font-semibold"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              />
            </div>
            <button
              onClick={() => setForm({ ...form, isRecurring: !form.isRecurring })}
              className={`flex items-center gap-1.5 text-xs px-3 h-9 rounded-lg border transition-colors shrink-0 ${
                form.isRecurring
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold"
                  : "bg-card border-border text-foreground-muted hover:border-indigo-200 hover:text-indigo-600"
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              Recorrente
            </button>
            <Button size="sm" className={`h-9 px-4 text-white rounded-lg bg-emerald-600 hover:bg-emerald-700`} onClick={handleAdd}>
              Salvar
            </Button>
            <Button size="sm" variant="ghost" className="h-9 px-3 rounded-lg" onClick={() => { setAdding(false); setForm(EMPTY_FORM); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {form.isRecurring && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-1">
              <span className="text-[10px] text-foreground-muted font-semibold uppercase tracking-wider">Periodicidade:</span>
              {INTERVAL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, recurrenceInterval: opt.value })}
                  className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold transition-colors ${
                    form.recurrenceInterval === opt.value
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-border text-foreground-muted hover:border-indigo-400 hover:text-indigo-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <span className="text-[10px] text-foreground-muted ml-1">
                ({INTERVAL_OPTIONS.find(o => o.value === form.recurrenceInterval)?.short})
              </span>
            </div>
          )}
          <p className="text-[11px] text-foreground-muted mt-1 pl-1">
            Marque <strong>Recorrente</strong> para que este item seja replicado automaticamente com a periodicidade escolhida.
          </p>
        </div>
      )}


      {/* Lista de itens */}
      <div className="px-4 py-2 space-y-0.5 min-h-[60px]">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-foreground-muted text-sm">
            Nenhum item cadastrado ainda.{" "}
            <button
              className={`ml-1 font-semibold ${accentColor.text} hover:underline`}
              onClick={() => setAdding(true)}
            >
              Adicionar agora →
            </button>
          </div>
        ) : (
          entries.map((e) => (
            <EntryRow key={e.id} entry={e} onDelete={onDelete} onUpdate={onUpdate} onMarkPaid={onMarkPaid} />
          ))
        )}
      </div>

      {/* Rodapé com total */}
      {entries.length > 0 && (
        <div className={`px-5 py-3 border-t border-border ${accentColor.light} flex justify-between items-center`}>
          <span className={`text-xs font-semibold uppercase tracking-wider ${accentColor.text}`}>
            Total previsto
          </span>
          <span className={`text-base font-bold ${accentColor.text}`}>
            {formatCurrency(totalPlanned)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

export function FluxoCaixaClient() {
  const { selectedMonth } = useAppStore();
  const month = selectedMonth.getMonth() + 1;
  const year = selectedMonth.getFullYear();

  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.cashflow.summary.useQuery({ month, year });

  const createMutation = trpc.cashflow.create.useMutation({
    onSuccess: () => { utils.cashflow.summary.invalidate(); toast.success("Item adicionado!"); },
    onError: () => toast.error("Erro ao adicionar item."),
  });

  const updateMutation = trpc.cashflow.update.useMutation({
    onSuccess: () => { utils.cashflow.summary.invalidate(); toast.success("Item atualizado!"); },
    onError: () => toast.error("Erro ao atualizar item."),
  });

  const deleteMutation = trpc.cashflow.delete.useMutation({
    onSuccess: () => { utils.cashflow.summary.invalidate(); toast.success("Item removido."); },
    onError: () => toast.error("Erro ao remover item."),
  });

  const replicateMutation = trpc.cashflow.replicateRecurring.useMutation({
    onSuccess: (data) => {
      utils.cashflow.summary.invalidate();
      if (data.created > 0) {
        toast.success(`${data.created} item(ns) fixo(s) replicado(s) do mês anterior!`);
      } else {
        toast.info("Nenhum item novo para replicar.");
      }
    },
  });

  const markAsPaidMutation = trpc.cashflow.markAsPaid.useMutation({
    onSuccess: (data) => {
      utils.cashflow.summary.invalidate();
      utils.transaction.list.invalidate();
      if (data.created) {
        toast.success("✅ Lançamento criado com sucesso!");
      } else {
        toast.info("ℹ️ Lançamento já existe para este item neste mês.");
      }
    },
    onError: () => toast.error("Erro ao criar lançamento."),
  });

  const handleMarkPaid = (id: string) => {
    if (id.startsWith("budget::")) {
      // Itens virtuais não têm entry no cashflow — informar que deve usar o botão nos Orçamentos
      toast.info("Use o botão ✓ na aba Orçamentos para lançar itens do orçamento.");
      return;
    }
    markAsPaidMutation.mutate({ id, month, year });
  };


  const handleAdd = (type: EntryType, form: FormState) => {
    const amount = parseFloat(form.amount.replace(",", "."));
    createMutation.mutate({
      type,
      description: form.description.trim(),
      amount,
      month,
      year,
      isRecurring: form.isRecurring,
      recurrenceInterval: form.isRecurring ? (form.recurrenceInterval ?? 1) : 1,
    });
  };

  const handleUpdate = (id: string, form: Partial<FormState>) => {
    const amount = form.amount ? parseFloat(String(form.amount).replace(",", ".")) : undefined;
    updateMutation.mutate({
      id,
      data: {
        ...(form.description && { description: form.description }),
        ...(amount !== undefined && !isNaN(amount) && { amount }),
        ...(form.isRecurring !== undefined && { isRecurring: form.isRecurring }),
        ...(form.recurrenceInterval !== undefined && { recurrenceInterval: form.recurrenceInterval }),
      },
    });
  };


  const handleDelete = (id: string) => {
    if (id.startsWith("budget::")) {
      toast.info("Este item vem dos Orçamentos. Edite-o na aba Orçamentos.");
      return;
    }
    deleteMutation.mutate({ id });
  };

  const entries = data?.entries ?? [];
  const summary = data?.summary ?? { plannedIncome: 0, plannedExpense: 0, plannedBalance: 0, realIncome: 0, realExpense: 0, realBalance: 0 };

  const incomeEntries = entries.filter((e) => e.type === "INCOME");
  const expenseEntries = entries.filter((e) => e.type === "EXPENSE");

  const balancePositive = summary.realBalance >= 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm text-foreground-muted">Carregando fluxo de caixa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botão replicar recorrentes */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs"
          onClick={() => replicateMutation.mutate({ month, year })}
          disabled={replicateMutation.isPending}
        >
          {replicateMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          )}
          Replicar fixos do mês anterior
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Receitas"
          planned={summary.plannedIncome}
          real={summary.realIncome}
          type="income"
        />
        <SummaryCard
          label="Despesas"
          planned={summary.plannedExpense}
          real={summary.realExpense}
          type="expense"
        />
        <div className={`rounded-2xl border ${balancePositive ? "border-blue-100" : "border-red-200"} bg-gradient-to-br ${balancePositive ? "from-blue-50 to-indigo-50" : "from-red-50 to-orange-50"} p-4 space-y-2`}>
          <div className="flex items-center gap-2">
            {balancePositive ? (
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Saldo do mês</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-foreground-muted">Previsto</span>
              <span className={`text-sm font-bold ${summary.plannedBalance >= 0 ? "text-blue-600" : "text-red-500"}`}>
                {formatCurrency(summary.plannedBalance)}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-foreground-muted">Real</span>
              <span className={`text-base font-extrabold ${balancePositive ? "text-blue-700" : "text-red-600"}`}>
                {formatCurrency(summary.realBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Seção Entradas */}
      <FlowSection
        title="Entradas previstas"
        type="INCOME"
        entries={incomeEntries}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        onMarkPaid={handleMarkPaid}
        totalPlanned={summary.plannedIncome}
        totalReal={summary.realIncome}
      />

      {/* Seção Saídas */}
      <FlowSection
        title="Saídas previstas"
        type="EXPENSE"
        entries={expenseEntries}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        onMarkPaid={handleMarkPaid}
        totalPlanned={summary.plannedExpense}
        totalReal={summary.realExpense}
      />


      {/* Dica */}
      <div className="bg-surface rounded-xl border border-border p-4 flex gap-3">
        <Repeat className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
        <p className="text-xs text-foreground-muted leading-relaxed">
          <strong className="text-foreground">Dica:</strong> Marque itens como <strong>Fixo mensal</strong> (aluguel, salário, assinaturas) para replicá-los automaticamente com o botão <em>"Replicar fixos do mês anterior"</em>. Os valores <strong>Reais</strong> são calculados automaticamente a partir dos seus lançamentos.
        </p>
      </div>
    </div>
  );
}
