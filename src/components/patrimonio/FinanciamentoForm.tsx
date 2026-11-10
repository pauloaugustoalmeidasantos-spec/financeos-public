"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FinancingCreateSchema, FinancingUpdateSchema } from "@/validations/financing";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export function FinanciamentoForm({ isOpen, onClose, onSuccess, initialData }: Props) {
  const form = useForm<any>({
    resolver: zodResolver(initialData ? FinancingUpdateSchema : FinancingCreateSchema),
    defaultValues: initialData || {
      name: "",
      type: "IMOVEL",
      totalValue: 0,
      downPayment: 0,
      totalInstallments: 360,
      paidInstallments: 0,
      monthlyPayment: 0,
      interestRate: 0,
      startDate: new Date(),
      description: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          ...initialData,
          startDate: new Date(initialData.startDate),
          totalValue: Number(initialData.totalValue),
          downPayment: Number(initialData.downPayment),
          monthlyPayment: Number(initialData.monthlyPayment),
          interestRate: initialData.interestRate ? Number(initialData.interestRate) : 0,
        });
      } else {
        form.reset({
          name: "",
          type: "IMOVEL",
          totalValue: 0,
          downPayment: 0,
          totalInstallments: 360,
          paidInstallments: 0,
          monthlyPayment: 0,
          interestRate: 0,
          startDate: new Date(),
          description: "",
        });
      }
    }
  }, [isOpen, form, initialData]);

  // Auto calcular parcela
  const watchTotalValue = form.watch("totalValue");
  const watchDownPayment = form.watch("downPayment");
  const watchInstallments = form.watch("totalInstallments");
  const watchInterest = form.watch("interestRate");

  useEffect(() => {
    if (!initialData) { // Apenas calcula auto em novos
      const principal = (Number(watchTotalValue) || 0) - (Number(watchDownPayment) || 0);
      const n = Number(watchInstallments) || 1;
      const rate = Number(watchInterest) || 0;

      if (principal > 0 && n > 0) {
        let parcela = 0;
        if (rate > 0) {
          // Tabela Price aproximada (juros anual convertido pra mensal)
          const i = Math.pow(1 + rate / 100, 1 / 12) - 1;
          parcela = principal * (i / (1 - Math.pow(1 + i, -n)));
        } else {
          parcela = principal / n;
        }
        form.setValue("monthlyPayment", Number(parcela.toFixed(2)));
      }
    }
  }, [watchTotalValue, watchDownPayment, watchInstallments, watchInterest, form, initialData]);

  const createFinancing = trpc.financing.create.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
      toast.success("Financiamento cadastrado! O ativo foi adicionado ao seu patrimônio.");
    },
    onError: () => toast.error("Erro ao cadastrar financiamento."),
  });

  const updateFinancing = trpc.financing.update.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
      toast.success("Financiamento atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar financiamento."),
  });

  const onSubmit = (data: any) => {
    if (initialData) {
      updateFinancing.mutate({ ...data, id: initialData.id });
    } else {
      createFinancing.mutate(data);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{initialData ? "Editar Financiamento" : "Novo Financiamento"}</SheetTitle>
          <SheetDescription>
            {initialData 
              ? "Atualize os dados do financiamento. O ativo vinculado no patrimônio será recalculado." 
              : "Cadastre um financiamento. O bem será adicionado automaticamente ao seu patrimônio e as parcelas pagas serão lançadas como despesa."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-6">
          <div className="space-y-2">
            <Label>Nome do Bem</Label>
            <Input {...form.register("name")} placeholder="Ex: Apartamento Centro, Casa Praia..." />
            {form.formState.errors.name && <p className="text-red-500 text-xs">{String((form.formState.errors.name as any).message)}</p>}
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMOVEL">🏠 Imóvel</SelectItem>
                    <SelectItem value="VEICULO">🚗 Veículo</SelectItem>
                    <SelectItem value="OUTRO">📦 Outro</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Total (R$)</Label>
              <Controller
                control={form.control}
                name="totalValue"
                render={({ field }) => (
                  <CurrencyInput value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor da Entrada (Sinal) R$</Label>
              <Controller
                control={form.control}
                name="downPayment"
                render={({ field }) => (
                  <CurrencyInput value={field.value} onChange={field.onChange} />
                )}
              />
              <p className="text-[10px] text-gray-400">Não insira o valor total aqui. Apenas o que já foi pago de entrada.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nº de Parcelas</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  className="w-full"
                  {...form.register("totalInstallments", { valueAsNumber: true })}
                  placeholder="Ex: 360"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parcelas Já Pagas</Label>
              <Input
                type="number"
                min={0}
                {...form.register("paidInstallments", { valueAsNumber: true })}
                placeholder="Ex: 12"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor da Parcela (R$)</Label>
              <Controller
                control={form.control}
                name="monthlyPayment"
                render={({ field }) => (
                  <CurrencyInput value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Taxa de Juros (% a.a.)</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("interestRate", { valueAsNumber: true })}
                placeholder="10.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Controller
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <Input
                    type="date"
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição (Opcional)</Label>
            <Input {...form.register("description")} placeholder="Detalhes sobre o financiamento..." />
          </div>

          {!initialData && (
            <div className="bg-indigo-50 p-4 rounded-xl text-xs text-indigo-700 space-y-1">
              <p className="font-semibold">ℹ️ O que acontece ao cadastrar:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Um ativo é criado automaticamente no seu Patrimônio com o valor pago até agora.</li>
                <li>Se houver entrada, ela será registrada como despesa. O valor total do financiamento NÃO gera despesa imediata.</li>
                <li>Ao pagar as parcelas mês a mês, elas viram despesas em Lançamentos.</li>
              </ul>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={createFinancing.isPending || updateFinancing.isPending}>
            {createFinancing.isPending || updateFinancing.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
            ) : (initialData ? "Salvar Alterações" : "Cadastrar Financiamento")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
