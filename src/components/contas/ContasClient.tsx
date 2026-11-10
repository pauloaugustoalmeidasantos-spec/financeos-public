"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import {
  CreditCard,
  Plus,
  Loader2,
  CheckCircle2,
  Calendar,
  WalletCards,
  Pencil,
  Trash2,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { ExtratoIA } from "./ExtratoIA";

// ─── Sub-componente: linha de parcela com edição inline ─────────────────────

function InstallmentRow({
  inst,
  month,
  year,
  onPay,
  onUpdate,
  onDelete,
  isPaying,
}: {
  inst: {
    id: string;
    description: string;
    installmentValue: unknown;
    totalInstallments: number;
    paidInstallments: number;
    startMonth: number;
    startYear: number;
    isActive: boolean;
  };
  month: number;
  year: number;
  onPay: (id: string) => void;
  onUpdate: (id: string, data: { description?: string; installmentValue?: number; totalInstallments?: number; paidInstallments?: number }) => void;
  onDelete: (id: string) => void;
  isPaying: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(inst.description);
  const [value, setValue] = useState(String(Number(inst.installmentValue)));
  const [total, setTotal] = useState(String(inst.totalInstallments));
  const [paid, setPaid] = useState(String(inst.paidInstallments));
  const [confirmdel, setConfirmdel] = useState(false);

  const handleSave = () => {
    const v = parseFloat(value.replace(",", "."));
    const t = parseInt(total);
    const p = parseInt(paid);
    if (!desc.trim() || isNaN(v) || isNaN(t) || isNaN(p)) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    if (p > t) {
      toast.error("Parcelas pagas não pode ser maior que o total.");
      return;
    }
    onUpdate(inst.id, { description: desc.trim(), installmentValue: v, totalInstallments: t, paidInstallments: p });
    setEditing(false);
  };

  const pct = Math.min((inst.paidInstallments / inst.totalInstallments) * 100, 100);

  if (editing) {
    return (
      <div className="p-3 bg-muted/30 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3">
        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Editar Parcela</p>
        <div className="flex flex-wrap gap-2">
          <Input
            className="flex-1 min-w-[140px] h-8 text-sm"
            placeholder="Descrição"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="w-28">
            <label className="text-[10px] text-muted-foreground font-medium block mb-0.5">Valor parcela (R$)</label>
            <Input
              type="number"
              className="h-8 text-sm"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="w-24">
            <label className="text-[10px] text-muted-foreground font-medium block mb-0.5">Total parc.</label>
            <Input
              type="number"
              className="h-8 text-sm"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
          <div className="w-24">
            <label className="text-[10px] text-muted-foreground font-medium block mb-0.5">Já pagas</label>
            <Input
              type="number"
              className="h-8 text-sm"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave}>
            <Save className="w-3.5 h-3.5 mr-1" /> Salvar
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEditing(false); setDesc(inst.description); setValue(String(Number(inst.installmentValue))); setTotal(String(inst.totalInstallments)); setPaid(String(inst.paidInstallments)); }}>
            <X className="w-3.5 h-3.5 mr-1" /> Cancelar
          </Button>
        </div>
      </div>
    );
  }

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const expectedPaid = (currentYear - inst.startYear) * 12 + (currentMonth - inst.startMonth) + 1;
  const isOverdue = expectedPaid > inst.paidInstallments && currentMonth >= month && currentYear >= year;

  return (
    <div className={`flex items-center justify-between p-3 bg-muted/30 rounded-xl border transition-all group ${isOverdue ? 'border-red-300 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20' : 'border-border hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
      <div className="flex-1 min-w-0 mr-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{inst.description}</p>
          {isOverdue && (
            <span className="px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-900/50 text-[10px] font-bold text-red-600 dark:text-red-400">
              ATRASADA
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {inst.paidInstallments} de {inst.totalInstallments} pagas
          {" · "}
          <span className="font-semibold text-foreground">{formatCurrency(Number(inst.installmentValue))}/mês</span>
        </p>
        <div className="w-full bg-border h-1.5 rounded-full mt-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOverdue ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="p-1 rounded-md text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
            title="Editar parcela"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {confirmdel ? (
            <>
              <button
                onClick={() => onDelete(inst.id)}
                className="text-[10px] font-bold text-red-600 px-2 py-0.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmdel(false)}
                className="text-[10px] text-muted-foreground hover:text-foreground px-1"
              >
                Não
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmdel(true)}
              className="p-1 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
              title="Remover parcela"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
          disabled={isPaying || inst.paidInstallments >= inst.totalInstallments}
          onClick={() => onPay(inst.id)}
        >
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Marcar como Paga
        </Button>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function ContasClient() {
  const { selectedMonth } = useAppStore();
  const month = selectedMonth.getMonth() + 1;
  const year = selectedMonth.getFullYear();

  const utils = trpc.useUtils();
  const { data: cards, isLoading } = trpc.contas.listCreditCards.useQuery();

  const createCardMutation = trpc.contas.createCreditCard.useMutation({
    onSuccess: () => { utils.contas.listCreditCards.invalidate(); toast.success("Cartão adicionado!"); },
  });

  const createInstallmentMutation = trpc.contas.createInstallment.useMutation({
    onSuccess: () => { utils.contas.listCreditCards.invalidate(); toast.success("Parcelamento adicionado!"); },
  });

  const updateInstallmentMutation = trpc.contas.updateInstallment.useMutation({
    onSuccess: () => { utils.contas.listCreditCards.invalidate(); toast.success("Parcela atualizada!"); },
    onError: () => toast.error("Erro ao atualizar parcela."),
  });

  const deleteInstallmentMutation = trpc.contas.deleteInstallment.useMutation({
    onSuccess: () => { utils.contas.listCreditCards.invalidate(); toast.success("Parcela removida."); },
    onError: () => toast.error("Erro ao remover parcela."),
  });

  const payInstallmentMutation = trpc.contas.payInstallment.useMutation({
    onSuccess: () => {
      utils.contas.listCreditCards.invalidate();
      utils.transaction.list.invalidate();
      toast.success("Parcela paga e lançada!");
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const payFullCardMutation = trpc.contas.payFullCard.useMutation({
    onSuccess: (data) => {
      utils.contas.listCreditCards.invalidate();
      utils.transaction.list.invalidate();
      toast.success(`${data.count} parcelas pagas! A fatura principal foi lançada.`);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const [newCardForm, setNewCardForm] = useState(false);
  const [showExtratoIA, setShowExtratoIA] = useState(false);
  const [cardName, setCardName] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [newInstCardId, setNewInstCardId] = useState<string | null>(null);
  const [instDesc, setInstDesc] = useState("");
  const [instValue, setInstValue] = useState("");
  const [instTotal, setInstTotal] = useState("");

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Meus Cartões de Crédito</h2>
          <p className="text-sm text-muted-foreground">Gerencie faturas e parcelamentos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => { setShowExtratoIA(true); setNewCardForm(false); }}
            variant="outline"
            className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-300 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Ler Extrato (IA)
          </Button>
          <Button onClick={() => { setNewCardForm(!newCardForm); setShowExtratoIA(false); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Novo Cartão
          </Button>
        </div>
      </div>

      {/* Leitor de Extrato IA */}
      {showExtratoIA && (
        <ExtratoIA cards={cards || []} onClose={() => setShowExtratoIA(false)} />
      )}

      {/* Form novo cartão */}
      {newCardForm && (
        <div className="p-4 bg-card rounded-xl border border-border flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Nome do Cartão</label>
            <Input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Ex: Sicoob, Nubank" className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Dia Vencimento</label>
            <Input type="number" value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="Ex: 10" className="h-9 w-24" />
          </div>
          <Button className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
            if (!cardName) return toast.error("Preencha o nome");
            createCardMutation.mutate({ cardName, dueDay: dueDay ? parseInt(dueDay) : undefined });
            setNewCardForm(false); setCardName(""); setDueDay("");
          }}>
            Salvar
          </Button>
          <Button variant="ghost" className="h-9" onClick={() => setNewCardForm(false)}>Cancelar</Button>
        </div>
      )}

      {/* Estado vazio */}
      {cards?.length === 0 && !newCardForm && (
        <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
          <WalletCards className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-foreground">Nenhum cartão cadastrado</h3>
          <p className="text-sm text-muted-foreground mt-1">Adicione seu primeiro cartão para controlar seus parcelamentos.</p>
        </div>
      )}

      {/* Grid de cartões */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {cards?.map((card) => {
          const activeInstallments = card.installments.filter(
            (i) => i.paidInstallments < i.totalInstallments && i.isActive
          );
          const monthlyCommitment = activeInstallments.reduce((acc, i) => acc + Number(i.installmentValue), 0);

          return (
            <div key={card.id} className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col">
              {/* Cabeçalho */}
              <div className="p-5 border-b border-border bg-muted/40">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight">{card.cardName}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>Vence dia {card.dueDay ?? "--"}</span>
                      {card.isAutoDebit && (
                        <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          Débito Auto.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-background rounded-xl border border-border p-3 flex justify-between items-center gap-3 flex-wrap">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Fatura Estimada (Parcelas)</p>
                    <p className="text-xl font-bold text-indigo-500 dark:text-indigo-400 mt-0.5">{formatCurrency(monthlyCommitment)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50"
                      disabled={activeInstallments.length === 0 || payFullCardMutation.isPending}
                      onClick={() => payFullCardMutation.mutate({ creditCardId: card.id, month, year })}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Pagar Fatura Toda
                    </Button>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setNewInstCardId(card.id)}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Nova Parcela
                    </Button>
                  </div>
                </div>
              </div>

              {/* Form nova parcela */}
              {newInstCardId === card.id && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border-b border-border space-y-3">
                  <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                    Adicionar Nova Compra Parcelada
                  </h4>
                  <div className="flex flex-wrap gap-2 items-end">
                    <Input placeholder="Descrição (ex: Top Invest)" className="flex-1 min-w-[140px] h-8 text-sm" value={instDesc} onChange={(e) => setInstDesc(e.target.value)} />
                    <Input placeholder="R$ Parcela" type="number" className="w-28 h-8 text-sm" value={instValue} onChange={(e) => setInstValue(e.target.value)} />
                    <Input placeholder="Qtd Parc." type="number" className="w-24 h-8 text-sm" value={instTotal} onChange={(e) => setInstTotal(e.target.value)} />
                    <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
                      if (!instDesc || !instValue || !instTotal) return toast.error("Preencha todos os campos");
                      const val = parseFloat(instValue.replace(",", "."));
                      const tot = parseInt(instTotal);
                      createInstallmentMutation.mutate({ creditCardId: card.id, description: instDesc, installmentValue: val, totalInstallments: tot, totalAmount: val * tot, startMonth: month, startYear: year });
                      setNewInstCardId(null); setInstDesc(""); setInstValue(""); setInstTotal("");
                    }}>
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setNewInstCardId(null)}>Cancelar</Button>
                  </div>
                </div>
              )}

              {/* Lista de parcelas */}
              <div className="flex-1 p-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Compras Parceladas Ativas
                </h4>
                {activeInstallments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Nenhuma compra parcelada em aberto.</p>
                ) : (
                  <div className="space-y-3">
                    {activeInstallments.map((inst) => (
                      <InstallmentRow
                        key={inst.id}
                        inst={inst}
                        month={month}
                        year={year}
                        isPaying={payInstallmentMutation.isPending}
                        onPay={(id) => payInstallmentMutation.mutate({ id, month, year, createTransaction: true })}
                        onUpdate={(id, data) => updateInstallmentMutation.mutate({ id, data })}
                        onDelete={(id) => deleteInstallmentMutation.mutate({ id })}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
