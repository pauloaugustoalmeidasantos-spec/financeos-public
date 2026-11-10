"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface AppreciationItem {
  name: string;
  currentValue: number;
  purchaseValue: number;
  appreciation: number;
}

interface Props {
  data: AppreciationItem[];
}

const COLORS_POSITIVE = ["#22c55e", "#10b981", "#059669", "#047857", "#16a34a"];
const COLORS_NEGATIVE = ["#ef4444", "#dc2626", "#b91c1c", "#f87171", "#e11d48"];

export function PatrimonioGrowthChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        <div className="text-center">
          <p className="font-medium">Sem dados de valorização</p>
          <p className="text-xs mt-1">Cadastre ativos com valor de compra para acompanhar a evolução</p>
        </div>
      </div>
    );
  }

  // Sort by appreciation descending
  const sorted = [...data].sort((a, b) => b.appreciation - a.appreciation);

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={(val) => `${val.toFixed(0)}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#374151", fontSize: 13, fontWeight: 500 }}
            width={120}
          />
          <ReferenceLine x={0} stroke="#d1d5db" />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as AppreciationItem;
                return (
                  <div className="bg-gray-900 text-white text-sm p-3 rounded-xl shadow-lg border-none min-w-[220px]">
                    <p className="font-bold mb-2 text-gray-300">{d.name}</p>
                    <div className="flex justify-between gap-4 mb-1">
                      <span className="text-gray-400">Valor de Compra</span>
                      <span>{formatCurrency(d.purchaseValue)}</span>
                    </div>
                    <div className="flex justify-between gap-4 mb-1">
                      <span className="text-gray-400">Valor Atual</span>
                      <span>{formatCurrency(d.currentValue)}</span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-gray-700 pt-2 mt-2">
                      <span className={d.appreciation >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                        Valorização
                      </span>
                      <span className="font-bold">
                        {d.appreciation >= 0 ? "+" : ""}{d.appreciation.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="appreciation" radius={[0, 6, 6, 0]} barSize={24}>
            {sorted.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.appreciation >= 0
                  ? COLORS_POSITIVE[index % COLORS_POSITIVE.length]
                  : COLORS_NEGATIVE[index % COLORS_NEGATIVE.length]
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
