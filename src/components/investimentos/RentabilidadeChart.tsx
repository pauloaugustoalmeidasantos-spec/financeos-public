"use client";

import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import { Loader2 } from "lucide-react";

interface Props {
  assetId: string;
}

export function RentabilidadeChart({ assetId }: Props) {
  const { data, isLoading } = trpc.asset.getPriceHistory.useQuery({ assetId, days: 90 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!data || data.history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm">
        <p className="font-medium">Sem dados históricos</p>
        <p className="text-xs mt-1">Atualize as cotações para começar a gerar o gráfico.</p>
      </div>
    );
  }

  const averagePrice = data.asset.averagePrice;
  const chartData = data.history.map(h => ({
    date: format(new Date(h.date), "dd/MM", { locale: ptBR }),
    rawDate: h.date,
    price: h.price,
    rentabilidade: averagePrice && averagePrice > 0
      ? ((h.price - averagePrice) / averagePrice) * 100
      : 0,
  }));

  const lastPrice = chartData[chartData.length - 1]?.price ?? 0;
  const firstPrice = chartData[0]?.price ?? lastPrice;
  const totalChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const isPositive = totalChange >= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">{data.asset.name} {data.asset.ticker && <span className="font-mono text-sm text-gray-400">({data.asset.ticker})</span>}</h3>
          <p className="text-xs text-gray-500">Últimos 90 dias · {data.asset.quantity} cotas</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900">{formatCurrency(lastPrice)}</p>
          <p className={`text-sm font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
            {isPositive ? "+" : ""}{totalChange.toFixed(2)}% no período
          </p>
        </div>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.2} />
                <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(val) => `R$${val.toFixed(0)}`}
              domain={["auto", "auto"]}
              width={70}
            />
            {averagePrice && averagePrice > 0 && (
              <ReferenceLine
                y={averagePrice}
                stroke="#6366f1"
                strokeDasharray="5 5"
                label={{ value: `PM: R$${averagePrice.toFixed(2)}`, position: "right", fill: "#6366f1", fontSize: 10 }}
              />
            )}
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "13px" }}
              formatter={(value: any) => [formatCurrency(Number(value)), "Preço"]}
              labelFormatter={(label) => `Data: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? "#10b981" : "#ef4444"}
              strokeWidth={2}
              fill="url(#colorPrice)"
              dot={false}
              activeDot={{ r: 4, fill: isPositive ? "#10b981" : "#ef4444" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {averagePrice && averagePrice > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl text-sm">
          <span className="text-gray-500">Preço Médio de Compra</span>
          <span className="font-bold text-indigo-600">{formatCurrency(averagePrice)}</span>
        </div>
      )}
    </div>
  );
}
