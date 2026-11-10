"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface Props {
  total: number;
  change: number;
}

export function PatrimonioWidget({ total, change }: Props) {
  // Mini sparkline data (simulated last 6 months growth based on current value)
  const sparkData = Array.from({ length: 6 }, (_, i) => ({
    value: Math.max(0, total * (0.7 + (i * 0.06))),
  }));

  const isPositive = change >= 0;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 hover-lift">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chart-4/20 to-transparent flex items-center justify-center">
            <Wallet className="w-4 h-4 text-chart-4" />
          </div>
          <span className="label-uppercase">Patrimônio Total</span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPositive ? '+' : ''}{change.toFixed(1)}%
        </div>
      </div>

      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-foreground tracking-tight number-display">{formatCurrency(total)}</p>

        <div className="w-28 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.541 0.281 293.009)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.541 0.281 293.009)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="oklch(0.541 0.281 293.009)"
                strokeWidth={2}
                fill="url(#sparkGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
