"use client";

import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Equal } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface Props {
  income: number;
  expenses: number;
  balance: number;
  prevBalance: number;
}

export function ResumoMensalWidget({ income, expenses, balance, prevBalance }: Props) {
  const balancePositive = balance >= 0;
  const changeVsPrev = prevBalance !== 0
    ? ((balance - prevBalance) / Math.abs(prevBalance)) * 100
    : 0;
  const changePositive = changeVsPrev >= 0;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 hover-lift">
      <h3 className="label-uppercase mb-5">Resumo do Mês</h3>

      <div className="grid grid-cols-3 gap-4">
        {/* Receitas */}
        <div className="text-center p-4 bg-success/10 rounded-xl">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <ArrowUpRight className="w-4 h-4 text-success" />
            <span className="text-xs font-medium text-success">Receitas</span>
          </div>
          <p className="text-lg font-bold text-success number-display">+ {formatCurrency(income)}</p>
        </div>

        {/* Despesas */}
        <div className="text-center p-4 bg-danger/10 rounded-xl">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <ArrowDownRight className="w-4 h-4 text-danger" />
            <span className="text-xs font-medium text-danger">Despesas</span>
          </div>
          <p className="text-lg font-bold text-danger number-display">- {formatCurrency(expenses)}</p>
        </div>

        {/* Saldo */}
        <div className={`text-center p-4 rounded-xl ${balancePositive ? 'bg-primary/10' : 'bg-warning/10'}`}>
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Equal className="w-4 h-4 text-foreground-muted" />
            <span className="text-xs font-medium text-foreground-muted">Saldo</span>
          </div>
          <p className={`text-lg font-bold number-display ${balancePositive ? 'text-primary' : 'text-warning'}`}>
            {balancePositive ? '+ ' : '- '}{formatCurrency(Math.abs(balance))}
          </p>
          {changeVsPrev !== 0 && (
            <div className={`flex items-center justify-center gap-1 mt-1 text-[10px] font-semibold ${changePositive ? 'text-success' : 'text-danger'}`}>
              {changePositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {changePositive ? '+' : ''}{changeVsPrev.toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
