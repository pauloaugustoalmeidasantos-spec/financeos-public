"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";

interface Props {
  goalId: string | null;
  currentAmount: number;
  targetAmount: number;
  name: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GoalContributionForm({ goalId, currentAmount, targetAmount, name, isOpen, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  
  const addContribution = trpc.goal.addContribution.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
      setAmount(0);
      setNote("");
    }
  });

  const remainingBefore = Math.max(0, targetAmount - currentAmount);
  const remainingAfter = Math.max(0, targetAmount - (currentAmount + amount));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Aporte</DialogTitle>
          <DialogDescription>
            Adicionar fundos para a meta: <strong className="text-gray-900">{name}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Valor do Aporte</label>
            <CurrencyInput 
              value={amount} 
              onChange={setAmount} 
              placeholder="R$ 0,00" 
              className="text-lg"
            />
            {amount > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Faltavam {formatCurrency(remainingBefore)}. Com este aporte faltarão apenas <span className="font-bold text-emerald-600">{formatCurrency(remainingAfter)}</span>.
              </p>
            )}
          </div>
          
          <div className="grid gap-2">
            <label className="text-sm font-medium">Observação (Opcional)</label>
            <Textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Bônus de fim de ano, economia extra..."
              className="resize-none"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="outline" onClick={onClose} disabled={addContribution.isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              if (goalId && amount > 0) {
                addContribution.mutate({ goalId, amount, note });
              }
            }} 
            disabled={addContribution.isPending || amount <= 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {addContribution.isPending ? "Processando..." : "Registrar Aporte"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
