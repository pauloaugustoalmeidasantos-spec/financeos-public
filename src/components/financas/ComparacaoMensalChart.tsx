"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  data: {
    month: Date;
    totalIncome: number;
    totalExpenses: number;
    balance: number;
  }[];
}

export function ComparacaoMensalChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 border border-dashed rounded-xl bg-gray-50/50">
        <Activity className="w-8 h-8 mb-2 text-gray-300" />
        <span className="text-sm">Sem histórico disponível</span>
      </div>
    );
  }

  const chartData = data.map(d => ({
    rawDate: d.month,
    name: format(d.month, "MMM", { locale: ptBR }).substring(0,3).toUpperCase(),
    Receitas: d.totalIncome,
    Despesas: d.totalExpenses,
    balance: d.balance
  }));

  return (
    <div className="h-[350px] w-full bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative pt-12 mt-6">
      <h3 className="text-base font-semibold text-gray-700 absolute top-4 left-6">
        Histórico Semestral (Visão Geral)
      </h3>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData} 
          margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 14, fill: '#64748b' }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#94a3b8' }} 
            tickFormatter={(val) => `R$ ${val/1000}k`}
          />
          <Tooltip 
            cursor={{ fill: '#f8fafc' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div className="bg-gray-900 text-white text-sm p-3 rounded-xl shadow-lg border-none min-w-[150px]">
                    <p className="font-bold mb-2 capitalize text-gray-300">{format(d.rawDate, "MMMM yyyy", { locale: ptBR })}</p>
                    <div className="flex justify-between gap-4 mb-1">
                      <span className="text-emerald-400">Receitas</span>
                      <span className="font-semibold">{formatCurrency(d.Receitas)}</span>
                    </div>
                    <div className="flex justify-between gap-4 mb-2 pb-2 border-b border-gray-700">
                      <span className="text-red-400">Despesas</span>
                      <span className="font-semibold">{formatCurrency(d.Despesas)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-300">Saldo Liquido</span>
                      <span className={`font-bold ${d.balance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatCurrency(d.balance)}
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
          <ReferenceLine y={0} stroke="#cbd5e1" />
          
          <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={true} />
          <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={true} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
