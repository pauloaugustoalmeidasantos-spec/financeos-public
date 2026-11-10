"use client";

import { GoalProgress } from "./GoalProgress";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Plus, Edit2, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const ICONS: Record<string, string> = {
  TRAVEL: "✈️",
  CAR: "🚗",
  HOUSE: "🏠",
  RETIREMENT: "🏖️",
  EDUCATION: "📚",
  EMERGENCY: "🛡️",
  BUSINESS: "💼",
  OTHER: "🎯",
};

interface Props {
  goal: any;
  onAddContribution: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function GoalCard({ goal, onAddContribution, onEdit, onDelete }: Props) {
  const isCompleted = goal.percentComplete >= 100;

  return (
    <div className={`bg-white rounded-2xl p-5 border ${isCompleted ? 'border-emerald-300 bg-emerald-50/20' : 'border-gray-200'} shadow-sm relative flex flex-col justify-between h-full group hover:shadow-md transition-shadow`}>
      
      {isCompleted && (
        <div className="absolute -top-3 -right-3 z-10">
          <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg border-2 border-white">
            Concluída 🎉
          </span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm ${isCompleted ? 'bg-emerald-100' : 'bg-gray-100'}`}>
            {ICONS[goal.type] || "🎯"}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 leading-tight flex items-center gap-2">
              {goal.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm ${
                goal.priority === 1 ? 'bg-red-100 text-red-700' : 
                goal.priority === 2 ? 'bg-yellow-100 text-yellow-700' : 
                'bg-blue-100 text-blue-700'
              }`}>
                {goal.priority === 1 ? 'Alta' : goal.priority === 2 ? 'Média' : 'Baixa'}
              </span>

              {!isCompleted && (
                <Badge variant={goal.isViable ? "outline" : "destructive"} className={`text-[10px] ${goal.isViable ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : ''}`}>
                  {goal.isViable ? 'Viável ✓' : 'Revisar ⚠'}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          {/* @ts-ignore */}
          {/* @ts-ignore */}
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900" />}>
             <MoreVertical className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
              <Edit2 className="w-4 h-4 mr-2 text-blue-500" />
              Editar Meta
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress Line */}
      <GoalProgress 
        current={goal.currentAmount}
        target={goal.targetAmount}
        percentComplete={goal.percentComplete}
      />

      {/* Footer Computations */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 -mx-5 -mb-5 p-5 rounded-b-2xl">
        {!isCompleted ? (
          <div className="text-xs text-gray-600">
            Faltam <span className="font-bold text-gray-900">{formatCurrency(goal.targetAmount - goal.currentAmount)}</span>
            {goal.monthsRemaining ? (
               <span className="block mt-0.5">em {goal.monthsRemaining} meses • <span className={!goal.isViable ? 'text-red-500 font-bold' : ''}>{formatCurrency(goal.monthlyNeeded)}/mês req.</span></span>
            ) : (
               <span className="block mt-0.5 italic">Sem prazo definido</span>
            )}
          </div>
        ) : (
          <div className="text-xs font-bold text-emerald-600">
            Você atingiu seu objetivo!
          </div>
        )}

        <Button 
          size="sm" 
          variant={isCompleted ? "outline" : "default"}
          onClick={onAddContribution}
          className={`h-8 px-3 rounded-md ${isCompleted ? 'hover:bg-emerald-50 hover:text-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Aporte
        </Button>
      </div>
    </div>
  );
}
