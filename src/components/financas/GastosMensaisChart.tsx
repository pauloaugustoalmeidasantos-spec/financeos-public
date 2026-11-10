"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell } from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { PieChartIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  data: {
    category: string;
    color: string | null;
    total: number;
    count: number;
    percentOfTotal: number;
  }[];
  month: Date;
}

export function GastosMensaisChart({ data, month }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 border border-dashed rounded-xl bg-gray-50/50">
        <PieChartIcon className="w-8 h-8 mb-2 text-gray-300" />
        <span className="text-sm">Sem despesas registradas em {format(month, "MMMM", { locale: ptBR })}</span>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative pt-10">
      <h3 className="text-base font-semibold text-gray-700 absolute top-4 left-4">
        Maiores gastos — {format(month, "MMMM yyyy", { locale: ptBR })}
      </h3>
      
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          layout="vertical"
          margin={{ top: 20, right: 30, left: 30, bottom: 5 }}
        >
          <XAxis type="number" hide />
          <YAxis 
            dataKey="category" 
            type="category" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 13, fill: '#64748b' }}
            width={120}
          />
          <Tooltip 
            cursor={{ fill: 'transparent' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div className="bg-gray-900 text-white text-sm p-2 rounded-lg shadow-lg border-none">
                    <p className="font-bold mb-1">{d.category}</p>
                    <p>Total: {formatCurrency(d.total)}</p>
                    <p className="text-gray-400">Participação: {d.percentOfTotal.toFixed(1)}%</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} isAnimationActive={true}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#cbd5e1'} />
            ))}
            <LabelList 
              dataKey="total" 
              position="right" 
              formatter={(val: any) => formatCurrency(Number(val) || 0)} 
              style={{ fontSize: '12px', fill: '#64748b' }} 
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
