"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { EssentialExpensesManager } from "./EssentialExpensesManager";
import {
  ShieldCheck, AlertTriangle, SlidersHorizontal, Link2, Loader2, Info, Pencil
} from "lucide-react";

const STABILITY_INFO: Record<string, { label: string; color: string; dot: string; multiplier: number }> = {
  STABLE:   { label: "🟢 Alta — CLT / Servidor Público",     color: "text-emerald-700", dot: "bg-emerald-500", multiplier: 6 },
  MIXED:    { label: "🟡 Média — PJ / Profissional Liberal", color: "text-amber-700",   dot: "bg-amber-400",  multiplier: 9 },
  VARIABLE: { label: "🔴 Baixa — Autônomo / Comissionado",  color: "text-red-600",     dot: "bg-red-500",    multiplier: 12 },
};

interface EmergencyReserveCardProps {
  reserve: {
    goal: number;
    amount: number;
    multiplier: number;
    stability: string;
    avgMonthlyExpense: number;
    essentialTotal: number;
    percentComplete: number;
    linkedAsset: any | null;
    riskAlert: string | null;
  };
  essentialExpenses: any[];
  assets: { id: string; name: string; category: string | null; type: string; currentValue: number }[];
  onRefresh: () => void;
}

export function EmergencyReserveCard({ reserve, essentialExpenses, assets, onRefresh }: EmergencyReserveCardProps) {
  const utils = trpc.useUtils();
  const [essentialsOpen, setEssentialsOpen] = useState(false);
  const [linkAsset, setLinkAsset] = useState(false);
  const [editingReserve, setEditingReserve] = useState(false);
  const [editingStability, setEditingStability] = useState(false);

  const [manualAmount, setManualAmount] = useState(
    reserve.linkedAsset ? 0 : reserve.amount
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    reserve.linkedAsset?.id ?? ""
  );
  const [localStability, setLocalStability] = useState(reserve.stability);

  // Sync local state when server data refreshes
  useEffect(() => {
    if (!reserve.linkedAsset) {
      setManualAmount(reserve.amount);
    }
    setSelectedAssetId(reserve.linkedAsset?.id ?? "");
    setLocalStability(reserve.stability);
  }, [reserve.amount, reserve.linkedAsset, reserve.stability]);

  const saveReserve = trpc.protection.saveReserveConfig.useMutation({
    onSuccess: () => {
      utils.protection.getSummary.invalidate();
      toast.success("Reserva atualizada!");
      setEditingReserve(false);
      onRefresh();
    },
    onError: () => toast.error("Erro ao salvar reserva."),
  });

  const saveStability = trpc.protection.saveStability.useMutation({
    onSuccess: () => {
      utils.protection.getSummary.invalidate();
      toast.success("Estabilidade atualizada! A meta da reserva foi recalculada.");
      setEditingStability(false);
      onRefresh();
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  const stabilityInfo = STABILITY_INFO[reserve.stability] ?? STABILITY_INFO.STABLE;
  const pct = Math.min(100, reserve.percentComplete);
  const isComplete = pct >= 100;
  const isLinked = !!reserve.linkedAsset;

  const handleSaveReserve = () => {
    const useLinkedAsset = linkAsset && !!selectedAssetId;
    saveReserve.mutate({
      emergencyReserveAmount: useLinkedAsset ? 0 : manualAmount,
      emergencyReserveAssetId: useLinkedAsset ? selectedAssetId : null,
    });
  };

  const selectedAssetName = assets.find(a => a.id === selectedAssetId)?.name ?? "";

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <div className={`p-6 rounded-3xl border-2 ${isComplete ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-100"} shadow-sm relative overflow-hidden`}>
        {isComplete && (
          <div className="absolute top-4 right-4">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </div>
        )}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border ${isComplete ? "bg-emerald-100 border-emerald-200" : "bg-orange-50 border-orange-100"}`}>
            {isComplete ? "🛡️" : "🚨"}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Reserva de Emergência</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(reserve.amount)}</p>
            <p className="text-sm text-gray-500">Meta: {formatCurrency(reserve.goal)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progresso</span>
            <span className={`font-bold ${isComplete ? "text-emerald-600" : pct > 50 ? "text-amber-600" : "text-red-500"}`}>
              {Math.round(pct)}%
            </span>
          </div>
          <Progress value={pct} className={`h-3 ${isComplete ? "[&>div]:bg-emerald-500" : pct > 50 ? "[&>div]:bg-amber-400" : "[&>div]:bg-red-500"}`} />
          {!isComplete && (
            <p className="text-xs text-gray-500">
              Falta <span className="font-bold text-gray-900">{formatCurrency(reserve.goal - reserve.amount)}</span> para completar a reserva
            </p>
          )}
        </div>
      </div>

      {/* Risk alert */}
      {reserve.riskAlert && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{reserve.riskAlert}</p>
        </div>
      )}

      {/* ── Quanto tenho reservado ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Quanto tenho reservado?</p>
          {!editingReserve && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-600" onClick={() => { setEditingReserve(true); setLinkAsset(false); }}>
              <Pencil className="w-3 h-3 mr-1" /> Alterar
            </Button>
          )}
        </div>

        {isLinked ? (
          <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-600" />
              <div>
                <p className="text-sm font-bold text-indigo-900">{reserve.linkedAsset.name}</p>
                <p className="text-xs text-indigo-600">{formatCurrency(reserve.linkedAsset.currentValue)} · Vinculado ao Patrimônio</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-700" onClick={() => {
              saveReserve.mutate({ emergencyReserveAmount: 0, emergencyReserveAssetId: null });
            }}>
              Desvincular
            </Button>
          </div>
        ) : editingReserve ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Valor guardado (R$)</Label>
              <CurrencyInput value={manualAmount} onChange={setManualAmount} />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs"
              onClick={() => setLinkAsset(!linkAsset)}
            >
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              {linkAsset ? "Cancelar vínculo" : "Vincular a um investimento do Patrimônio"}
            </Button>

            {linkAsset && (
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Selecione o ativo</Label>
                <Select value={selectedAssetId} onValueChange={(v) => v && setSelectedAssetId(v)}>
                  <SelectTrigger>
                    <SelectValue>{selectedAssetName || "Escolha um ativo do patrimônio..."}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} — {formatCurrency(a.currentValue)}
                        {a.category && ` (${a.category})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 text-sm" onClick={() => { setEditingReserve(false); setLinkAsset(false); }}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-gray-900 hover:bg-black" onClick={handleSaveReserve} disabled={saveReserve.isPending}>
                {saveReserve.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Valor registrado manualmente</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(reserve.amount)}</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Clique em "Alterar" para atualizar ou vincular a um ativo do patrimônio.</p>
          </div>
        )}
      </div>

      {/* ── Como foi calculado ─────────────────────────────────────────────── */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Como foi calculado
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base mensal (essenciais)</span>
            <div className="flex items-center gap-2">
              <span className="font-bold">{formatCurrency(reserve.essentialTotal)}</span>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-indigo-600 hover:text-indigo-700" onClick={() => setEssentialsOpen(true)}>
                <SlidersHorizontal className="w-3 h-3 mr-1" />
                Editar
              </Button>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Multiplicador</span>
            <span className="font-bold">{reserve.multiplier} meses</span>
          </div>
          <div className="h-px bg-gray-200" />

          {/* Stability — editable directly here */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${stabilityInfo.dot}`} />
              <span className={`text-xs font-medium ${stabilityInfo.color}`}>{stabilityInfo.label}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-gray-500 hover:text-gray-700" onClick={() => setEditingStability(!editingStability)}>
              <Pencil className="w-3 h-3 mr-1" /> Alterar
            </Button>
          </div>

          {editingStability && (
            <div className="space-y-2 pt-1 border-t border-gray-200">
              <Label className="text-xs text-gray-500">Selecione sua estabilidade de renda</Label>
              <Select value={localStability} onValueChange={(v) => v && setLocalStability(v)}>
                <SelectTrigger>
                  <SelectValue>
                    <span className={STABILITY_INFO[localStability]?.color ?? ""}>
                      {STABILITY_INFO[localStability]?.label ?? localStability}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STABILITY_INFO).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <span className={v.color}>{v.label}</span>
                      <span className="text-gray-400 text-xs ml-2">({v.multiplier} meses de reserva)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-gray-400">
                {STABILITY_INFO[localStability]?.multiplier} meses de gastos essenciais = {formatCurrency(reserve.essentialTotal * (STABILITY_INFO[localStability]?.multiplier ?? 6))} de meta
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => { setLocalStability(reserve.stability); setEditingStability(false); }}>
                  Cancelar
                </Button>
                <Button size="sm" className="flex-1 bg-gray-900 text-xs" onClick={() => saveStability.mutate({ incomeStability: localStability as any })} disabled={saveStability.isPending}>
                  {saveStability.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <EssentialExpensesManager
        open={essentialsOpen}
        onOpenChange={setEssentialsOpen}
        current={essentialExpenses}
        avgMonthlyExpense={reserve.avgMonthlyExpense}
        onSuccess={onRefresh}
      />
    </div>
  );
}
