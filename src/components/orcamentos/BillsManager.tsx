"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus, Loader2, CheckCircle2, AlertTriangle, Clock,
  Trash2, Edit2, X, Save, RotateCcw,
} from "lucide-react";

const BILL_CATEGORIES = [
  "Casa", "Saúde", "Educação", "Transporte", "Alimentação",
  "Lazer", "Internet/Telefone", "Seguro", "Investimento", "Outros"
];

interface BillFormState {
  name: string;
  category: string;
  amount: string;
  dueDay: string;
  isRecurring: boolean;
  notes: string;
}

const EMPTY_FORM: BillFormState = {
  name: "",
  category: "Casa",
  amount: "",
  dueDay: "",
  isRecurring: true,
  notes: "",
};

function BillRow({
  bill,
  month,
  year,
  onPay,
  onUnpay,
  onDelete,
  onEdit,
}: {
  bill: {
    id: string;
    name: string;
    category: string;
    amount: number;
    dueDay: number;
    isPaid: boolean;
    isPastDue: boolean;
    paidAt?: string | null;
    paidAmount?: number | null;
  };
  month: number;
  year: number;
  onPay: (id: string) => void;
  onUnpay: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (bill: any) => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);

  const statusClass = bill.isPaid
    ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20"
    : bill.isPastDue
    ? "border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20"
    : "border-border bg-card";

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all group ${statusClass}`}>
      {/* Status icon */}
      <div className="shrink-0">
        {bill.isPaid ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : bill.isPastDue ? (
          <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
        ) : (
          <Clock className="w-5 h-5 text-amber-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold truncate ${bill.isPaid ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {bill.name}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {bill.category}
          </span>
          {bill.isPastDue && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
              ATRASADA
            </span>
          )}
          {bill.isPaid && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
              PAGA
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Vence dia <strong>{bill.dueDay}</strong>
          {bill.paidAt && (
            <> · Paga em {new Date(bill.paidAt).toLocaleDateString("pt-BR")}</>
          )}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${bill.isPastDue && !bill.isPaid ? "text-red-500" : "text-foreground"}`}>
          {formatCurrency(bill.paidAmount ?? bill.amount)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {!bill.isPaid ? (
          <button
            onClick={() => onPay(bill.id)}
            title="Marcar como paga"
            className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => onUnpay(bill.id)}
            title="Desfazer pagamento"
            className="w-7 h-7 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 dark:text-amber-400 flex items-center justify-center transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(bill)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {confirmDel ? (
            <>
              <button
                onClick={() => onDelete(bill.id)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 hover:bg-red-200 font-bold"
              >
                OK
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="text-[10px] px-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function BillsManager() {
  const { selectedMonth } = useAppStore();
  const month = selectedMonth.getMonth() + 1;
  const year = selectedMonth.getFullYear();

  const utils = trpc.useUtils();
  const { data: bills = [], isLoading } = trpc.bills.list.useQuery({ month, year });

  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<any | null>(null);
  const [form, setForm] = useState<BillFormState>(EMPTY_FORM);

  const createMutation = trpc.bills.create.useMutation({
    onSuccess: () => {
      utils.bills.list.invalidate();
      toast.success("Conta criada!");
      setForm(EMPTY_FORM);
      setShowForm(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.bills.update.useMutation({
    onSuccess: () => {
      utils.bills.list.invalidate();
      toast.success("Conta atualizada!");
      setEditingBill(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.bills.delete.useMutation({
    onSuccess: () => {
      utils.bills.list.invalidate();
      toast.success("Conta removida.");
    },
    onError: () => toast.error("Erro ao remover."),
  });

  const payMutation = trpc.bills.pay.useMutation({
    onSuccess: (data) => {
      utils.bills.list.invalidate();
      utils.transaction.list.invalidate();
      toast.success(data.transactionCreated ? "Conta paga e lançamento criado!" : "Conta marcada como paga.");
    },
    onError: (e) => toast.error(e.message),
  });

  const unpayMutation = trpc.bills.unpay.useMutation({
    onSuccess: () => {
      utils.bills.list.invalidate();
      toast.info("Pagamento desfeito.");
    },
    onError: () => toast.error("Erro ao desfazer pagamento."),
  });

  const handleSubmit = () => {
    const amount = parseFloat(form.amount.replace(",", "."));
    const dueDay = parseInt(form.dueDay);
    if (!form.name.trim()) return toast.error("Informe o nome da conta.");
    if (isNaN(amount) || amount <= 0) return toast.error("Informe um valor válido.");
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) return toast.error("Informe o dia de vencimento (1-31).");

    if (editingBill) {
      updateMutation.mutate({
        id: editingBill.id,
        data: { name: form.name, category: form.category, amount, dueDay, isRecurring: form.isRecurring, notes: form.notes || null },
      });
    } else {
      createMutation.mutate({ name: form.name, category: form.category, amount, dueDay, isRecurring: form.isRecurring, notes: form.notes || null });
    }
  };

  const handleEdit = (bill: any) => {
    setEditingBill(bill);
    setForm({
      name: bill.name,
      category: bill.category,
      amount: String(bill.amount),
      dueDay: String(bill.dueDay),
      isRecurring: bill.isRecurring,
      notes: bill.notes || "",
    });
    setShowForm(true);
  };

  const overdueCount = bills.filter(b => b.isPastDue && !b.isPaid).length;
  const paidCount = bills.filter(b => b.isPaid).length;
  const totalValue = bills.reduce((acc, b) => acc + b.amount, 0);
  const paidValue = bills.filter(b => b.isPaid).reduce((acc, b) => acc + (b.paidAmount ?? b.amount), 0);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/40">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Contas a Pagar
            {overdueCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold animate-pulse">
                {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {paidCount}/{bills.length} pagas · {formatCurrency(paidValue)} de {formatCurrency(totalValue)}
          </p>
        </div>
        <Button
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-white h-8"
          onClick={() => { setEditingBill(null); setForm(EMPTY_FORM); setShowForm(!showForm); }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Nova Conta
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="px-5 py-4 border-b border-border bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
          <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            {editingBill ? "Editar Conta" : "Nova Conta a Pagar"}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground font-medium block mb-1">Nome da Conta</label>
              <Input
                placeholder="Ex: Conta de Luz, Internet..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">Valor (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">Dia Vencimento</label>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="1-31"
                value={form.dueDay}
                onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground font-medium block mb-1">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {BILL_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                  className="w-4 h-4 rounded border-border accent-indigo-600"
                />
                <span className="text-sm text-foreground">Recorrente (todo mês)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white h-8"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1" />
              )}
              {editingBill ? "Salvar Alterações" : "Adicionar Conta"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => { setShowForm(false); setEditingBill(null); setForm(EMPTY_FORM); }}
            >
              <X className="w-3.5 h-3.5 mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="p-4 space-y-2 min-h-[80px]">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma conta cadastrada.</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-xs text-amber-600 hover:underline mt-1"
            >
              Adicionar agora →
            </button>
          </div>
        ) : (
          <>
            {/* Atrasadas primeiro */}
            {bills.filter(b => b.isPastDue && !b.isPaid).map(bill => (
              <BillRow
                key={bill.id}
                bill={bill as any}
                month={month}
                year={year}
                onPay={(id) => payMutation.mutate({ billId: id, month, year })}
                onUnpay={(id) => unpayMutation.mutate({ billId: id, month, year })}
                onDelete={(id) => deleteMutation.mutate({ id })}
                onEdit={handleEdit}
              />
            ))}
            {/* Pendentes */}
            {bills.filter(b => !b.isPastDue && !b.isPaid).map(bill => (
              <BillRow
                key={bill.id}
                bill={bill as any}
                month={month}
                year={year}
                onPay={(id) => payMutation.mutate({ billId: id, month, year })}
                onUnpay={(id) => unpayMutation.mutate({ billId: id, month, year })}
                onDelete={(id) => deleteMutation.mutate({ id })}
                onEdit={handleEdit}
              />
            ))}
            {/* Pagas */}
            {bills.filter(b => b.isPaid).map(bill => (
              <BillRow
                key={bill.id}
                bill={bill as any}
                month={month}
                year={year}
                onPay={(id) => payMutation.mutate({ billId: id, month, year })}
                onUnpay={(id) => unpayMutation.mutate({ billId: id, month, year })}
                onDelete={(id) => deleteMutation.mutate({ id })}
                onEdit={handleEdit}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer resumo */}
      {bills.length > 0 && (
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex justify-between items-center">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {paidCount} pagas
            </span>
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 text-red-500 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {overdueCount} atrasadas
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-foreground">
            Total: {formatCurrency(totalValue)}
          </span>
        </div>
      )}
    </div>
  );
}
