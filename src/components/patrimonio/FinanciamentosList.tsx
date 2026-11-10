"use client";

import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, Car, Package, CreditCard, Loader2, MoreVertical, Edit2, Trash2 } from "lucide-react";

interface Props {
  onRefresh: () => void;
  onEdit: (financing: any) => void;
  onDelete: (id: string) => void;
}

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  IMOVEL: { icon: Home, label: "Imóvel", color: "bg-violet-500" },
  VEICULO: { icon: Car, label: "Veículo", color: "bg-blue-500" },
  OUTRO: { icon: Package, label: "Outro", color: "bg-gray-500" },
};

export function FinanciamentosList({ onRefresh, onEdit, onDelete }: Props) {
  const { data: financings = [], isLoading, refetch } = trpc.financing.list.useQuery();
  const payInstallment = trpc.financing.payInstallment.useMutation({
    onSuccess: () => {
      refetch();
      onRefresh();
      toast.success("Parcela paga! Despesa registrada automaticamente.");
    },
    onError: (error) => toast.error(error.message || "Erro ao pagar parcela"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (financings.length === 0) {
    return null; // Don't show anything if no financings
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {financings.map((f: any) => {
          const config = TYPE_CONFIG[f.type] || TYPE_CONFIG.OUTRO;
          const Icon = config.icon;
          const isComplete = f.paidInstallments >= f.totalInstallments;

          return (
            <div key={f.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{f.name}</p>
                    <p className="text-xs text-gray-400">{config.label} · {f.interestRate ? `${f.interestRate}% a.a.` : "Sem juros"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200">Quitado</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">{f.paidInstallments}/{f.totalInstallments}</Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    } />
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => onEdit(f)} className="cursor-pointer">
                        <Edit2 className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(f.id)} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progresso</span>
                  <span className="font-semibold text-gray-900">{f.progress}%</span>
                </div>
                <Progress
                  value={f.progress}
                  className={`h-2 ${f.progress >= 100 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-violet-500"}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Valor Total</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(f.totalValue)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Pago até agora</p>
                  <p className="font-semibold text-emerald-600">{formatCurrency(f.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Parcela Mensal</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(f.monthlyPayment)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Restam</p>
                  <p className="font-semibold text-gray-900">{f.remainingInstallments} parcelas</p>
                </div>
              </div>

              {!isComplete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-100"
                  onClick={() => payInstallment.mutate({ financingId: f.id })}
                  disabled={payInstallment.isPending}
                >
                  {payInstallment.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Pagar Parcela ({formatCurrency(f.monthlyPayment)})
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
