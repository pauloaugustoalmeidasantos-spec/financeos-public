"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface ProjectionPoint {
  age: number;
  year: number;
  projectedTotal: number;
  principalInvested: number;
  retirementIdeal: number;
  debt: number;
}

interface Props {
  data: ProjectionPoint[];
  currentAge: number;
  retirementAge: number;
  goals: any[];
  showGoals: boolean;
}

export function ProjecaoChart({ data, currentAge, retirementAge, goals, showGoals }: Props) {
  const chartData = data.map(d => ({
    ...d,
    chartedDebt: d.debt > 0 ? -d.debt : 0, // Plot debt as negative area
  }));
  const hasDebt = chartData.some(d => d.debt > 0);

  return (
    <div className="w-full h-[400px] bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
        >
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <XAxis 
            dataKey="age" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "#64748b", fontSize: 14 }} 
            minTickGap={20}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(val) => `R$ ${(Math.abs(val)/1000).toFixed(0)}k`} 
            tick={{ fill: "#94a3b8", fontSize: 13 }} 
            width={70}
          />

          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as any;
                return (
                  <div className="bg-gray-900 text-white text-sm p-3 rounded-xl shadow-lg border-none min-w-[220px]">
                    <p className="font-bold mb-2 capitalize text-gray-300">
                      Aos {d.age} anos ({d.year})
                    </p>
                    {d.projectedTotal > 0 && (
                      <div className="flex justify-between gap-4 mb-1">
                        <span className="text-emerald-400">Total Projetado</span>
                        <span className="font-semibold">{formatCurrency(d.projectedTotal)}</span>
                      </div>
                    )}
                    {d.principalInvested > 0 && (
                      <div className="flex justify-between gap-4 mb-1">
                        <span className="text-blue-400">Total Investido</span>
                        <span className="font-semibold">{formatCurrency(d.principalInvested)}</span>
                      </div>
                    )}
                    {d.debt > 0 && (
                      <div className="flex justify-between gap-4 mb-1">
                        <span className="text-red-400">Dívida (Vermelho)</span>
                        <span className="font-semibold text-red-300">-{formatCurrency(d.debt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-4 border-t border-gray-700 pt-2 mt-2">
                      <span className="text-orange-400 font-bold">Ideal</span>
                      <span className="font-bold">{formatCurrency(d.retirementIdeal)}</span>
                    </div>
                  </div>
                );
              }
              return null;
            }} 
          />

          <ReferenceLine 
            x={currentAge} 
            stroke="#94a3b8" 
            strokeDasharray="3 3" 
            label={{ position: "top", value: "Hoje", fill: "#94a3b8", fontSize: 14 }} 
          />

          {showGoals && goals.length > 0 && goals.filter(g => g.deadline && g.affectsPlanning).map((g, i) => {
            const goalDate = new Date(g.deadline);
            const today = new Date();
            const yearDiff = goalDate.getFullYear() - today.getFullYear();
            const goalAge = currentAge + yearDiff;
            
            return (
              <ReferenceLine 
                key={i} 
                x={goalAge} 
                stroke="#FCD34D" 
                strokeDasharray="4 4"
                label={{ 
                  position: "insideTopLeft", 
                  value: `💰 ${g.name}`, 
                  fill: "#D97706", 
                  fontSize: 12 
                }} 
              />
            );
          })}

          <Area 
            type="linear" 
            dataKey="retirementIdeal" 
            stroke="#F97316" 
            strokeDasharray="5 5" 
            fill="none" 
            strokeWidth={2}
          />
          
          <Area 
            type="linear" 
            dataKey="projectedTotal" 
            stroke="#22C55E" 
            fillOpacity={1} 
            fill="url(#colorTotal)" 
            strokeWidth={2}
          />
          
          <Area 
            type="linear" 
            dataKey="principalInvested" 
            stroke="#3B82F6" 
            fillOpacity={1} 
            fill="url(#colorPrincipal)" 
            strokeWidth={2}
          />

          {/* Dívida — linha vermelha mostrando amortização abaixo de zero */}
          {hasDebt && (
            <Area 
              type="linear" 
              dataKey="chartedDebt" 
              stroke="#EF4444" 
              fillOpacity={1} 
              fill="url(#colorDebt)" 
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
