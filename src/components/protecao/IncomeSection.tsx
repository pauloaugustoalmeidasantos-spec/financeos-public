"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { formatCurrency } from "@/lib/formatters";
import { CalendarDays, Loader2, Info, Plus, Trash2, Pencil, Check, X, TrendingUp, RefreshCw } from "lucide-react";

const INCOME_TYPE_LABELS: Record<string, string> = {
  SALARY: "Salário CLT",
  FREELANCE: "Freelance / Autônomo",
  BUSINESS: "Pró-labore / Negócio",
  INVESTMENT: "Rendimentos de Investimentos",
  OTHER: "Outros",
};

const STABILITY_LABELS: Record<string, { label: string; color: string }> = {
  STABLE:   { label: "🟢 Alta — CLT / Servidor Público",     color: "text-emerald-700" },
  MIXED:    { label: "🟡 Média — PJ / Profissional Liberal", color: "text-amber-700" },
  VARIABLE: { label: "🔴 Baixa — Autônomo / Comissionado",  color: "text-red-600" },
};

const PAY_DAY_TYPE_LABELS: Record<string, string> = {
  DAY_OF_MONTH: "Dia fixo do mês",
  BUSINESS_DAY: "N-ésimo dia útil",
};

interface IncomeSectionProps {
  profile: any | null;
  nextPaymentDate: string | null;
  onRefresh: () => void;
}

