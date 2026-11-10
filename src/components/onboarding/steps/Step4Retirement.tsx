"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { trpc } from "@/lib/trpc-client";
import { Slider } from "@/components/ui/slider";
import { useUser } from "@/hooks/useUser";

interface Step4Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function Step4Retirement({ isOpen, onClose, onSuccess }: Step4Props) {
  const { profile } = useUser();
  const [retirementAge, setRetirementAge] = useState(profile?.retirementAge || 65);
  const [desiredMonthlyIncome, setDesiredMonthlyIncome] = useState(profile?.desiredMonthlyIncome ? Number(profile.desiredMonthlyIncome) : 0);
  const [monthlyInvestment, setMonthlyInvestment] = useState(profile?.monthlyInvestment ? Number(profile.monthlyInvestment) : 0);

  const updateProfile = trpc.user.updateProfile.useMutation();
  const completeStep = trpc.user.completeOnboarding.useMutation();

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        retirementAge,
        desiredMonthlyIncome,
        monthlyInvestment,
      });
      await completeStep.mutateAsync({ step: "retirement" });
      onSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Planeje sua aposentadoria</DialogTitle>
          <DialogDescription>
            Defina sua visão de independência financeira para calcularmos suas projeções.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Idade de aposentadoria pretendida</label>
              <span className="font-bold text-indigo-600">{retirementAge} anos</span>
            </div>
            <Slider 
              value={[retirementAge]} 
              min={18} 
              max={150} 
              step={1} 
              onValueChange={(_e: any, vals: any) => setRetirementAge(Array.isArray(vals) ? vals[0] : vals)} 
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Renda mensal desejada na aposentadoria</label>
            <CurrencyInput value={desiredMonthlyIncome} onChange={setDesiredMonthlyIncome} placeholder="R$ 0,00" />
            <p className="text-xs text-gray-500">Quanto você quer receber por mês de renda passiva?</p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Aporte mensal disponível (Hoje)</label>
            <CurrencyInput value={monthlyInvestment} onChange={setMonthlyInvestment} placeholder="R$ 0,00" />
            <p className="text-xs text-gray-500">Quanto você consegue investir todos os meses?</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose} disabled={updateProfile.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateProfile.isPending || completeStep.isPending || desiredMonthlyIncome === 0}>
            {updateProfile.isPending || completeStep.isPending ? "Avaliando..." : "Finalizar Configuração"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
