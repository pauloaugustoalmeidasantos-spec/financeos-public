"use client";

import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { Save } from "lucide-react";
import { CurrencyInput } from "@/components/shared/CurrencyInput";

interface Props {
  retirementAge: number;
  setRetirementAge: (v: number) => void;
  desiredMonthlyIncome: number;
  setDesiredMonthlyIncome: (v: number) => void;
  otherIncome: number;
  setOtherIncome: (v: number) => void;
  monthlyInvestment: number;
  setMonthlyInvestment: (v: number) => void;
  interestRate: number;
  setInterestRate: (v: number) => void;
  inflationRate: number;
  setInflationRate: (v: number) => void;
  onSave: () => void;
  isSaving: boolean;
  requiredMonthlyInvestment: number;
  targetPatrimony: number;
  netDesiredIncome: number;
}

export function IndependenciaSliders({
  retirementAge, setRetirementAge,
  desiredMonthlyIncome, setDesiredMonthlyIncome,
  otherIncome, setOtherIncome,
  monthlyInvestment, setMonthlyInvestment,
  interestRate, setInterestRate,
  inflationRate, setInflationRate,
  onSave, isSaving, requiredMonthlyInvestment, targetPatrimony, netDesiredIncome
}: Props) {
  
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Variáveis de Independência</h2>
        <p className="text-xs text-gray-500 mt-1">Simule cenários ajustando os motores de acumulação.</p>
      </div>

      <div className="px-5 py-4 flex-1 space-y-5 overflow-y-auto">
        
        {/* Idade Alvo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Idade Alvo</label>
            <div className="flex items-center gap-1.5 shrink-0">
              <input 
                type="number"
                value={retirementAge ?? ""}
                onChange={(e) => setRetirementAge(e.target.value === "" ? 0 : Number(e.target.value))}
                className="w-14 h-7 text-center text-sm font-bold text-purple-700 bg-purple-50 px-1 rounded-md outline-none focus:ring-2 focus:ring-purple-200"
              />
              <span className="text-xs font-bold text-purple-600">anos</span>
            </div>
          </div>
          <Slider 
            value={[retirementAge || 0]} 
            min={18} max={150} step={1}
            onValueChange={(val: any) => setRetirementAge(Array.isArray(val) ? val[0] : val)}
            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
          />
        </div>

        {/* Aporte Mensal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Aporte Mensal</label>
            <CurrencyInput 
              value={monthlyInvestment}
              onChange={setMonthlyInvestment}
              className="w-36 h-7 text-right text-sm font-bold text-emerald-700 bg-emerald-50 border-none outline-none"
            />
          </div>
          <Slider 
            value={[monthlyInvestment || 0]} 
            min={0} max={50000} step={100}
            onValueChange={(val: any) => setMonthlyInvestment(Array.isArray(val) ? val[0] : val)}
            className="[&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:border-emerald-500"
          />
        </div>

        {/* Taxa de Juros */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Taxa de Juros (a.a.)</label>
            <div className="flex items-center gap-1.5 shrink-0">
              <input 
                type="number"
                value={interestRate ?? ""}
                onChange={(e) => setInterestRate(e.target.value === "" ? 0 : Number(e.target.value))}
                className="w-14 h-7 text-center text-sm font-bold text-teal-700 bg-teal-50 px-1 rounded-md outline-none focus:ring-2 focus:ring-teal-200"
              />
              <span className="text-xs font-bold text-teal-600">%</span>
            </div>
          </div>
          <Slider 
            value={[interestRate || 0]} 
            min={1} max={20} step={0.1}
            onValueChange={(val: any) => setInterestRate(Array.isArray(val) ? val[0] : val)}
            className="[&_[role=slider]]:bg-teal-500 [&_[role=slider]]:border-teal-500"
          />
        </div>

        {/* Inflação */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Inflação (a.a.)</label>
            <div className="flex items-center gap-1.5 shrink-0">
              <input 
                type="number"
                value={inflationRate ?? ""}
                onChange={(e) => setInflationRate(e.target.value === "" ? 0 : Number(e.target.value))}
                className="w-14 h-7 text-center text-sm font-bold text-red-700 bg-red-50 px-1 rounded-md outline-none focus:ring-2 focus:ring-red-200"
              />
              <span className="text-xs font-bold text-red-600">%</span>
            </div>
          </div>
          <Slider 
            value={[inflationRate || 0]} 
            min={1} max={20} step={0.1}
            onValueChange={(val: any) => setInflationRate(Array.isArray(val) ? val[0] : val)}
            className="[&_[role=slider]]:bg-red-500 [&_[role=slider]]:border-red-500"
          />
        </div>

        {/* Renda Desejada */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Renda Desejada</label>
            <CurrencyInput 
              value={desiredMonthlyIncome}
              onChange={setDesiredMonthlyIncome}
              className="w-36 h-7 text-right text-sm font-bold text-orange-700 bg-orange-50 border-none outline-none"
            />
          </div>
          <Slider 
            value={[desiredMonthlyIncome || 0]} 
            min={0} max={100000} step={500}
            onValueChange={(val: any) => setDesiredMonthlyIncome(Array.isArray(val) ? val[0] : val)}
            className="[&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-500"
          />
          <p className="text-xs text-right text-gray-500">
            Requer <span className="font-semibold text-gray-700">{formatCurrency(targetPatrimony)}</span> acumulados
          </p>
        </div>

        {/* Renda Passiva Extra */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Renda Passiva Extra</label>
            <CurrencyInput 
              value={otherIncome}
              onChange={setOtherIncome}
              className="w-36 h-7 text-right text-sm font-bold text-blue-700 bg-blue-50 border-none outline-none"
            />
          </div>
          <Slider 
            value={[otherIncome || 0]} 
            min={0} max={50000} step={500}
            onValueChange={(val: any) => setOtherIncome(Array.isArray(val) ? val[0] : val)}
            className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-500"
          />
          {otherIncome > 0 && (
            <p className="text-xs text-gray-500">
              Necessário dos investimentos: <span className="font-semibold text-blue-700">{formatCurrency(netDesiredIncome)}</span>/mês
            </p>
          )}
        </div>

      </div>

      {/* Recap & Save */}
      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
        <div className="text-sm text-center text-gray-600">
          Você precisa ter <span className="font-bold text-gray-900">{formatCurrency(targetPatrimony)}</span> acumulados. <br />
          Para chegar lá de forma segura, invista ao menos <span className="font-bold text-red-500">{formatCurrency(requiredMonthlyInvestment)}</span>/mês.
        </div>
        
        <Button onClick={onSave} disabled={isSaving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Gravando..." : "Salvar Premissas"}
        </Button>
      </div>
    </div>
  );
}