export function IncomeSection({ profile, nextPaymentDate, onRefresh }: IncomeSectionProps) {
  const utils = trpc.useUtils();

  const [monthlyIncome, setMonthlyIncome] = useState(profile?.monthlyIncome ?? 0);
  const [incomeType, setIncomeType] = useState(profile?.incomeType ?? "SALARY");
  const [incomeStability, setIncomeStability] = useState(profile?.incomeStability ?? "STABLE");
  const [incomePayDay, setIncomePayDay] = useState<number>(profile?.incomePayDay ?? 5);
  const [incomePayDayType, setIncomePayDayType] = useState<"DAY_OF_MONTH" | "BUSINESS_DAY">(
    (profile?.incomePayDayType ?? "DAY_OF_MONTH") as any
  );
  const [syncToTransactions] = useState(false);
  const [additionalIncomes, setAdditionalIncomes] = useState<any[]>(profile?.additionalIncomes ?? []);

  // Inline editing for additional incomes
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState(0);
  const editNameRef = useRef<HTMLInputElement>(null);

  // Inline editing for main income in the saved card
  const [editingMainIncome, setEditingMainIncome] = useState(false);
  const [editMainAmount, setEditMainAmount] = useState(0);

  // New additional income form
  const [newAddName, setNewAddName] = useState("");
  const [newAddAmount, setNewAddAmount] = useState(0);

  useEffect(() => {
    if (profile) {
      setMonthlyIncome(profile.monthlyIncome);
      setIncomeType(profile.incomeType);
      setIncomeStability(profile.incomeStability);
      setIncomePayDay(profile.incomePayDay ?? 5);
      setIncomePayDayType(profile.incomePayDayType ?? "DAY_OF_MONTH");
      setAdditionalIncomes(profile.additionalIncomes ?? []);
    }
  }, [profile]);

  const saveConfig = trpc.protection.saveIncomeConfig.useMutation({
    onSuccess: () => {
      utils.protection.getSummary.invalidate();
      utils.transaction.list.invalidate();
      toast.success("Configuração de renda salva!");
      setEditingMainIncome(false);
      onRefresh();
    },
    onError: () => toast.error("Erro ao salvar configuração."),
  });

  const handleSaveMainIncomeInline = () => {
    if (editMainAmount <= 0) { toast.error("Informe um valor válido."); return; }
    setMonthlyIncome(editMainAmount);
    saveConfig.mutate({
      monthlyIncome: editMainAmount,
      incomeType: incomeType as any,
      incomeStability: incomeStability as any,
      incomePayDay,
      incomePayDayType,
      additionalIncomes,
      syncToTransactions: false,
    });
  };

  const handleAddAdditional = () => {
    if (!newAddName.trim() || newAddAmount <= 0) return;
    const updated = [...additionalIncomes, { name: newAddName.trim(), amount: newAddAmount }];
    setAdditionalIncomes(updated);
    setNewAddName("");
    setNewAddAmount(0);
    // Auto-save when adding
    if (monthlyIncome > 0) {
      saveConfig.mutate({
        monthlyIncome,
        incomeType: incomeType as any,
        incomeStability: incomeStability as any,
        incomePayDay,
        incomePayDayType,
        additionalIncomes: updated,
        syncToTransactions: false,
      });
    }
  };

  const handleStartEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditName(additionalIncomes[idx].name);
    setEditAmount(Number(additionalIncomes[idx].amount));
    setTimeout(() => editNameRef.current?.focus(), 50);
  };

  const handleCancelEdit = () => {
    setEditingIdx(null);
    setEditName("");
    setEditAmount(0);
  };

  const handleConfirmEdit = (idx: number) => {
    if (!editName.trim() || editAmount <= 0) {
      toast.error("Informe nome e valor válidos.");
      return;
    }
    const updated = additionalIncomes.map((inc: any, i: number) =>
      i === idx ? { name: editName.trim(), amount: editAmount } : inc
    );
    setAdditionalIncomes(updated);
    setEditingIdx(null);
    // Auto-save after edit
    saveConfig.mutate({
      monthlyIncome,
      incomeType: incomeType as any,
      incomeStability: incomeStability as any,
      incomePayDay,
      incomePayDayType,
      additionalIncomes: updated,
      syncToTransactions: false,
    });
  };

  const handleRemoveAdditionalAndSave = (idx: number) => {
    const updated = additionalIncomes.filter((_: any, i: number) => i !== idx);
    setAdditionalIncomes(updated);
    if (editingIdx === idx) handleCancelEdit();
    if (monthlyIncome > 0) {
      saveConfig.mutate({
        monthlyIncome,
        incomeType: incomeType as any,
        incomeStability: incomeStability as any,
        incomePayDay,
        incomePayDayType,
        additionalIncomes: updated,
        syncToTransactions: false,
      });
    }
  };

  const handleSave = () => {
    if (monthlyIncome <= 0) {
      toast.error("Informe o valor da renda principal.");
      return;
    }
    saveConfig.mutate({
      monthlyIncome,
      incomeType: incomeType as any,
      incomeStability: incomeStability as any,
      incomePayDay,
      incomePayDayType,
      additionalIncomes,
      syncToTransactions,
    });
  };

  // Saved values from server
  const savedMonthlyIncome = profile?.monthlyIncome ?? 0;
  const savedAdditionalIncomes: any[] = profile?.additionalIncomes ?? [];
  const savedAdditionalTotal = savedAdditionalIncomes.reduce((a: number, i: any) => a + (Number(i.amount) || 0), 0);
  const savedTotalIncome = savedMonthlyIncome + savedAdditionalTotal;

  return (
    <div className="space-y-5">

      {/* ── Income summary — shows SAVED values with inline edit ── */}
      <div className={`rounded-2xl p-5 shadow-sm ${
        savedTotalIncome > 0
          ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white"
          : "bg-surface-elevated border border-dashed border-border"
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
              savedTotalIncome > 0 ? "opacity-70" : "text-foreground-muted"
            }`}>💾 Renda mensal total salva</p>

            {/* Valor total — editável inline */}
            {editingMainIncome ? (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-white/20 rounded-xl overflow-hidden border border-white/30">
                  <CurrencyInput
                    value={editMainAmount}
                    onChange={setEditMainAmount}
                    className="text-2xl font-bold bg-transparent text-white border-none"
                  />
                </div>
                <button
                  onClick={handleSaveMainIncomeInline}
                  disabled={saveConfig.isPending}
                  className="h-10 w-10 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
                  title="Confirmar"
                >
                  {saveConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setEditingMainIncome(false)}
                  className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 transition-colors"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className={`text-3xl font-bold ${savedTotalIncome > 0 ? "" : "text-foreground-subtle"}`}>
                {savedTotalIncome > 0 ? formatCurrency(savedTotalIncome) : "Nenhuma renda configurada"}
              </p>
            )}
          </div>

          {/* Botão editar renda principal */}
          {savedTotalIncome > 0 && !editingMainIncome && (
            <button
              onClick={() => { setEditMainAmount(savedMonthlyIncome); setEditingMainIncome(true); }}
              className="mt-1 h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center shrink-0 transition-colors"
              title="Editar renda principal"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Breakdown of all income sources */}
        {savedTotalIncome > 0 && !editingMainIncome && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-sm opacity-90">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                {INCOME_TYPE_LABELS[profile?.incomeType] ?? "Renda Principal"}
              </span>
              <span className="font-bold">{formatCurrency(savedMonthlyIncome)}</span>
            </div>
            {savedAdditionalIncomes.map((inc: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-sm opacity-80">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3" />
                  {inc.name}
                  <span className="text-[10px] opacity-60 font-medium">recorrente</span>
                </span>
                <span className="font-semibold">{formatCurrency(Number(inc.amount))}</span>
              </div>
            ))}
          </div>
        )}

        {savedTotalIncome === 0 && (
          <p className="text-xs text-foreground-subtle mt-1">Configure e salve sua renda abaixo.</p>
        )}
      </div>

      {/* ── Next payment date banner ── */}
      {nextPaymentDate && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl dark:bg-emerald-950/20 dark:border-emerald-800">
          <CalendarDays className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Próximo pagamento</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {new Date(nextPaymentDate + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long", day: "numeric", month: "long"
              })}
            </p>
          </div>
        </div>
      )}

      {/* ── Main income form ── */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
        <h4 className="font-bold text-foreground text-sm">Renda Principal</h4>

        <div className="space-y-1.5">
          <Label>Valor líquido mensal (R$)</Label>
          <CurrencyInput value={monthlyIncome} onChange={setMonthlyIncome} className="text-2xl font-bold" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Tipo de renda</Label>
            <Select value={incomeType} onValueChange={(v) => v && setIncomeType(v)}>
              <SelectTrigger>
                <SelectValue>{INCOME_TYPE_LABELS[incomeType] ?? incomeType}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INCOME_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Estabilidade da renda</Label>
            <Select value={incomeStability} onValueChange={(v) => v && setIncomeStability(v)}>
              <SelectTrigger>
                <SelectValue>
                  <span className={STABILITY_LABELS[incomeStability]?.color ?? ""}>
                    {STABILITY_LABELS[incomeStability]?.label ?? incomeStability}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STABILITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    <span className={v.color}>{v.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-foreground-subtle flex items-start gap-1">
              <Info className="w-3 h-3 mt-px shrink-0" />
              Afeta o multiplicador da reserva de emergência.
            </p>
          </div>
        </div>

        {/* Pay day */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-border">
          <div className="space-y-1.5">
            <Label>Tipo de data de pagamento</Label>
            <Select value={incomePayDayType} onValueChange={(v: any) => v && setIncomePayDayType(v)}>
              <SelectTrigger>
                <SelectValue>{PAY_DAY_TYPE_LABELS[incomePayDayType] ?? incomePayDayType}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAY_OF_MONTH">Dia fixo do mês</SelectItem>
                <SelectItem value="BUSINESS_DAY">N-ésimo dia útil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>
              {incomePayDayType === "BUSINESS_DAY" ? "Qual dia útil?" : "Qual dia do mês?"}
            </Label>
            <Input
              type="number"
              min={1}
              max={incomePayDayType === "BUSINESS_DAY" ? 22 : 31}
              value={incomePayDay}
              onChange={e => setIncomePayDay(Number(e.target.value))}
            />
            <p className="text-[10px] text-foreground-subtle">
              {incomePayDayType === "BUSINESS_DAY"
                ? "Feriados nacionais são considerados automaticamente."
                : "Se cair em fds/feriado, será ajustado para o próximo dia útil."}
            </p>
          </div>
        </div>

        <Button className="w-full" onClick={handleSave} disabled={saveConfig.isPending}>
          {saveConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "💾 Salvar configuração de renda"}
        </Button>
      </div>

      {/* ── Additional incomes — with inline editing ── */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
        <div>
          <h4 className="font-bold text-foreground text-sm">Outras Fontes de Renda</h4>
          <p className="text-xs text-foreground-muted mt-0.5">
            Freelances, aluguéis, dividendos, pensão, etc. Entram no cálculo da reserva de emergência.
          </p>
        </div>

        {/* List of additional incomes */}
        {additionalIncomes.length > 0 && (
          <div className="space-y-2">
            {additionalIncomes.map((inc: any, idx: number) => (
              <div key={idx}>
                {editingIdx === idx ? (
                  /* ── Edit mode ── */
                  <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <Input
                      ref={editNameRef}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Nome da renda"
                      className="flex-1 h-8 text-sm"
                      onKeyDown={e => { if (e.key === "Enter") handleConfirmEdit(idx); if (e.key === "Escape") handleCancelEdit(); }}
                    />
                    <div className="w-32 shrink-0">
                      <CurrencyInput value={editAmount} onChange={setEditAmount} />
                    </div>
                    <button
                      onClick={() => handleConfirmEdit(idx)}
                      disabled={saveConfig.isPending}
                      className="h-8 w-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
                      title="Confirmar edição"
                    >
                      {saveConfig.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="h-8 w-8 rounded-lg bg-surface-elevated hover:bg-border text-foreground-muted flex items-center justify-center shrink-0 transition-colors"
                      title="Cancelar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* ── View mode ── */
                  <div className="group flex items-center justify-between p-3 bg-surface-elevated rounded-xl border border-border hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{inc.name}</p>
                        <p className="text-xs text-foreground-muted flex items-center gap-1">
                          <span className="text-emerald-600 font-bold">{formatCurrency(Number(inc.amount))}</span>
                          <span>/ mês • recorrente</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(idx)}
                        className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveAdditionalAndSave(idx)}
                        className="h-7 w-7 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {additionalIncomes.length === 0 && (
          <div className="text-center py-4 text-foreground-muted">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Nenhuma renda adicional cadastrada.</p>
            <p className="text-xs opacity-70">Adicione fontes extras abaixo.</p>
          </div>
        )}

        {/* Add new additional income */}
        <div className="pt-3 border-t border-border space-y-2">
          <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">+ Adicionar nova fonte de renda</p>
          <div className="flex gap-2">
            <Input
              placeholder="Nome (ex: Aluguel, Dividendos...)"
              value={newAddName}
              onChange={e => setNewAddName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddAdditional()}
              className="flex-1"
            />
            <div className="w-36 shrink-0">
              <CurrencyInput value={newAddAmount} onChange={setNewAddAmount} />
            </div>
            <Button
              size="icon"
              variant="outline"
              className="shrink-0"
              onClick={handleAddAdditional}
              disabled={!newAddName.trim() || newAddAmount <= 0 || saveConfig.isPending}
              title="Adicionar e salvar"
            >
              {saveConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-foreground-subtle">
            Pressione <kbd className="bg-border px-1 rounded text-[10px]">Enter</kbd> ou clique no + para adicionar. Salvo automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
