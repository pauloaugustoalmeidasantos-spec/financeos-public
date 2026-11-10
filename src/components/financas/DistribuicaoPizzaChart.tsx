"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { PieChartIcon } from "lucide-react";

interface Props {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
}

export function DistribuicaoPizzaChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 border border-dashed rounded-xl bg-gray-50/50">
        <PieChartIcon className="w-8 h-8 mb-2 text-gray-300" />
        <span className="text-sm">Gráfico indisponível</span>
      </div>
    );
  }

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="h-[300px] w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative pt-10">
      <h3 className="text-base font-semibold text-gray-700 absolute top-4 left-4">
        Destino das Despesas
      </h3>

      {/* Central Label Manual Trick since native center label is tricky with responsive donut */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
        <span className="text-sm text-gray-400 font-medium">TOTAL</span>
        <span className="text-base font-bold text-gray-900">{formatCurrency(total)}</span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
            isAnimationActive={true}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#cbd5e1'} />
            ))}
          </Pie>
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div className="bg-gray-900 text-white text-sm p-2 rounded-lg shadow-lg border-none">
                    <p className="font-bold flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }}></span>
                      {d.name}
                    </p>
                    <p>{formatCurrency(d.value)} ({(d.value/total * 100).toFixed(0)}%)</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            formatter={(value, entry: any) => <span className="text-sm text-gray-600 font-medium ml-1">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
