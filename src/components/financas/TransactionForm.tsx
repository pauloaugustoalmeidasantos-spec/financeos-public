"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { TransactionCreateSchema } from "@/validations/transaction";
import { CategoryManager } from "./CategoryManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toLocalMidnight } from "@/lib/date-utils";

type FormValues = z.infer<typeof TransactionCreateSchema>;

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: any; // Objeto de transação se for edição
  defaultDate?: Date;
  defaultCategoryId?: string;
  defaultType?: "INCOME" | "EXPENSE";
}

export function TransactionForm({ open, onOpenChange, transaction, defaultDate = new Date(), defaultCategoryId, defaultType = "EXPENSE" }: TransactionFormProps) {
  const isEditing = !!transaction;
  const originalType = transaction?.type || defaultType;
  const [activeType, setActiveType] = useState<"INCOME" | "EXPENSE">(originalType);
  const [managerOpen, setManagerOpen] = useState(false);
  const [editModeDialog, setEditModeDialog] = useState(false);
  const [deleteModeDialog, setDeleteModeDialog] = useState(false);
  
  const utils = trpc.useUtils();
  const { data: allCategories = [] } = trpc.category.list.useQuery({});
  const { data: categories = [] } = trpc.category.list.useQuery({ type: activeType });
  const createMutation = trpc.transaction.create.useMutation();
  const updateMutation = trpc.transaction.update.useMutation();
  const deleteMutation = trpc.transaction.delete.useMutation();

  const form = useForm<any>({
    resolver: zodResolver(TransactionCreateSchema),
    defaultValues: {
      type: originalType,
      amount: transaction ? Number(transaction.amount) : 0,
      description: transaction?.description || "",
      categoryId: transaction?.categoryId || defaultCategoryId || "",
      transactionDate: transaction?.transactionDate ? toLocalMidnight(transaction.transactionDate) : defaultDate,
      isRecurring: transaction?.isRecurring || false,
      recurrenceType: transaction?.recurrenceType || "NONE",
    }
  });

  // Re-synchronize when transaction prop changes
  useEffect(() => {
    if (transaction) {
      setActiveType(transaction.type);
      form.reset({
        type: transaction.type,
        amount: Number(transaction.amount),
        description: transaction.description || "",
        categoryId: transaction.categoryId || "",
        transactionDate: toLocalMidnight(transaction.transactionDate),
        isRecurring: transaction.isRecurring,
        recurrenceType: transaction.recurrenceType || "NONE",
        recurrenceEndDate: transaction.recurrenceEndDate ? toLocalMidnight(transaction.recurrenceEndDate) : undefined,
      });
    } else {
      setActiveType(defaultType);
      form.reset({
        type: defaultType,
        amount: 0,
        description: "",
        categoryId: defaultCategoryId || "",
        transactionDate: defaultDate,
        isRecurring: false,
        recurrenceType: "NONE",
      });
    }
  }, [transaction, open, defaultCategoryId, defaultType]); // eslint-disable-line

  useEffect(() => {
    form.setValue("type", activeType);
  }, [activeType]); // eslint-disable-line

  const isRecurring = form.watch("isRecurring");

  const onSubmit = async (data: any) => {
    if (isEditing && data.isRecurring && transaction?.parentId) {
      // Se for recorrente em edição, abre modal de modo de salvamento antes
      setEditModeDialog(true);
      return; 
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: transaction.id, ...data, updateMode: "single" });
      } else {
        await createMutation.mutateAsync(data);
      }
      toast.success(isEditing ? "Transação atualizada!" : "Transação registrada!");
      utils.transaction.list.invalidate();
      utils.transaction.getMonthlySummary.invalidate();
      utils.transaction.getBiggestExpenses.invalidate();
      utils.transaction.getMonthlyComparison.invalidate();
      utils.budget.list.invalidate();
      onOpenChange(false);
    } catch {
      toast.error("Ocorreu um erro ao salvar a transação.");
    }
  };

  const submitEditWithMode = async (mode: "single" | "all_future" | "all") => {
    const data = form.getValues();
    try {
      await updateMutation.mutateAsync({ id: transaction.id, ...data, updateMode: mode });
      toast.success("Múltiplas transações atualizadas!");
      utils.transaction.list.invalidate();
      utils.transaction.getMonthlySummary.invalidate();
      utils.transaction.getBiggestExpenses.invalidate();
      utils.transaction.getMonthlyComparison.invalidate();
      utils.budget.list.invalidate();
      setEditModeDialog(false);
      onOpenChange(false);
    } catch {
      toast.error("Erro na atualização em massa.");
    }
  };

  const submitDeleteWithMode = async (mode: "single" | "all_future" | "all") => {
    try {
      await deleteMutation.mutateAsync({ id: transaction.id, deleteMode: mode });
      toast.success("Exclusão concluída!");
      utils.transaction.list.invalidate();
      utils.transaction.getMonthlySummary.invalidate();
      utils.transaction.getBiggestExpenses.invalidate();
      utils.transaction.getMonthlyComparison.invalidate();
      utils.budget.list.invalidate();
      setDeleteModeDialog(false);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao deletar transação.");
    }
  };

  const handleDeleteTrigger = () => {
    if (transaction.isRecurring || transaction.parentId) {
      setDeleteModeDialog(true);
    } else {
      submitDeleteWithMode("single");
    }
  };

  const headerColor = activeType === "EXPENSE" ? "bg-red-50" : "bg-emerald-50";
  const accentColor = activeType === "EXPENSE" ? "text-red-600" : "text-emerald-600";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className={`sm:max-w-md ${headerColor} border-l-0 overflow-y-auto`}>
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              {isEditing ? "Editar Lançamento" : "Novo Lançamento"}
              {isEditing && (
                <Button variant="ghost" size="sm" className="ml-auto text-red-500 hover:text-red-700" onClick={handleDeleteTrigger}>
                  Excluir
                </Button>
              )}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="flex bg-white/50 p-1 rounded-xl shadow-sm border border-gray-100">
              <button 
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${activeType === 'EXPENSE' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-900'}`}
                onClick={() => setActiveType('EXPENSE')}
              >
                Despesa
              </button>
              <button 
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${activeType === 'INCOME' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-900'}`}
                onClick={() => setActiveType('INCOME')}
              >
                Receita
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Valor</label>
                <CurrencyInput 
                  value={form.watch("amount")} 
                  onChange={(val) => form.setValue("amount", val, { shouldValidate: true })} 
                  className={`text-3xl font-bold bg-transparent border-none h-12 shadow-none focus-visible:ring-0 ${accentColor}`}
                />
                {form.formState.errors.amount && <p className="text-xs text-red-500">{String(form.formState.errors.amount.message)}</p>}
              </div>

              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Categoria</label>
                  <Select 
                    value={form.watch("categoryId") || ""} 
                    onValueChange={(v: any) => {
                      if (v === "new") setManagerOpen(true);
                      else form.setValue("categoryId", v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem categoria">
                        {(() => {
                          const currentId = form.watch("categoryId");
                          const cat = allCategories.find(c => c.id === currentId);
                          if (cat) return <div className="flex items-center gap-2">{cat.icon} {cat.name}</div>;
                          if (transaction?.category?.id === currentId) return <div className="flex items-center gap-2">{transaction.category.icon} {transaction.category.name}</div>;
                          return null;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                         <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                      ))}
                      <div className="h-px bg-gray-100 my-1" />
                      <SelectItem value="new" className="text-indigo-600 font-medium">+ Gerenciar categorias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Descrição (opcional)</label>
                  <Input {...form.register("description")} placeholder="Ex: Supermercado Assaí" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Data</label>
                  <Input type="date" 
                    value={form.watch("transactionDate") ? format(form.watch("transactionDate"), "yyyy-MM-dd") : ""}
                    onChange={(e) => form.setValue("transactionDate", toLocalMidnight(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className={`${isEditing ? 'bg-indigo-50/30' : 'bg-white'} p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Assinatura / Recorrente</h4>
                  <p className="text-xs text-gray-500">Repetir automaticamente no futuro</p>
                </div>
                <Switch 
                  checked={isRecurring} 
                  onCheckedChange={(val: any) => {
                    form.setValue("isRecurring", val);
                    if (val && form.watch("recurrenceType") === "NONE") {
                      form.setValue("recurrenceType", "MONTHLY");
                    }
                  }} 
                />
              </div>

              {isRecurring && (
                <div className="pt-3 border-t border-gray-50 flex gap-4">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Frequência</label>
                    <Select 
                      value={form.watch("recurrenceType")} 
                      onValueChange={(v: any) => form.setValue("recurrenceType", v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue>
                          {(() => {
                            const v = form.watch("recurrenceType");
                            if (v === "DAILY") return "Diário";
                            if (v === "WEEKLY") return "Semanal";
                            if (v === "MONTHLY") return "Mensal";
                            if (v === "YEARLY") return "Anual";
                            return null;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">Diário</SelectItem>
                        <SelectItem value="WEEKLY">Semanal</SelectItem>
                        <SelectItem value="MONTHLY">Mensal</SelectItem>
                        <SelectItem value="YEARLY">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {isEditing && !transaction?.isRecurring && isRecurring && (
                <p className="text-[10px] text-indigo-500 font-medium">
                  * Ao salvar, parcelas futuras serão geradas a partir desta data.
                </p>
              )}
            </div>

            <SheetFooter className="mt-6 flex gap-3 sm:justify-start">
              <Button type="submit" className="flex-1 bg-gray-900" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Salvando..." : isEditing ? "Salvar Alterações" : "Concluir Lançamento"}
              </Button>
            </SheetFooter>

          </form>
        </SheetContent>
      </Sheet>

      <CategoryManager open={managerOpen} onOpenChange={setManagerOpen} defaultType={activeType} />

      {/* Editor Modal Multiple */}
      <Dialog open={editModeDialog} onOpenChange={setEditModeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Múltiplas Ocorrências</DialogTitle>
            <DialogDescription>
              Esta transação se repete. Você quer alterar apenas este lançamento, ou os da série inteira?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Button variant="outline" onClick={() => submitEditWithMode("single")}>Apenas este evento</Button>
            <Button variant="outline" onClick={() => submitEditWithMode("all_future")}>Este e os eventos futuros</Button>
            <Button variant="outline" onClick={() => submitEditWithMode("all")}>Todos os eventos</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Modal Multiple */}
      <Dialog open={deleteModeDialog} onOpenChange={setDeleteModeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">Excluir Lançamento Repetitivo</DialogTitle>
            <DialogDescription>
              Modo de exclusão em massa por cascata.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => submitDeleteWithMode("single")}>Excluir apenas este evento</Button>
            <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => submitDeleteWithMode("all_future")}>Excluir este e eventos futuros</Button>
            <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => submitDeleteWithMode("all")}>Excluir série inteira</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
