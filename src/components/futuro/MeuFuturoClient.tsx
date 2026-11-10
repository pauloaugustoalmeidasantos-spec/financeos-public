"use client";

import { useEffect, useState, useMemo } from "react";
import { trpc } from "@/lib/trpc-client";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/shared/ChartSkeleton";

const ProjecaoChart = dynamic(
  () => import("./ProjecaoChart").then((m) => m.ProjecaoChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
import { IndependenciaSliders } from "./IndependenciaSliders";
import { calculatePatrimonyProjection, calculateFinancialFreedomProgress } from "@/lib/financial";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GoalCard } from "@/components/metas/GoalCard";
import { GoalForm } from "@/components/metas/GoalForm";
import { GoalContributionForm } from "@/components/metas/GoalContributionForm";
import { Button } from "@/components/ui/button";
import { Plus, Target, TrendingUp, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface ProjectionPoint {
  age: number;
  year: number;
  projectedTotal: number;
  principalInvested: number;
  retirementIdeal: number;
  debt: number;
}

export function MeuFuturoClient() {
  // ── Busca dados REAIS do servidor ──────────────────────────────
  const { data: serverData, isLoading, refetch: refetchProjection } = trpc.user.getProjectionData.useQuery();
  const { data: user, refetch: refetchProfile } = trpc.user.getProfile.useQuery();
  const { data: allGoals, refetch: refetchGoals } = trpc.goal.list.useQuery();
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => refetchProfile()
  });
  const deleteGoal = trpc.goal.delete.useMutation({
    onSuccess: () => {
      refetchGoals();
      refetchProjection();
    }
  });

  // ── Local UI State (sliders sobrescrevem dados do servidor) ────
  const [retirementAge, setRetirementAge] = useState(65);
  const [desiredMonthlyIncome, setDesiredMonthlyIncome] = useState(10000);
  const [otherIncome, setOtherIncome] = useState(0);
  const [monthlyInvestment, setMonthlyInvestment] = useState(1000);
  const [interestRate, setInterestRate] = useState(8);
  const [inflationRate, setInflationRate] = useState(4.5);

  const [timeZoom, setTimeZoom] = useState<"2"|"5"|"10"|"MAX">("MAX");
  const [isPessimistic, setIsPessimistic] = useState(false);
  const [includeGoals, setIncludeGoals] = useState(true);

  // Goal form state
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<any | null>(null);
  const [contributionData, setContributionData] = useState<{ id: string; target: number; current: number; name: string } | null>(null);

  // Sync state when server data loads
  useEffect(() => {
    if (serverData?.profileParams) {
      setRetirementAge(serverData.profileParams.retirementAge);
      setDesiredMonthlyIncome(serverData.profileParams.desiredMonthlyIncome);
      setMonthlyInvestment(serverData.profileParams.monthlyInvestment);
      setInterestRate(Math.round(serverData.profileParams.interestRate * 1000) / 10);
      setInflationRate(Math.round(serverData.profileParams.inflationRate * 1000) / 10);
    }
  }, [serverData]);

  // ── Derived math (recalcular localmente quando sliders mudam) ──
  const baseAnnualRate = ((1 + (interestRate / 100)) / (1 + (inflationRate / 100))) - 1;
  const annualRate = isPessimistic ? baseAnnualRate / 2 : baseAnnualRate; // Taxa de juros real cai pela metade no stress test
  
  const currentAge = serverData?.profileParams?.currentAge ?? 30;
  const currentPatrimony = serverData?.currentPatrimony ?? 0;

  const r_m = Math.pow(1 + annualRate, 1 / 12) - 1;

  // Renda Passiva Extra reduz o quanto precisa vir dos investimentos
  const netDesiredIncome = Math.max(0, desiredMonthlyIncome - otherIncome);
  const targetPatrimony = netDesiredIncome > 0 && r_m > 0 ? netDesiredIncome / r_m : netDesiredIncome * 300;

  const parsedGoals = useMemo(() => {
    if (!serverData?.activeGoals) return [];
    return serverData.activeGoals.map((g: any) => ({
      ...g,
      deadline: g.deadline ? new Date(g.deadline) : new Date(),
    }));
  }, [serverData?.activeGoals]);

  // Quando o usuário mexe nos sliders, recalculamos localmente sem nova API call
  const projectionData = useMemo<ProjectionPoint[]>(() => {
    // Se os sliders estão iguais ao servidor e a visualização inclui metas e não tem outras rendas, use dados do servidor diretamente
    if (
      serverData?.projectionPoints &&
      includeGoals === true &&
      otherIncome === 0 &&
      retirementAge === serverData.profileParams.retirementAge &&
      monthlyInvestment === serverData.profileParams.monthlyInvestment &&
      Math.abs(annualRate - serverData.profileParams.annualRate) < 0.001 &&
      !isPessimistic
    ) {
      let raw = [...serverData.projectionPoints];

      raw = raw.map(d => ({ ...d, projectedTotal: Math.max(0, d.projectedTotal), principalInvested: Math.max(0, d.principalInvested), debt: (d as any).debt ?? 0 }));
      
      if (timeZoom !== "MAX") {
        const limitAge = currentAge + parseInt(timeZoom);
        raw = raw.filter(d => d.age <= limitAge);
      }
      return raw;
    }

    // Caso slider mudou → recalcular localmente
    let raw = calculatePatrimonyProjection({
      currentAge,
      retirementAge,
      currentPatrimony,
      monthlyContribution: monthlyInvestment,
      annualRate,
      retirementGoal: targetPatrimony,
      goals: includeGoals ? parsedGoals : []
    });

    raw = raw.map(d => ({ ...d, projectedTotal: Math.max(0, d.projectedTotal), principalInvested: Math.max(0, d.principalInvested), debt: d.debt ?? 0 }));
    
    if (timeZoom !== "MAX") {
      const limitAge = currentAge + parseInt(timeZoom);
      raw = raw.filter(d => d.age <= limitAge);
    }

    return raw;
  }, [serverData, currentAge, retirementAge, currentPatrimony, monthlyInvestment, annualRate, includeGoals, isPessimistic, timeZoom, targetPatrimony, otherIncome]);

  const freedomProgress = useMemo(() => {
    // If goals are included, we can determine the "monthlyNeeded" and "percentComplete" from the projection
    if (includeGoals && projectionData.length > 0) {
      const retirementPoint = projectionData.find(d => d.age === retirementAge) || projectionData[projectionData.length - 1];
      const projectedAtRetirement = (retirementPoint.projectedTotal || 0) - (retirementPoint.debt || 0);
      
      const percentComplete = targetPatrimony > 0 ? Math.max(0, (currentPatrimony / targetPatrimony) * 100) : 0;
      
      // Calculate how much more they need per month to cover the gap at retirement
      let additionalMonthlyNeeded = 0;
      if (projectedAtRetirement < targetPatrimony) {
        const gapFV = targetPatrimony - projectedAtRetirement;
        const monthsRemaining = Math.max(1, (retirementAge - currentAge) * 12);
        
        // Find PMT for gapFV
        const r_m = Math.pow(1 + annualRate, 1 / 12) - 1;
        if (r_m > 0) {
          additionalMonthlyNeeded = gapFV * (r_m / (Math.pow(1 + r_m, monthsRemaining) - 1));
        } else {
          additionalMonthlyNeeded = gapFV / monthsRemaining;
        }
      }

      return {
        monthlyNeeded: monthlyInvestment + additionalMonthlyNeeded,
        percentComplete: percentComplete,
        amountHave: currentPatrimony,
        amountNeed: targetPatrimony,
        amountMissing: Math.max(0, targetPatrimony - currentPatrimony)
      };
    }

    // Prefer server data if sliders haven't changed and no other income
    if (
      serverData?.freedomProgress && 
      otherIncome === 0 &&
      retirementAge === serverData.profileParams.retirementAge &&
      desiredMonthlyIncome === serverData.profileParams.desiredMonthlyIncome &&
      Math.abs(annualRate - serverData.profileParams.annualRate) < 0.001
    ) {
      return {
        monthlyNeeded: serverData.freedomProgress.monthlyNeeded,
        percentComplete: serverData.freedomProgress.percent,
        amountHave: serverData.freedomProgress.have,
        amountNeed: serverData.freedomProgress.need,
        amountMissing: serverData.freedomProgress.missing
      };
    }

    return calculateFinancialFreedomProgress({
      currentPatrimony,
      retirementGoal: targetPatrimony,
      desiredMonthlyIncome: netDesiredIncome,
      currentAge,
      retirementAge,
      annualRate,
    });
  }, [serverData, currentPatrimony, targetPatrimony, netDesiredIncome, currentAge, retirementAge, annualRate, includeGoals, projectionData, monthlyInvestment, otherIncome]);

  // Goal handlers
  const openNewGoal = () => {
    setGoalToEdit(null);
    setIsGoalFormOpen(true);
  };

  const openEditGoal = (g: any) => {
    setGoalToEdit(g);
    setIsGoalFormOpen(true);
  };

  const handleDeleteGoal = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta meta?")) {
      deleteGoal.mutate({ id });
    }
  };

  const handleGoalSuccess = () => {
    refetchGoals();
    refetchProjection();
  };

  const annualRateForGoals = user?.profile?.interestRate ? Number(user.profile.interestRate) / 100 : 0.08;

  if (isLoading) {
    return (
      <div className="w-full mx-auto py-20 text-center">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto" />
          <div className="h-[400px] bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto py-6 md:py-10 space-y-8 px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Meu Futuro</h1>
          <p className="text-foreground-muted mt-1">Brinque com os números e projete sua independência financeira.</p>
        </div>
      </div>

      {/* ── Progress Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Target className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Patrimônio Necessário</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(targetPatrimony)}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Investir por Mês (mín.)</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(freedomProgress.monthlyNeeded)}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Progresso</p>
            <p className="text-xl font-bold text-foreground">{Math.min(100, Math.round(freedomProgress.percentComplete ?? 0))}%</p>
            <div className="w-24 h-1.5 bg-surface-elevated rounded-full mt-1">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.round(freedomProgress.percentComplete ?? 0))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 h-full">
        {/* GRÁFICO (Esq 70%) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex justify-between items-center bg-card p-2 rounded-xl border shadow-sm">
            {/* @ts-ignore */}
            <ToggleGroup type="single" value={timeZoom as any} onValueChange={(v: any) => v && setTimeZoom(v)}>
              <ToggleGroupItem value="2" className="text-sm">2 Anos</ToggleGroupItem>
              <ToggleGroupItem value="5" className="text-sm">5 Anos</ToggleGroupItem>
              <ToggleGroupItem value="10" className="text-sm">10 Anos</ToggleGroupItem>
              <ToggleGroupItem value="MAX" className="text-sm font-semibold">Toda a Vida</ToggleGroupItem>
            </ToggleGroup>

            <div className="flex items-center space-x-4 px-4">
              <div className="flex items-center space-x-2">
                <Switch id="pessimistic" checked={isPessimistic} onCheckedChange={setIsPessimistic} />
                <Label htmlFor="pessimistic" className="text-sm font-medium cursor-pointer">Stress Test</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="goals" checked={includeGoals} onCheckedChange={setIncludeGoals} />
                <Label htmlFor="goals" className="text-sm font-medium cursor-pointer">Com Metas</Label>
              </div>
            </div>
          </div>

          <ProjecaoChart 
            data={projectionData}
            currentAge={currentAge}
            retirementAge={retirementAge}
            goals={parsedGoals}
            showGoals={includeGoals}
          />

          {/* ── Metas Section with Add Button ── */}
          <div className="pt-6 mt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">
                Metas de Vida {parsedGoals.length > 0 && `(${parsedGoals.length})`}
              </h3>
              <Button 
                onClick={openNewGoal} 
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar Meta
              </Button>
            </div>

            {parsedGoals.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl bg-surface-elevated/30">
                <div className="text-3xl mb-3">🎯</div>
                <h4 className="text-base font-bold text-foreground mb-1">Nenhuma meta ativa</h4>
                <p className="text-sm text-foreground-muted mb-4 max-w-sm text-center">
                  Crie metas de vida para projetar seu futuro com mais precisão.
                </p>
                <Button onClick={openNewGoal} variant="outline" size="sm" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Criar Primeira Meta
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parsedGoals.map((goal: any) => (
                  <GoalCard 
                    key={goal.id} 
                    goal={goal} 
                    onAddContribution={() => setContributionData({
                      id: goal.id,
                      target: goal.targetAmount,
                      current: goal.currentAmount,
                      name: goal.name
                    })} 
                    onEdit={() => openEditGoal(goal)} 
                    onDelete={() => handleDeleteGoal(goal.id)} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SLIDERS (Dir 30%) */}
        <div className="lg:col-span-3">
          <IndependenciaSliders 
            retirementAge={retirementAge}
            setRetirementAge={setRetirementAge}
            desiredMonthlyIncome={desiredMonthlyIncome}
            setDesiredMonthlyIncome={setDesiredMonthlyIncome}
            otherIncome={otherIncome}
            setOtherIncome={setOtherIncome}
            monthlyInvestment={monthlyInvestment}
            setMonthlyInvestment={setMonthlyInvestment}
            interestRate={interestRate}
            setInterestRate={setInterestRate}
            inflationRate={inflationRate}
            setInflationRate={setInflationRate}
            targetPatrimony={targetPatrimony}
            requiredMonthlyInvestment={freedomProgress.monthlyNeeded}
            netDesiredIncome={netDesiredIncome}
            isSaving={updateProfile.isPending}
            onSave={() => updateProfile.mutate({
              retirementAge,
              desiredMonthlyIncome,
              monthlyInvestment,
              interestRate,
              inflationRate
            })}
          />
        </div>
      </div>

      {/* Goal Form Sheet */}
      <GoalForm 
        isOpen={isGoalFormOpen}
        onClose={() => setIsGoalFormOpen(false)}
        onSuccess={handleGoalSuccess}
        goal={goalToEdit}
        annualRate={annualRateForGoals}
      />

      {/* Goal Contribution Dialog */}
      {contributionData && (
        <GoalContributionForm 
          isOpen={true}
          onClose={() => setContributionData(null)}
          onSuccess={handleGoalSuccess}
          goalId={contributionData.id}
          targetAmount={contributionData.target}
          currentAmount={contributionData.current}
          name={contributionData.name}
        />
      )}
    </div>
  );
}
