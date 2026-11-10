"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AssetCreateSchema } from "@/validations/asset";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { trpc } from "@/lib/trpc-client";

const CATEGORIES: Record<string, { label: string; value: string }[]> = {
  FINANCIAL: [
    { label: "Ações", value: "Ações" },
    { label: "FIIs", value: "FIIs" },
    { label: "Renda Fixa", value: "Renda Fixa" },
    { label: "Tesouro Direto", value: "Tesouro Direto" },
    { label: "Crypto", value: "Crypto" },
    { label: "ETF", value: "ETF" },
    { label: "Previdência", value: "Previdência" },
    { label: "Outros", value: "Outros" },
  ],
  PHYSICAL: [
    { label: "Imóvel Residencial", value: "Imóvel Residencial" },
    { label: "Imóvel Comercial", value: "Imóvel Comercial" },
    { label: "Veículo", value: "Veículo" },
    { label: "Outros", value: "Outros" },
  ],
  BUSINESS: [
    { label: "Participação Societária", value: "Participação Societária" },
    { label: "MEI", value: "MEI" },
    { label: "Outros", value: "Outros" },
  ],
};

interface Props {
  asset: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssetForm({ asset, isOpen, onClose, onSuccess }: Props) {
  const isEditing = !!asset;
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(AssetCreateSchema),
    defaultValues: {
      name: "",
      type: "FINANCIAL",
      category: "",
      currentValue: 0,
      purchaseValue: undefined,
      description: "",
      ticker: "",
      broker: "",
    },
  });

  const selectedType = form.watch("type") || "FINANCIAL";

  useEffect(() => {
    if (asset && isOpen) {
      setIsCustomCategory(false);
      form.reset({
        name: asset.name,
        type: asset.type,
        category: asset.category || "",
        currentValue: asset.currentValue,
        purchaseValue: asset.purchaseValue || undefined,
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : undefined,
        description: asset.description || "",
        ticker: asset.ticker || "",
        broker: asset.broker || "",
      });
    } else if (!asset && isOpen) {
      setIsCustomCategory(false);
      form.reset({
        name: "",
        type: "FINANCIAL",
        category: "",
        currentValue: 0,
        purchaseValue: undefined,
        description: "",
        ticker: "",
        broker: "",
      });
    }
  }, [asset, isOpen, form]);

  const createAsset = trpc.asset.create.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const updateAsset = trpc.asset.update.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  const onSubmit = (data: any) => {
    // Clean optional empty strings
    const cleaned = {
      ...data,
      ticker: data.ticker || undefined,
      broker: data.broker || undefined,
      description: data.description || undefined,
      purchaseValue: data.purchaseValue || undefined,
    };

    if (isEditing) {
      updateAsset.mutate({ id: asset.id, ...cleaned });
    } else {
      createAsset.mutate(cleaned);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Editar Ativo" : "Cadastrar Novo Ativo"}</SheetTitle>
          <SheetDescription>Registre seu bem para rastrear seu patrimônio consolidado.</SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-6">
          <div className="space-y-2">
            <Label>Nome do Ativo</Label>
            <Input {...form.register("name")} placeholder="Ex: PETR4, Apartamento Centro..." />
            {form.formState.errors.name && <p className="text-red-500 text-xs">{String((form.formState.errors.name as any).message)}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select onValueChange={(v) => { field.onChange(v); form.setValue("category", ""); }} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FINANCIAL">📈 Financeiro</SelectItem>
                      <SelectItem value="PHYSICAL">🏠 Bem Físico</SelectItem>
                      <SelectItem value="BUSINESS">💼 Negócio</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              {!isCustomCategory ? (
                <Controller
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <Select 
                      onValueChange={(v) => {
                        if (v === "__CUSTOM__") {
                          setIsCustomCategory(true);
                          field.onChange("");
                        } else {
                          field.onChange(v);
                        }
                      }} 
                      value={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {(CATEGORIES[selectedType] || []).map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                        <SelectItem value="__CUSTOM__" className="text-indigo-600 font-medium border-t mt-1 pt-1">
                          📝 Nova Categoria...
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : (
                <div className="flex gap-2">
                  <Input
                    {...form.register("category")}
                    placeholder="Nome da categoria..."
                    autoFocus
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => { setIsCustomCategory(false); form.setValue("category", ""); }}
                  >
                    Voltar
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Atual (R$)</Label>
              <Controller
                control={form.control}
                name="currentValue"
                render={({ field }) => (
                  <CurrencyInput value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor de Compra (R$)</Label>
              <Controller
                control={form.control}
                name="purchaseValue"
                render={({ field }) => (
                  <CurrencyInput value={field.value || 0} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data de Compra</Label>
            <Controller
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <Input
                  type="date"
                  value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                />
              )}
            />
          </div>

          {selectedType === "FINANCIAL" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ticker</Label>
                <Input {...form.register("ticker")} placeholder="Ex: PETR4, HGLG11..." />
              </div>
              <div className="space-y-2">
                <Label>Corretora</Label>
                <Input {...form.register("broker")} placeholder="Ex: XP, Nu Invest..." />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Descrição (Opcional)</Label>
            <Textarea {...form.register("description")} placeholder="Detalhes sobre o ativo..." className="resize-none" rows={2} />
          </div>

          <Button type="submit" className="w-full" disabled={createAsset.isPending || updateAsset.isPending}>
            {isEditing ? "Salvar Alterações" : "Cadastrar Ativo"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
