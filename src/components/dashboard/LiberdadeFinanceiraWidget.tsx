"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { Shield } from "lucide-react";

interface Props {
  percent: number;
  have: number;
  need: number;
  missing: number;
  retirementNeeded: number;
}

export function LiberdadeFinanceiraWidget({ percent, have, need, missing, retirementNeeded }: Props) {
  const data = [
    { name: "Alcançado", value: percent },
    { name: "Restante", value: Math.max(0, 100 - percent) },
  ];

  return (
    <div className="bg-surface border border-border rounded-xl p-5 hover-lift">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <span className="label-uppercase">Liberdade Financeira</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative w-36 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                startAngle={90}
                endAngle={-270}
                paddingAngle={2}
                dataKey="value"
              >
                <Cell fill="oklch(0.546 0.245 262.881)" />
                <Cell fill="oklch(0.922 0 0)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-foreground number-display">{Math.round(percent)}%</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="group cursor-default">
            <p className="label-uppercase">Tenho</p>
            <p className="text-sm font-bold text-success group-hover:brightness-110 transition-all number-display">{formatCurrency(have)}</p>
          </div>
          <div className="group cursor-default">
            <p className="label-uppercase">Falta</p>
            <p className="text-sm font-bold text-foreground-subtle group-hover:text-danger transition-colors number-display">{formatCurrency(missing)}</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-foreground-subtle mt-4 text-center">
        Precisa de <span className="font-semibold text-foreground-muted">{formatCurrency(retirementNeeded)}</span> para independência
      </p>
    </div>
  );
}
