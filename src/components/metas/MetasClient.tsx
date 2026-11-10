"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { GoalCard } from "./GoalCard";
import { GoalForm } from "./GoalForm";
import { GoalContributionForm } from "./GoalContributionForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function MetasClient() {
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  
  const { data: goals, refetch, isLoading } = trpc.goal.list.useQuery();
  const { data: user } = trpc.user.getProfile.useQuery();
  
  const deleteGoal = trpc.goal.delete.useMutation({ onSuccess: () => refetch() });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<any | null>(null);

  const [contributionData, setContributionData] = useState<{ id: string; target: number; current: number; name: string } | null>(null);

  const openNew = () => {
    setGoalToEdit(null);
    setIsFormOpen(true);
  };

  const openEdit = (g: any) => {
    setGoalToEdit(g);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta meta? Todo o caixa guardado nela evaporará dos cálculos!")) {
      deleteGoal.mutate({ id });
    }
  };

  const annualRate = user?.profile?.interestRate ? Number(user.profile.interestRate) / 100 : 0.08;

  return (
    <div className="container max-w-6xl mx-auto py-6 md:py-10 space-y-8 px-4 md:px-0">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Minhas Metas</h1>
          <p className="text-gray-500 mt-1">Concretize sonhos criando caixas separadas e acompanhe seus preenchimentos mensais.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* @ts-ignore */}
          <ToggleGroup type="single" value={viewMode as any} onValueChange={(v: any) => v && setViewMode(v)}>
            <ToggleGroupItem value="cards" className="text-xs">Cards</ToggleGroupItem>
            <ToggleGroupItem value="table" className="text-xs">Resumo</ToggleGroupItem>
          </ToggleGroup>
          
          <Button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Meta
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!isLoading && goals?.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum projeto ativo</h3>
            <p className="text-gray-500 mb-6 max-w-md text-center">
              Pare de gastar dinheiro solto! Crie um cofre para a sua próxima viagem ou para seu novo carro.
            </p>
            <Button onClick={openNew} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              Criar Primeiro Projeto
            </Button>
          </div>
        )}

        {goals?.map((goal) => (
          <GoalCard 
            key={goal.id} 
            goal={goal}
            onEdit={() => openEdit(goal)}
            onDelete={() => handleDelete(goal.id)}
            onAddContribution={() => setContributionData({
              id: goal.id,
              target: goal.targetAmount,
              current: goal.currentAmount,
              name: goal.name
            })}
          />
        ))}
      </div>

      {/* Sheet Modal - Formulario Meta */}
      <GoalForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => refetch()}
        goal={goalToEdit}
        annualRate={annualRate}
      />

      {/* Dialog - Aporte de Dinheiro */}
      {contributionData && (
        <GoalContributionForm 
          isOpen={true}
          onClose={() => setContributionData(null)}
          onSuccess={() => refetch()}
          goalId={contributionData.id}
          targetAmount={contributionData.target}
          currentAmount={contributionData.current}
          name={contributionData.name}
        />
      )}

    </div>
  );
}
