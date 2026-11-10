"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { format } from "date-fns";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Table2, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { toLocalMidnight } from "@/lib/date-utils";

interface BulkRow {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: string; // raw string input for better UX
  description: string;
  categoryId: string;
  transactionDate: string; // yyyy-MM-dd
}

function createEmptyRow(defaultDate: string): BulkRow {
  return {
    id: crypto.randomUUID(),
    type: "EXPENSE",
    amount: "",
    description: "",
    categoryId: "",
    transactionDate: defaultDate,
  };
}

interface BulkTransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: Date;
}

export function BulkTransactionForm({ open, onOpenChange, defaultDate }: BulkTransactionFormProps) {
  const defaultDateStr = format(defaultDate, "yyyy-MM-dd");
  const [rows, setRows] = useState<BulkRow[]>(() => 
    Array.from({ length: 5 }, () => createEmptyRow(defaultDateStr))
  );

  const utils = trpc.useUtils();
  const { data: categories = [] } = trpc.category.list.useQuery({});
  const bulkCreate = trpc.transaction.bulkCreate.useMutation();

  const tableRef = useRef<HTMLDivElement>(null);

  // Reset rows when dialog opens
  useEffect(() => {
    if (open) {
      const dateStr = format(defaultDate, "yyyy-MM-dd");
      setRows(Array.from({ length: 5 }, () => createEmptyRow(dateStr)));
    }
  }, [open, defaultDate]);

  const updateRow = useCallback((id: string, field: keyof BulkRow, value: any) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, createEmptyRow(defaultDateStr)]);
    // Scroll to bottom of table after adding
    setTimeout(() => {
      tableRef.current?.scrollTo({ top: tableRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, [defaultDateStr]);

  const addMultipleRows = useCallback((count: number) => {
    setRows(prev => [...prev, ...Array.from({ length: count }, () => createEmptyRow(defaultDateStr))]);
  }, [defaultDateStr]);

  const removeRow = useCallback((id: string) => {
    setRows(prev => {
      if (prev.length <= 1) return prev; // keep at least 1 row
      return prev.filter(r => r.id !== id);
    });
  }, []);

  const duplicateRow = useCallback((id: string) => {
    setRows(prev => {
      const source = prev.find(r => r.id === id);
      if (!source) return prev;
      const idx = prev.indexOf(source);
      const clone = { ...source, id: crypto.randomUUID() };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }, []);

  // Parse amount from Brazilian currency string
  const parseAmount = (raw: string): number => {
    if (!raw) return 0;
    // Handle both "1.500,00" and "1500.00" formats
    const cleaned = raw.replace(/\s/g, "");
    // If has comma as decimal separator (Brazilian format)
    if (cleaned.includes(",")) {
      return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
    }
    return parseFloat(cleaned) || 0;
  };

  // Count valid rows
  const validRows = rows.filter(r => parseAmount(r.amount) > 0 && r.transactionDate);
  const totalAmount = validRows.reduce((acc, r) => {
    const amount = parseAmount(r.amount);
    return r.type === "INCOME" ? acc + amount : acc - amount;
  }, 0);
  const incomeCount = validRows.filter(r => r.type === "INCOME").length;
  const expenseCount = validRows.filter(r => r.type === "EXPENSE").length;

  const handleSubmit = async () => {
    if (validRows.length === 0) {
      toast.error("Preencha pelo menos 1 lançamento com valor e data.");
      return;
    }

    const transactions = validRows.map(r => ({
      amount: parseAmount(r.amount),
      type: r.type as "INCOME" | "EXPENSE",
      categoryId: r.categoryId || null,
      description: r.description || undefined,
      transactionDate: toLocalMidnight(r.transactionDate),
    }));

    try {
      const result = await bulkCreate.mutateAsync({ transactions });
      toast.success(`${result.count} lançamentos criados com sucesso!`);
      utils.transaction.list.invalidate();
      utils.transaction.getMonthlySummary.invalidate();
      utils.transaction.getBiggestExpenses.invalidate();
      utils.transaction.getMonthlyComparison.invalidate();
      utils.budget.list.invalidate();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao criar lançamentos em massa.");
    }
  };

  const incomeCategories = categories.filter(c => c.type === "INCOME");
  const expenseCategories = categories.filter(c => c.type === "EXPENSE");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] md:max-w-[900px] max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Table2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">Lançamento em Massa</DialogTitle>
              <DialogDescription className="text-foreground-muted mt-0.5">
                Preencha como uma planilha. Apenas linhas com valor serão salvas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Summary Bar */}
        <div className="px-6 py-3 bg-surface-elevated/50 border-b border-border flex items-center gap-6 text-sm shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-foreground-muted">Válidos:</span>
            <span className="font-semibold text-foreground">{validRows.length}</span>
          </div>
          {incomeCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-foreground-muted">{incomeCount} receitas</span>
            </div>
          )}
          {expenseCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-foreground-muted">{expenseCount} despesas</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-foreground-muted">Impacto:</span>
            <span className={`font-bold ${totalAmount >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {totalAmount >= 0 ? "+" : ""}{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalAmount)}
            </span>
          </div>
        </div>

        {/* Spreadsheet Table */}
        <div ref={tableRef} className="flex-1 overflow-auto px-2 md:px-4 py-3">
          <div className="min-w-[750px]">
            {/* Table Header */}
            <div className="grid grid-cols-[40px_100px_130px_1fr_180px_130px_40px_40px] gap-1.5 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted sticky top-0 bg-background z-10 border-b border-border">
              <span className="text-center">#</span>
              <span>Tipo</span>
              <span>Valor (R$)</span>
              <span>Descrição</span>
              <span>Categoria</span>
              <span>Data</span>
              <span></span>
              <span></span>
            </div>

            {/* Rows */}
            <div className="space-y-0.5">
              {rows.map((row, index) => {
                const catList = row.type === "INCOME" ? incomeCategories : expenseCategories;
                const hasValue = parseAmount(row.amount) > 0;
                const rowBg = hasValue 
                  ? row.type === "INCOME" ? "bg-emerald-50/40 dark:bg-emerald-950/20" : "bg-red-50/40 dark:bg-red-950/20"
                  : "bg-surface/50";

                return (
                  <div
                    key={row.id}
                    className={`grid grid-cols-[40px_100px_130px_1fr_180px_130px_40px_40px] gap-1.5 px-2 py-1 items-center rounded-lg transition-colors ${rowBg} hover:bg-surface-elevated/60 group`}
                  >
                    {/* # */}
                    <span className="text-center text-xs text-foreground-subtle font-mono tabular-nums">
                      {index + 1}
                    </span>

                    {/* Type */}
                    <Select value={row.type} onValueChange={(v: any) => updateRow(row.id, "type", v)}>
                      <SelectTrigger className="h-8 text-xs border-border/50 bg-card/80 rounded-lg px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXPENSE">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            Despesa
                          </span>
                        </SelectItem>
                        <SelectItem value="INCOME">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Receita
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Amount */}
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={row.amount}
                      onChange={(e) => updateRow(row.id, "amount", e.target.value)}
                      className={`h-8 text-xs font-semibold tabular-nums border-border/50 bg-card/80 rounded-lg px-2 text-right ${
                        hasValue ? (row.type === "INCOME" ? "text-emerald-600" : "text-red-600") : "text-foreground-muted"
                      }`}
                    />

                    {/* Description */}
                    <Input
                      type="text"
                      placeholder="Descrição (opcional)"
                      value={row.description}
                      onChange={(e) => updateRow(row.id, "description", e.target.value)}
                      className="h-8 text-xs border-border/50 bg-card/80 rounded-lg px-2"
                    />

                    {/* Category */}
                    <Select
                      value={row.categoryId || "__none__"}
                      onValueChange={(v: any) => updateRow(row.id, "categoryId", v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="h-8 text-xs border-border/50 bg-card/80 rounded-lg px-2">
                        <SelectValue placeholder="Sem categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem categoria</SelectItem>
                        {catList.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-1.5">
                              {c.icon && <span className="text-xs">{c.icon}</span>}
                              {c.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Date */}
                    <Input
                      type="date"
                      value={row.transactionDate}
                      onChange={(e) => updateRow(row.id, "transactionDate", e.target.value)}
                      className="h-8 text-xs border-border/50 bg-card/80 rounded-lg px-2"
                    />

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={() => duplicateRow(row.id)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-foreground-subtle hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
                      title="Duplicar linha"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-foreground-subtle hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remover linha"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add Row Buttons */}
            <div className="flex items-center gap-2 px-2 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-lg gap-1.5"
                onClick={addRow}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar linha
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-foreground-muted hover:text-foreground rounded-lg"
                onClick={() => addMultipleRows(5)}
              >
                +5 linhas
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-foreground-muted hover:text-foreground rounded-lg"
                onClick={() => addMultipleRows(10)}
              >
                +10 linhas
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border shrink-0 flex flex-col sm:flex-row gap-3">
          {validRows.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-foreground-muted mr-auto">
              <AlertCircle className="w-4 h-4" />
              Preencha ao menos 1 linha com valor para salvar.
            </div>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={validRows.length === 0 || bulkCreate.isPending}
              className="min-w-[160px]"
            >
              {bulkCreate.isPending
                ? "Salvando..."
                : `Salvar ${validRows.length} lançamento${validRows.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
