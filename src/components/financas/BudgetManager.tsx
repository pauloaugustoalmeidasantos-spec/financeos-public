"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CategoryManager } from "./CategoryManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Target, Loader2, PlusCircle } from "lucide-react";

interface BudgetManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: Date;
}

export function BudgetManager({ open, onOpenChange, month }: BudgetManagerProps) {
  const selectedMonth = month.getMonth() + 1;
  const selectedYear = month.getFullYear();
  
  const utils = trpc.useUtils();
  const { data: categories = [] } = trpc.category.list.useQuery({ type: "EXPENSE" });
  const { data: budgets = [], isLoading } = trpc.budget.list.useQuery({ 
    month: selectedMonth, 
    year: selectedYear 
  });

  const upsertMutation = trpc.budget.upsert.useMutation({
    onSuccess: () => {
      utils.budget.list.invalidate();
      toast.success("Orçamento atualizado!");
    }
  });

  const [editingValues, setEditingValues] = useState<Record<string, number>>({});
  const [managerOpen, setManagerOpen] = useState(false);

  const handleSave = async (categoryId: string) => {
    const amount = editingValues[categoryId];
    if (amount === undefined) return;

    await upsertMutation.mutateAsync({
      categoryId,
      amount,
      month: selectedMonth,
      year: selectedYear
    });
    
    // Clear local state for this category after save
    const newValues = { ...editingValues };
    delete newValues[categoryId];
    setEditingValues(newValues);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-6">
        <DialogHeader>
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            <Target className="w-6 h-6 text-indigo-600" />
          </div>
          <DialogTitle className="text-2xl font-bold">Orçamentos Mensais</DialogTitle>
          <DialogDescription>
            Defina quanto você planeja gastar em cada categoria para este mês.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : (
            categories.map(cat => {
              const b = budgets.find(x => x.categoryId === cat.id);
              const currentLimit = b?.amount || 0;
              const isEditing = editingValues[cat.id] !== undefined;
              const displayValue = isEditing ? editingValues[cat.id] : currentLimit;

              return (
                <div key={cat.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white shadow-sm border border-gray-100">
                      {cat.icon || "📁"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{cat.name}</p>
                      <p className="text-[10px] text-gray-500 font-medium">DEFINIDO: {formatCurrency(currentLimit)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">R$</span>
                      <Input 
                        type="number"
                        className="w-24 h-9 pl-8 bg-white border-gray-200 focus:ring-indigo-500 rounded-xl text-sm font-semibold"
                        value={displayValue === 0 && !isEditing ? "" : displayValue}
                        placeholder="0,00"
                        onChange={(e) => setEditingValues({ ...editingValues, [cat.id]: Number(e.target.value) })}
                      />
                    </div>
                    {isEditing && (
                      <Button 
                        size="sm" 
                        className="h-9 px-3 rounded-xl bg-gray-900 hover:bg-black transition-all"
                        onClick={() => handleSave(cat.id)}
                        disabled={upsertMutation.isPending}
                      >
                        {upsertMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-8 flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setManagerOpen(true)} 
            className="rounded-xl border-dashed border-gray-300 text-gray-600 hover:text-gray-900"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl text-gray-500">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <CategoryManager open={managerOpen} onOpenChange={setManagerOpen} defaultType="EXPENSE" />
    </>
  );
}
