import Decimal from "decimal.js";

// Ensure precision configurations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Calcula o montante final de juros compostos considerando aportes mensais.
 * @param principal Valor inicial investido (PV)
 * @param annualRate Taxa de juros anual decimal (ex: 0.08 para 8%)
 * @param years Anos de rendimento
 * @param monthlyContribution Aporte mensal regular (PMT)
 * @returns Montante final (FV)
 * 
 * @example
 * calculateCompoundInterest(10000, 0.08, 10, 500)
 */
export function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  years: number,
  monthlyContribution: number
): number {
  const p = Number(principal) || 0;
  const aRate = Number(annualRate) || 0;
  const y = Number(years) || 0;
  const mContribution = Number(monthlyContribution) || 0;

  if (aRate === 0) {
    return p + (mContribution * y * 12);
  }

  const PV = new Decimal(p);
  const PMT = new Decimal(mContribution);
  // Converte taxa anual nominal para taxa efetiva mensal
  // (1 + i_a)^(1/12) - 1
  const r_m = new Decimal(1).plus(annualRate).pow(new Decimal(1).div(12)).minus(1);
  const n_m = new Decimal(years).times(12);

  // Fator = (1 + r_m)^n_m
  const factor = new Decimal(1).plus(r_m).pow(n_m);

  // Valor futuro do principal
  const fvPrincipal = PV.times(factor);

  // Valor futuro dos aportes: PMT * [ ((1 + r_m)^n_m - 1) / r_m ]
  const fvContributions = PMT.times(factor.minus(1)).div(r_m);

  return fvPrincipal.plus(fvContributions).toNumber();
}

/**
 * Gera a curva de projeção de patrimônio e ideal de aposentadoria ao longo dos anos.
 * @param params Parâmetros para progressão de vida
 * @returns Array de pontos mapeando cada idade até o alvo
 */
export function calculatePatrimonyProjection(params: {
  currentAge: number;
  retirementAge: number;
  currentPatrimony: number;
  monthlyContribution: number;
  annualRate: number;
  retirementGoal?: number;
  goals: Array<{ targetAmount: number; deadline: Date; affectsPlanning: boolean }>;
}): Array<{ age: number; year: number; projectedTotal: number; principalInvested: number; retirementIdeal: number; debt: number }> {
  
  const { goals } = params;
  const currentAge = Number(params.currentAge) || 0;
  const retirementAge = Number(params.retirementAge) || 0;
  const currentPatrimony = Number(params.currentPatrimony) || 0;
  const monthlyContribution = Number(params.monthlyContribution) || 0;
  const annualRate = Number(params.annualRate) || 0;
  const currentYear = new Date().getFullYear();
  const projection = [];

  const maxAge = Math.max(retirementAge, currentAge + 10); // Projeta até a aposentadoria ou 10 anos minimo
  let currPatrimony = currentPatrimony;
  let currInvested = currentPatrimony;
  let debt = 0; // Dívida originada por metas que excederam o patrimônio

  // A curva ideal deve mirar o retirementGoal (se fornecido).
  // Se não foi fornecido, usa a projeção de contribuições como fallback livre.
  const finalFV = params.retirementGoal && params.retirementGoal > 0
    ? params.retirementGoal
    : calculateCompoundInterest(currentPatrimony, annualRate, Math.max(1, retirementAge - currentAge), monthlyContribution);

  const r_m = new Decimal(1).plus(annualRate).pow(new Decimal(1).div(12)).minus(1);

  for (let age = currentAge; age <= maxAge; age++) {
    const yearsElapsed = age - currentAge;
    const year = currentYear + yearsElapsed;

    // Metas que vencem neste ano (ou atrasadas, processadas no ano 0)
    let yearGoalDeductions = 0;
    for (const goal of goals) {
      if (goal.affectsPlanning) {
        const goalYear = goal.deadline.getFullYear();
        if (goalYear === year || (yearsElapsed === 0 && goalYear < year)) {
          yearGoalDeductions += goal.targetAmount;
        }
      }
    }

    // Aplicar deduções de metas deste ano (antes do rendimento para o ano atual, ou no ano 0)
    if (yearGoalDeductions > 0) {
      currPatrimony -= yearGoalDeductions;
      currInvested -= yearGoalDeductions;
    }

    if (yearsElapsed > 0) {
      const yearlyContribution = monthlyContribution * 12;

      // Cálculo unificado (permite patrimônio negativo render juros de dívida)
      const factor = new Decimal(1).plus(r_m).pow(12);
      const pv = new Decimal(currPatrimony).times(factor);
      const pmt = new Decimal(monthlyContribution).times(factor.minus(1)).div(r_m);
      
      currPatrimony = pv.plus(pmt).toNumber();
      currInvested += yearlyContribution;
    }

    // A meta ideal cresce de acordo com o patrimônio atual vs final
    // Construindo curva suave do ideal
    const percentTime = yearsElapsed / Math.max(1, retirementAge - currentAge);
    const idealPoint = currentPatrimony + ((finalFV - currentPatrimony) * Math.min(1, percentTime));

    projection.push({
      age,
      year,
      projectedTotal: Math.round(Math.max(0, currPatrimony)),
      principalInvested: Math.round(Math.max(0, currInvested)),
      retirementIdeal: Math.round(idealPoint),
      debt: Math.round(Math.abs(Math.min(0, currPatrimony))),
    });
  }

  return projection;
}

