"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { trpc } from "@/lib/trpc-client";
import { Input } from "@/components/ui/input";

interface Step3Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function Step3Goals({ isOpen, onClose, onSuccess }: Step3Props) {
  const [goals, setGoals] = useState([
    { id: 1, name: "", targetAmount: 0, deadline: "" }
  ]);

  const createGoal = trpc.goal.create.useMutation();
  const completeStep = trpc.user.completeOnboarding.useMutation();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const goal of goals) {
        if (goal.name.trim() && goal.targetAmount > 0) {
          await createGoal.mutateAsync({
            name: goal.name,
            targetAmount: goal.targetAmount,
            deadline: goal.deadline ? new Date(goal.deadline) : undefined,
            type: "OTHER"
          });
        }
      }
      await completeStep.mutateAsync({ step: "goals" });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const addGoal = () => {
    if (goals.length < 3) {
      setGoals([...goals, { id: goals.length + 1, name: "", targetAmount: 0, deadline: "" }]);
    }
  };

  const updateGoal = (id: number, field: string, value: any) => {
    setGoals(goals.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crie seus projetos</DialogTitle>
          <DialogDescription>
            Defina seus principais objetivos de curto a longo prazo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          
          {goals.map((goal, idx) => (
            <div key={goal.id} className="p-4 border border-gray-200 rounded-xl space-y-4 relative">
              <div className="absolute top-[-10px] left-4 bg-white px-2 text-xs font-semibold text-indigo-600">
                PROJETO {idx + 1}
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Nome da Meta</label>
                <Input 
                  value={goal.name} 
                  onChange={(e: any) => updateGoal(goal.id, "name", e.target.value)} 
                  placeholder="Ex: Carro Novo, Viagem..."
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Valor Alvo</label>
                <CurrencyInput 
                  value={goal.targetAmount} 
                  onChange={(val) => updateGoal(goal.id, "targetAmount", val)} 
                  placeholder="R$ 0,00" 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Prazo (Opcional)</label>
                <Input 
                  type="date"
                  value={goal.deadline} 
                  onChange={(e: any) => updateGoal(goal.id, "deadline", e.target.value)} 
                />
              </div>
            </div>
          ))}

          {goals.length < 3 && (
            <Button variant="outline" className="border-dashed" onClick={addGoal}>
              + Adicionar Outro Projeto
            </Button>
          )}

        </div>
        <div className="flex justify-end gap-3 mt-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || (goals[0].name === "" || goals[0].targetAmount === 0)}>
            {isSaving ? "Salvando..." : "Salvar e Continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
