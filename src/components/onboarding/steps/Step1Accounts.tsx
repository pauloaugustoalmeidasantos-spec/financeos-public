"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { trpc } from "@/lib/trpc-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/hooks/useUser";

interface Step1Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function Step1Accounts({ isOpen, onClose, onSuccess }: Step1Props) {
  const { profile } = useUser();
  const [monthlyIncome, setMonthlyIncome] = useState(profile?.monthlyIncome ? Number(profile.monthlyIncome) : 0);
  const [incomeType, setIncomeType] = useState<"SALARY" | "FREELANCE" | "BUSINESS" | "INVESTMENT" | "OTHER">(
    profile?.incomeType || "SALARY"
  );
  const [incomeStability, setIncomeStability] = useState<"STABLE" | "VARIABLE" | "MIXED">(
    profile?.incomeStability || "STABLE"
  );

  const updateProfile = trpc.user.updateProfile.useMutation();
  const completeStep = trpc.user.completeOnboarding.useMutation();

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        monthlyIncome,
        incomeType,
        incomeStability,
      });
      await completeStep.mutateAsync({ step: "accounts" });
      onSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Conecte suas contas</DialogTitle>
          <DialogDescription>
            Comece a mapear seus gastos e otimizar suas despesas informando sua renda principal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Renda Mensal</label>
            <CurrencyInput value={monthlyIncome} onChange={setMonthlyIncome} placeholder="R$ 0,00" />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Tipo de Renda</label>
            <Select value={incomeType} onValueChange={(val: any) => setIncomeType(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SALARY">Salário</SelectItem>
                <SelectItem value="FREELANCE">Freelance</SelectItem>
                <SelectItem value="BUSINESS">Negócio próprio</SelectItem>
                <SelectItem value="INVESTMENT">Investimentos</SelectItem>
                <SelectItem value="OTHER">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Estabilidade da Renda</label>
            <Select value={incomeStability} onValueChange={(val: any) => setIncomeStability(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a estabilidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STABLE">Estável</SelectItem>
                <SelectItem value="VARIABLE">Variável</SelectItem>
                <SelectItem value="MIXED">Mista (Fixo + Variável)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose} disabled={updateProfile.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateProfile.isPending || completeStep.isPending || monthlyIncome <= 0}>
            {updateProfile.isPending || completeStep.isPending ? "Salvando..." : "Salvar e Continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
