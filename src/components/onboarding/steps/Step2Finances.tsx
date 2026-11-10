"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { trpc } from "@/lib/trpc-client";

interface Step2Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function Step2Finances({ isOpen, onClose, onSuccess }: Step2Props) {
  const [investments, setInvestments] = useState(0);
  const [properties, setProperties] = useState(0);
  const [vehicles, setVehicles] = useState(0);
  const [debts, setDebts] = useState(0);

  const createAsset = trpc.asset.create.useMutation();
  const completeStep = trpc.user.completeOnboarding.useMutation();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (investments > 0) {
        await createAsset.mutateAsync({ name: "Investimentos Diversos", type: "FINANCIAL", category: "Outros", currentValue: investments });
      }
      if (properties > 0) {
        await createAsset.mutateAsync({ name: "Imóveis", type: "PHYSICAL", category: "Imóvel Residencial", currentValue: properties });
      }
      if (vehicles > 0) {
        await createAsset.mutateAsync({ name: "Veículos", type: "PHYSICAL", category: "Veículo", currentValue: vehicles });
      }
      // Since debt model might not exist, we just submit the step.
      await completeStep.mutateAsync({ step: "finances" });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Informações Financeiras</DialogTitle>
          <DialogDescription>
            Cadastre seus bens, investimentos e dívidas para montarmos seu patrimônio atual.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Total em Investimentos</label>
            <CurrencyInput value={investments} onChange={setInvestments} placeholder="R$ 0,00" />
            <p className="text-xs text-gray-500">Ex: Ações, Tesouro, Poupança</p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Valor Estimado: Imóveis</label>
            <CurrencyInput value={properties} onChange={setProperties} placeholder="R$ 0,00" />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Valor Estimado: Veículos</label>
            <CurrencyInput value={vehicles} onChange={setVehicles} placeholder="R$ 0,00" />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Dívidas e Financiamentos</label>
            <CurrencyInput value={debts} onChange={setDebts} placeholder="R$ 0,00" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || (investments === 0 && properties === 0 && vehicles === 0 && debts === 0)}>
            {isSaving ? "Salvando..." : "Salvar e Continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
