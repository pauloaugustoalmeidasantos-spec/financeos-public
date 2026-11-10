"use client";

import { Target, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface GoalItem {
  id: string;
  name: string;
  type: string;
  percentComplete: number;
  monthsRemaining: number | null;
}

interface Props {
  goals: GoalItem[];
}

const EMOJIS: Record<string, string> = {
  TRAVEL: "✈️",
  CAR: "🚗",
  HOUSE: "🏠",
  EDUCATION: "📚",
  RETIREMENT: "👴",
  EMERGENCY: "🛡️",
  WEDDING: "💒",
  OTHER: "🎯",
};

export function MetasTopWidget({ goals }: Props) {
  if (goals.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6 hover-lift">
        <h3 className="label-uppercase mb-4">Principais Metas</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-150" />
            <div className="relative w-20 h-20 bg-surface-elevated rounded-full flex items-center justify-center">
              <Target className="w-10 h-10 text-foreground-subtle" />
            </div>
          </div>
          <p className="text-sm text-foreground-muted mb-4">Você ainda não criou nenhuma meta</p>
          <Link href="/metas">
            <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Criar primeira meta
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 hover-lift">
      <div className="flex items-center justify-between mb-5">
        <h3 className="label-uppercase">Principais Metas</h3>
        <Link href="/metas" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors">
          Ver todas <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-4">
        {goals.map((goal) => (
          <div key={goal.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{EMOJIS[goal.type] || "🎯"}</span>
                <span className="text-sm font-medium text-foreground">{goal.name}</span>
              </div>
              <span className="text-xs text-foreground-subtle tabular-nums">
                {Math.round(goal.percentComplete)}%
                {goal.monthsRemaining !== null && ` • ${goal.monthsRemaining}m`}
              </span>
            </div>

            <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  goal.percentComplete >= 100
                    ? "bg-success"
                    : goal.percentComplete >= 50
                    ? "bg-primary"
                    : "bg-warning"
                }`}
                style={{ width: `${Math.min(100, goal.percentComplete)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
