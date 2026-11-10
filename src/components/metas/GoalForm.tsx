"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoalCreateSchema } from "@/validations/goal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { calculateGoalMonthlyNeeded } from "@/lib/financial";
import { differenceInMonths } from "date-fns";
import { formatCurrency } from "@/lib/formatters";
import { trpc } from "@/lib/trpc-client";
import { z } from "zod";

interface Props {
  goal: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  annualRate: number; // Provided by container Profile query
}

export function GoalForm({ goal, isOpen, onClose, onSuccess, annualRate }: Props) {
  const isEditing = !!goal;

  const form = useForm<any>({
    resolver: zodResolver(GoalCreateSchema),
    defaultValues: {
      name: "",
      type: "OTHER",
      description: "",
      targetAmount: 0,
      currentAmount: 0,
      priority: 3,
      affectsPlanning: true,
      isActive: true,
    }
  });

  // Hydrate form when editing
  useEffect(() => {
    if (goal && isOpen) {
      form.reset({
        name: goal.name,
        type: goal.type,
        description: goal.description || "",
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        priority: goal.priority,
        affectsPlanning: goal.affectsPlanning,
        isActive: goal.isActive,
        deadline: goal.deadline ? new Date(goal.deadline) : undefined,
      });
    } else if (!goal && isOpen) {
      form.reset({
        name: "",
        type: "OTHER",
        description: "",
        targetAmount: 0,
        currentAmount: 0,
        priority: 3,
        affectsPlanning: true,
        isActive: true,
      });
    }
  }, [goal, isOpen, form]);

  const targetAmount = form.watch("targetAmount");
  const currentAmount = form.watch("currentAmount");
  const deadline = form.watch("deadline");

  const [monthlyNeeded, setMonthlyNeeded] = useState(0);

  useEffect(() => {
    if (deadline && targetAmount > 0) {
      let diff = differenceInMonths(new Date(deadline), new Date());
      diff = Math.max(1, diff);
      const needed = calculateGoalMonthlyNeeded(targetAmount, currentAmount || 0, diff, annualRate);
      setMonthlyNeeded(needed);
    } else {
      setMonthlyNeeded(0);
    }
  }, [targetAmount, currentAmount, deadline, annualRate]);

  const createGoal = trpc.goal.create.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    }
  });

  const updateGoal = trpc.goal.update.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    }
  });

  const onSubmit = (data: any) => {
    if (isEditing) {
      updateGoal.mutate({ id: goal.id, ...data });
    } else {
      createGoal.mutate(data);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Editar Meta" : "Criar Nova Meta"}</SheetTitle>
          <SheetDescription>
            Planeje seu objetivo definindo prazos e valores.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
          <div className="space-y-2">
            <Label>Nome do Projeto</Label>
            <Input {...form.register("name")} placeholder="Ex: Viagem Europa, Carro..." />
            {form.formState.errors.name && <p className="text-red-500 text-xs">{String(form.formState.errors.name.message)}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRAVEL">✈️ Viagem</SelectItem>
                      <SelectItem value="CAR">🚗 Veículo</SelectItem>
                      <SelectItem value="HOUSE">🏠 Imóvel</SelectItem>
                      <SelectItem value="RETIREMENT">🏖️ Aposentadoria</SelectItem>
                      <SelectItem value="EDUCATION">📚 Educação</SelectItem>
                      <SelectItem value="EMERGENCY">🛡️ Emergência</SelectItem>
                      <SelectItem value="BUSINESS">💼 Negócio</SelectItem>
                      <SelectItem value="OTHER">🎯 Outro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
               <Label>Data Limite</Label>
               <Controller
                 control={form.control}
                 name="deadline"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Alvo (R$)</Label>
              <Controller
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                  <CurrencyInput value={field.value} onChange={field.onChange} />
                )}
              />
              {form.formState.errors.targetAmount && <p className="text-red-500 text-xs">{String(form.formState.errors.targetAmount.message)}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Já Guardado (R$)</Label>
              <Controller
                control={form.control}
                name="currentAmount"
                render={({ field }) => (
                  <CurrencyInput value={field.value || 0} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          {monthlyNeeded > 0 && deadline && (
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-sm text-indigo-900 shadow-sm">
              <p className="font-semibold text-xs text-indigo-700 uppercase tracking-wider mb-1">Simulação ao vivo</p>
              Você precisará poupar <span className="font-bold">{formatCurrency(monthlyNeeded)}/mês</span> para atingir esta meta na data estipulada.
            </div>
          )}

          <div className="space-y-3">
            <Label>Prioridade</Label>
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <RadioGroup 
                  onValueChange={(val) => field.onChange(parseInt(val))} 
                  defaultValue={field.value.toString()} 
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2 border p-2 rounded-md">
                    <RadioGroupItem value="1" id="p1" />
                    <Label htmlFor="p1" className="cursor-pointer font-bold text-red-600">Alta <span className="font-normal text-gray-500 ml-1">(Foco Máximo)</span></Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-2 rounded-md">
                    <RadioGroupItem value="2" id="p2" />
                    <Label htmlFor="p2" className="cursor-pointer font-bold text-yellow-600">Média <span className="font-normal text-gray-500 ml-1">(Equilibrado)</span></Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-2 rounded-md">
                    <RadioGroupItem value="3" id="p3" />
                    <Label htmlFor="p3" className="cursor-pointer font-bold text-blue-600">Baixa <span className="font-normal text-gray-500 ml-1">(Longo Prazo)</span></Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>

          <div className="flex items-center justify-between border shadow-sm p-4 rounded-xl">
            <div className="space-y-0.5">
              <Label className="text-sm">Computar no Patrimônio Geral</Label>
              <p className="text-xs text-gray-500">Se ativo, a barra do "Meu Futuro" subtrai este valor.</p>
            </div>
            <Controller
              control={form.control}
              name="affectsPlanning"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <Button type="submit" className="w-full" disabled={createGoal.isPending || updateGoal.isPending}>
            {isEditing ? "Salvar Alterações" : "Criar Meta"}
          </Button>

        </form>
      </SheetContent>
    </Sheet>
  );
}
