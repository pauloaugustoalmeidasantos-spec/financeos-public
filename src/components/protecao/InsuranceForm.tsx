"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Loader2 } from "lucide-react";

const INSURANCE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  VIDA: { label: "Seguro de Vida", icon: "❤️", color: "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50" },
  AUTO: { label: "Seguro Auto", icon: "🚗", color: "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50" },
  RESIDENCIAL: { label: "Seguro Residencial", icon: "🏠", color: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50" },
  SAUDE: { label: "Plano de Saúde", icon: "🏥", color: "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50" },
  OUTRO: { label: "Outro Seguro", icon: "🛡️", color: "bg-surface-elevated border-border" },
};

interface InsuranceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insurance?: any | null;
  onSuccess: () => void;
}

export function InsuranceForm({ open, onOpenChange, insurance, onSuccess }: InsuranceFormProps) {
  const isEditing = !!insurance;
  const utils = trpc.useUtils();

  const [type, setType] = useState<string>(insurance?.type ?? "VIDA");
  const [insurer, setInsurer] = useState(insurance?.insurer ?? "");
  const [coverageAmount, setCoverageAmount] = useState<number>(insurance?.coverageAmount ?? 0);
  const [monthlyPremium, setMonthlyPremium] = useState<number>(insurance?.monthlyPremium ?? 0);
  const [expiresAt, setExpiresAt] = useState(insurance?.expiresAt ? insurance.expiresAt.split("T")[0] : "");
  const [notes, setNotes] = useState(insurance?.notes ?? "");

  const upsert = trpc.protection.upsertInsurance.useMutation({
    onSuccess: () => {
      utils.protection.getSummary.invalidate();
      toast.success(isEditing ? "Seguro atualizado!" : "Seguro cadastrado!");
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error("Erro ao salvar seguro."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsert.mutate({
      id: insurance?.id,
      type: type as any,
      insurer: insurer || undefined,
      coverageAmount: coverageAmount || undefined,
      monthlyPremium: monthlyPremium || undefined,
      expiresAt: expiresAt || undefined,
      notes: notes || undefined,
    });
  };

  const meta = INSURANCE_LABELS[type] ?? INSURANCE_LABELS.OUTRO;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-3xl p-6">
        <DialogHeader>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 border ${meta.color} text-2xl`}>
            {meta.icon}
          </div>
          <DialogTitle className="text-xl font-bold">{isEditing ? "Editar Seguro" : "Novo Seguro"}</DialogTitle>
          <DialogDescription>Cadastre os dados do seu seguro para monitorar coberturas.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Tipo de Seguro</Label>
            <Select value={type} onValueChange={(v) => v && setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INSURANCE_LABELS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Seguradora / Operadora</Label>
            <Input value={insurer} onChange={e => setInsurer(e.target.value)} placeholder="Ex: Porto Seguro, Bradesco..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Capital Segurado (R$)</Label>
              <CurrencyInput value={coverageAmount} onChange={setCoverageAmount} />
            </div>
            <div className="space-y-1.5">
              <Label>Prêmio Mensal (R$)</Label>
              <CurrencyInput value={monthlyPremium} onChange={setMonthlyPremium} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Vencimento</Label>
            <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Observações (opcional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Cobre invalidez, franquia R$ 2.000..." />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