/**
 * Calcula o progresso rumo à liberdade financeira e a necessidade mensal restante.
 */
export function calculateFinancialFreedomProgress(params: {
  currentPatrimony: number;
  retirementGoal: number;
  desiredMonthlyIncome: number;
  currentAge: number;
  retirementAge: number;
  annualRate: number;
}): { percentComplete: number; amountHave: number; amountNeed: number; amountMissing: number; monthlyNeeded: number } {
  const currentPatrimony = Number(params.currentPatrimony) || 0;
  const desiredMonthlyIncome = Number(params.desiredMonthlyIncome) || 0;
  const currentAge = Number(params.currentAge) || 0;
  const retirementAge = Number(params.retirementAge) || 0;
  const annualRate = Number(params.annualRate) || 0;
  const retirementGoal = Number(params.retirementGoal) || 0;
  
  let amountNeed = retirementGoal;
  // Se não tem meta definida, usamos regra dos 300 (4% rule simplificada)
  if (amountNeed <= 0 && desiredMonthlyIncome > 0) {
    amountNeed = desiredMonthlyIncome * 300; 
  }

  const amountMissing = Math.max(0, amountNeed - currentPatrimony);
  const percentComplete = amountNeed > 0 ? (currentPatrimony / amountNeed) * 100 : 0;
  
  const monthsRemaining = Math.max(1, (retirementAge - currentAge) * 12);
  const monthlyNeeded = calculateGoalMonthlyNeeded(amountNeed, currentPatrimony, monthsRemaining, annualRate);

  return {
    percentComplete: Math.min(100, percentComplete),
    amountHave: currentPatrimony,
    amountNeed,
    amountMissing,
    monthlyNeeded: Math.max(0, monthlyNeeded)
  };
}

/**
 * Calcula o PMT (aporte mensal) necessário para atingir uma meta.
 * @param targetAmount Valor Alvo (FV)
 * @param currentAmount Patrimônio atual investido (PV)
 * @param monthsRemaining Tempo restante em meses
 * @param annualRate Taxa de juros anual decimal (ex: 0.08)
 */
export function calculateGoalMonthlyNeeded(
  targetAmount: number,
  currentAmount: number,
  monthsRemaining: number,
  annualRate: number
): number {
  const tAmount = Number(targetAmount) || 0;
  const cAmount = Number(currentAmount) || 0;
  const mRemaining = Number(monthsRemaining) || 0;
  const aRate = Number(annualRate) || 0;

  if (mRemaining <= 0) return 0;
  
  const r_a = new Decimal(aRate);
  if (r_a.isZero()) {
    return Math.max(0, (tAmount - cAmount) / mRemaining);
  }

  const r_m = new Decimal(1).plus(r_a).pow(new Decimal(1).div(12)).minus(1);
  const PV = new Decimal(cAmount);
  const FV = new Decimal(tAmount);
  const n = new Decimal(mRemaining);

  // future value of current money
  const fv_pv = PV.times(new Decimal(1).plus(r_m).pow(n));
  
  const neededFV = FV.minus(fv_pv);
  if (neededFV.lte(0)) return 0;

  // PMT = neededFV * [ r_m / ((1 + r_m)^n - 1) ]
  const top = r_m;
  const bot = new Decimal(1).plus(r_m).pow(n).minus(1);
  
  const pmt = neededFV.times(top.div(bot));
  
  return pmt.toNumber();
}
