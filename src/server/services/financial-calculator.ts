import { PrismaClient } from "@/generated/prisma/client";
import { subMonths } from "date-fns";
import {
  calculatePatrimonyProjection,
  calculateFinancialFreedomProgress,
} from "@/lib/financial";

/**
 * Tipagem dos dados retornados pela projeção consolidada.
 */
export interface ProjectionData {
  // Patrimônio real: soma de todos os assets
  currentPatrimony: number;
  // Médias dos últimos 3 meses de transações
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  // Quanto o usuário consegue investir
  monthlyAvailableForInvestment: number;
  // Quanto precisa acumular para aposentar (regra dos 4%)
  retirementNeeded: number;
  // Curva de projeção idade-a-idade
  projectionPoints: Array<{
    age: number;
    year: number;
    projectedTotal: number;
    principalInvested: number;
    retirementIdeal: number;
    debt: number;
  }>;
  // Progresso rumo à liberdade financeira
  freedomProgress: {
    percent: number;
    have: number;
    need: number;
    missing: number;
    monthlyNeeded: number;
  };
  // Dados do perfil usados (para sliders sobrescreverem localmente)
  profileParams: {
    currentAge: number;
    retirementAge: number;
    monthlyInvestment: number;
    desiredMonthlyIncome: number;
    annualRate: number;
    inflationRate: number;
    interestRate: number;
  };
  activeGoals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string | null;
    type: string;
    priority: number;
    isViable: boolean | null;
    percentComplete: number;
    affectsPlanning: boolean;
  }>;
}

/**
 * Serviço centralizado de cálculo financeiro.
 * Agrega dados reais de Assets, Goals, Transactions e Profile
 * para gerar projeções precisas via algoritmos do financial.ts.
 */
export async function getProjectionData(
  prisma: PrismaClient,
  userId: string
): Promise<ProjectionData> {
  // ── 1. Buscar Perfil do Usuário ──────────────────────────────────
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  const interestRate = profile?.interestRate
    ? Number(profile.interestRate) / 100
    : 0.08;
  const inflationRate = profile?.inflationRate
    ? Number(profile.inflationRate) / 100
    : 0.045;
  const annualRate = ((1 + interestRate) / (1 + inflationRate)) - 1;
  const retirementAge = profile?.retirementAge ?? 65;
  const desiredMonthlyIncome = profile?.desiredMonthlyIncome
    ? Number(profile.desiredMonthlyIncome)
    : 10000;
  const monthlyInvestmentProfile = profile?.monthlyInvestment
    ? Number(profile.monthlyInvestment)
    : 0;

  // Calcular idade atual a partir da data de nascimento
  let currentAge = 30; // fallback
  if (profile?.birthDate) {
    const birth = new Date(profile.birthDate);
    const today = new Date();
    currentAge = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      currentAge--;
    }
  }

  // ── 2. Patrimônio Real: Soma dos Assets Ativos ──────────────────
  const assets = await prisma.asset.findMany({
    where: { userId, isActive: true },
  });
  const currentPatrimony = assets.reduce(
    (acc: number, a: any) => acc + Number(a.currentValue),
    0
  );

  // ── 3. Metas Ativas que Afetam Planejamento ─────────────────────
  const activeGoals = await prisma.goal.findMany({
    where: { userId, isActive: true },
    orderBy: { deadline: 'asc' }
  });
  
  const goalsForProjection = activeGoals
    .filter((g: any) => g.deadline && g.affectsPlanning)
    .map((g: any) => ({
      targetAmount: Number(g.targetAmount),
      deadline: new Date(g.deadline!),
      affectsPlanning: g.affectsPlanning,
    }));

  // ── 4. Transações dos Últimos 3 Meses ───────────────────────────
  const threeMonthsAgo = subMonths(new Date(), 3);
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: { gte: threeMonthsAgo },
    },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  for (const tx of transactions) {
    const amount = Number(tx.amount);
    if (tx.type === "INCOME") {
      totalIncome += amount;
    } else {
      totalExpense += amount;
    }
  }

  // Média mensal (dividido por 3)
  const avgMonthlyIncome = totalIncome / 3;
  const avgMonthlyExpenses = totalExpense / 3;

  // Disponível para investir: renda - despesas, ou o que o perfil estipulou
  const monthlyAvailableForInvestment =
    monthlyInvestmentProfile > 0
      ? monthlyInvestmentProfile
      : Math.max(0, avgMonthlyIncome - avgMonthlyExpenses);

  // ── 5. Alvo de Aposentadoria (Renda Contínua via Taxa Real) ───
  // Necessário = Renda Mensal / Taxa Real Mensal
  const r_m = Math.pow(1 + annualRate, 1 / 12) - 1;
  const retirementNeeded =
    desiredMonthlyIncome > 0 && r_m > 0
      ? desiredMonthlyIncome / r_m
      : desiredMonthlyIncome * 300; // fallback: regra dos 4% (300x)

  // ── 6. Gerar Curva de Projeção ──────────────────────────────────
  const projectionPoints = calculatePatrimonyProjection({
    currentAge,
    retirementAge,
    currentPatrimony,
    monthlyContribution: monthlyAvailableForInvestment,
    annualRate,
    retirementGoal: retirementNeeded,
    goals: goalsForProjection,
  });

  // Arredondar para 2 casas decimais
  for (const point of projectionPoints) {
    point.projectedTotal = Math.round(point.projectedTotal * 100) / 100;
    point.principalInvested =
      Math.round(point.principalInvested * 100) / 100;
    point.retirementIdeal = Math.round(point.retirementIdeal * 100) / 100;
  }

  // ── 7. Progresso de Liberdade Financeira ────────────────────────
  const freedom = calculateFinancialFreedomProgress({
    currentPatrimony,
    retirementGoal: retirementNeeded,
    desiredMonthlyIncome,
    currentAge,
    retirementAge,
    annualRate,
  });

  return {
    currentPatrimony,
    avgMonthlyIncome: Math.round(avgMonthlyIncome * 100) / 100,
    avgMonthlyExpenses: Math.round(avgMonthlyExpenses * 100) / 100,
    monthlyAvailableForInvestment:
      Math.round(monthlyAvailableForInvestment * 100) / 100,
    retirementNeeded: Math.round(retirementNeeded * 100) / 100,
    projectionPoints,
    freedomProgress: {
      percent: Math.round(freedom.percentComplete * 100) / 100,
      have: Math.round(freedom.amountHave * 100) / 100,
      need: Math.round(freedom.amountNeed * 100) / 100,
      missing: Math.round(freedom.amountMissing * 100) / 100,
      monthlyNeeded: Math.round(freedom.monthlyNeeded * 100) / 100,
    },
    profileParams: {
      currentAge,
      retirementAge,
      monthlyInvestment: monthlyAvailableForInvestment,
      desiredMonthlyIncome,
      annualRate,
      inflationRate,
      interestRate,
    },
    activeGoals: activeGoals.map(g => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      deadline: g.deadline ? g.deadline.toISOString() : null,
      type: g.type,
      priority: g.priority,
      isViable: g.isViable,
      percentComplete: g.targetAmount && Number(g.targetAmount) > 0 ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0,
      affectsPlanning: g.affectsPlanning
    }))
  };
}
