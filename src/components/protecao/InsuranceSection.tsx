"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShieldCheck, ShieldAlert } from "lucide-react";
import { InsuranceForm } from "./InsuranceForm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const INSURANCE_LABELS: Record<string, { label: string; icon: string; accent: string; bg: string }> = {
  VIDA:        { label: "Seguro de Vida",     icon: "❤️",  accent: "text-rose-600 dark:text-rose-400",    bg: "bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50" },
  AUTO:        { label: "Seguro Auto",        icon: "🚗",  accent: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50" },
  RESIDENCIAL: { label: "Seguro Residencial", icon: "🏠",  accent: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50" },
  SAUDE:       { label: "Plano de Saúde",     icon: "🏥",  accent: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50" },
  OUTRO:       { label: "Outro Seguro",       icon: "🛡️",  accent: "text-foreground-muted",    bg: "bg-surface-elevated border-border" },
};

interface InsuranceSectionProps {
  insurances: any[];
  onRefresh: () => void;
}

export function InsuranceSection({ insurances, onRefresh }: InsuranceSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<any | null>(null);
  const utils = trpc.useUtils();

  const deleteInsurance = trpc.protection.deleteInsurance.useMutation({
    onSuccess: () => {
      utils.protection.getSummary.invalidate();
      toast.success("Seguro removido.");
      onRefresh();
    },
    onError: () => toast.error("Erro ao remover seguro."),
  });

  const handleEdit = (ins: any) => {
    setEditingInsurance(ins);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingInsurance(null);
    setFormOpen(true);
  };

  const totalPremium = insurances.reduce((acc, i) => acc + (i.monthlyPremium || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-foreground">Meus Seguros</h3>
          {totalPremium > 0 && (
            <p className="text-xs text-foreground-muted mt-0.5">Total mensal: {formatCurrency(totalPremium)}</p>
          )}
        </div>
        <Button size="sm" onClick={handleNew} className="rounded-xl">
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Seguro
        </Button>
      </div>

      {insurances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-2xl bg-surface-elevated/50">
          <ShieldAlert className="w-10 h-10 text-foreground-subtle mb-3" />
          <p className="font-semibold text-foreground text-sm">Nenhum seguro cadastrado</p>
          <p className="text-xs text-foreground-muted mt-1 max-w-xs text-center">
            Seguros são fundamentais para proteger seu patrimônio e sua família.
          </p>
          <Button variant="link" onClick={handleNew} className="text-indigo-600 mt-2 text-sm">
            Cadastrar primeiro seguro
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insurances.map(ins => {
            const meta = INSURANCE_LABELS[ins.type] ?? INSURANCE_LABELS.OUTRO;
            const isExpiringSoon = ins.expiresAt && new Date(ins.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            return (
              <div key={ins.id} className={`p-4 rounded-2xl border ${meta.bg} group relative`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{meta.icon}</span>
                    <div>
                      <p className={`font-bold text-sm ${meta.accent}`}>{meta.label}</p>
                      {ins.insurer && <p className="text-xs text-foreground-muted">{ins.insurer}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground-muted hover:text-foreground" onClick={() => handleEdit(ins)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground-muted hover:text-red-500"
                      onClick={() => { if (confirm("Remover este seguro?")) deleteInsurance.mutate({ id: ins.id }); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {ins.coverageAmount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground-muted">Capital segurado</span>
                      <span className="font-semibold text-foreground">{formatCurrency(ins.coverageAmount)}</span>
                    </div>
                  )}
                  {ins.monthlyPremium > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground-muted">Prêmio mensal</span>
                      <span className="font-semibold text-foreground">{formatCurrency(ins.monthlyPremium)}</span>
                    </div>
                  )}
                  {ins.expiresAt && (
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground-muted">Vencimento</span>
                      <span className={`font-semibold ${isExpiringSoon ? "text-red-500" : "text-foreground"}`}>
                        {isExpiringSoon && "⚠️ "}
                        {format(new Date(ins.expiresAt), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>

                {ins.notes && (
                  <p className="text-[10px] text-foreground-subtle mt-2 italic border-t border-border pt-2">{ins.notes}</p>
                )}

                <ShieldCheck className={`absolute bottom-3 right-3 w-4 h-4 ${meta.accent} opacity-20`} />
              </div>
            );
          })}
        </div>
      )}

      <InsuranceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        insurance={editingInsurance}
        onSuccess={onRefresh}
      />
    </div>
  );
}
