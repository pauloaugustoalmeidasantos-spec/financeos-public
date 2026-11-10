"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, CheckCircle2, Loader2, SlidersHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
const uuid = () => crypto.randomUUID();

interface EssentialExpense {
  id: string;
  name: string;
  amount: number;
  categoryId?: string;
}

interface EssentialExpensesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: EssentialExpense[];
  avgMonthlyExpense: number;
  onSuccess: () => void;
}

export function EssentialExpensesManager({
  open,
  onOpenChange,
  current,
  avgMonthlyExpense,
  onSuccess,
}: EssentialExpensesManagerProps) {
  const utils = trpc.useUtils();
  const [items, setItems] = useState<EssentialExpense[]>(
    current.length > 0 ? current : []
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState(0);

  const saveMutation = trpc.protection.saveEssentialExpenses.useMutation({
    onSuccess: () => {
      utils.protection.getSummary.invalidate();
      toast.success("Gastos essenciais salvos!");
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  const addItem = () => {
    if (!newName.trim() || newAmount <= 0) return;
    setItems(prev => [...prev, { id: uuid(), name: newName.trim(), amount: newAmount }]);
    setNewName("");
    setNewAmount(0);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateItem = (id: string, field: "name" | "amount", value: any) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const total = items.reduce((acc, i) => acc + i.amount, 0);

  const handleUseAverage = () => {
    setItems([{ id: uuid(), name: "Total médio de gastos (últimos 3 meses)", amount: Math.round(avgMonthlyExpense) }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="w-12 h-12 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center mb-3 text-2xl">
            🧾
          </div>
          <DialogTitle className="text-xl font-bold">Gastos Essenciais</DialogTitle>
          <DialogDescription>
            Defina exatamente quanto você gasta por mês no essencial. Isso determina sua meta de reserva de emergência.
          </DialogDescription>
        </DialogHeader>

        {/* Average banner */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-indigo-700">Média dos últimos 3 meses</p>
            <p className="text-lg font-bold text-indigo-900">{formatCurrency(avgMonthlyExpense)}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs"
            onClick={handleUseAverage}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
            Usar esta base
          </Button>
        </div>

        {/* Items list */}
        <div className="space-y-2 mt-1">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 group">
              {editingId === item.id ? (
                <>
                  <Input
                    className="flex-1 h-8 text-sm"
                    value={item.name}
                    onChange={e => updateItem(item.id, "name", e.target.value)}
                  />
                  <div className="w-28">
                    <CurrencyInput value={item.amount} onChange={val => updateItem(item.id, "amount", val)} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => setEditingId(null)}>
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.amount)}/mês</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400" onClick={() => setEditingId(item.id)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => removeItem(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new item */}
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <Label className="text-xs font-semibold text-gray-500 uppercase">Adicionar gasto</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Nome (ex: Aluguel, Mercado...)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addItem()}
              className="flex-1"
            />
            <div className="w-32">
              <CurrencyInput value={newAmount} onChange={setNewAmount} />
            </div>
            <Button
              size="icon"
              className="bg-gray-900 hover:bg-black shrink-0"
              onClick={addItem}
              disabled={!newName.trim() || newAmount <= 0}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Total */}
        {items.length > 0 && (
          <div className="bg-gray-900 text-white rounded-2xl p-4 flex justify-between items-center">
            <span className="text-sm font-medium">Total Essencial/mês</span>
            <span className="text-xl font-bold">{formatCurrency(total)}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            className="flex-1 bg-gray-900"
            onClick={() => saveMutation.mutate({ essentialExpenses: items })}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
