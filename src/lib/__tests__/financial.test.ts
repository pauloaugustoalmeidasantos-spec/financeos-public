import { calculateCompoundInterest, calculateGoalMonthlyNeeded, calculateFinancialFreedomProgress, calculatePatrimonyProjection } from '../financial';

describe('Financial Utils', () => {

  describe('calculateCompoundInterest', () => {
    it('deve calcular rendimentos mensais corretamente ao longo de 1 ano', () => {
      // Principal 0, 10% anual, 1 ano, aporte de R$100 mensal
      const result = calculateCompoundInterest(0, 0.1, 1, 100);
      expect(result).toBeCloseTo(1254.05, 1);
    });

    it('deve retornar principal mais contribuições limpas caso taxa zero', () => {
      const result = calculateCompoundInterest(2000, 0, 2, 500); // 24 * 500 = 12000 + 2000
      expect(result).toBe(14000);
    });

    it('deve retornar exatamente o principal se anos for 0', () => {
      const result = calculateCompoundInterest(5000, 0.1, 0, 100);
      expect(result).toBe(5000);
    });
  });

  describe('calculateGoalMonthlyNeeded', () => {
    it('deve calcular o deficit correto a juros 0', () => {
      const result = calculateGoalMonthlyNeeded(10000, 0, 12, 0);
      expect(result).toBeCloseTo(833.33, 2);
    });

    it('deve calcular deficit deduzindo o capital atual a juros 0', () => {
      const result = calculateGoalMonthlyNeeded(10000, 5000, 12, 0);
      expect(result).toBeCloseTo(416.67, 2);
    });

    it('deve retornar 0 se a meta já foi alcançada', () => {
      const result = calculateGoalMonthlyNeeded(10000, 15000, 12, 0.05);
      expect(result).toBe(0);
    });
  });

  describe('calculateFinancialFreedomProgress', () => {
    it('deve retornar 0% quando patrimônio é nulo', () => {
      const p = calculateFinancialFreedomProgress({
        currentPatrimony: 0,
        retirementGoal: 1000000,
        desiredMonthlyIncome: 10000,
        currentAge: 30,
        retirementAge: 65,
        annualRate: 0.08
      });
      expect(p.percentComplete).toBe(0);
    });

    it('deve retornar 100% se a meta for atingida', () => {
      const p = calculateFinancialFreedomProgress({
        currentPatrimony: 1000000,
        retirementGoal: 1000000,
        desiredMonthlyIncome: 5000,
        currentAge: 65,
        retirementAge: 65,
        annualRate: 0.08
      });
      expect(p.percentComplete).toBe(100);
    });

    it('Valores parciais rendem metrificação proporcional', () => {
      const p = calculateFinancialFreedomProgress({
        currentPatrimony: 500000,
        retirementGoal: 1000000,
        desiredMonthlyIncome: 5000,
        currentAge: 40,
        retirementAge: 65,
        annualRate: 0.08
      });
      expect(p.percentComplete).toBe(50);
    });
  });

  describe('calculatePatrimonyProjection', () => {
    it('deve gerar N pontos de array baseados na idade limite', () => {
      const projection = calculatePatrimonyProjection({
        currentAge: 30,
        retirementAge: 40,
        currentPatrimony: 1000,
        monthlyContribution: 500,
        annualRate: 0.1,
        goals: []
      });

      // Includes age 30 through 40 => 11 elements
      expect(projection).toHaveLength(11);
      expect(projection[0].age).toBe(30);
      expect(projection[projection.length - 1].age).toBe(40);
    });

    it('deve garantir crescimento na curva patrimonial projetada', () => {
      const projection = calculatePatrimonyProjection({
        currentAge: 30,
        retirementAge: 40,
        currentPatrimony: 1000,
        monthlyContribution: 500,
        annualRate: 0.1,
        goals: []
      });
      
      const pEnd = projection[projection.length - 1].projectedTotal;
      expect(pEnd).toBeGreaterThan(1000); // Definitely grew due to contributions+interest
    });

    it('nunca deve gerar valores negativos mesmo com meta maior que patrimônio', () => {
      const projection = calculatePatrimonyProjection({
        currentAge: 30,
        retirementAge: 40,
        currentPatrimony: 1000,
        monthlyContribution: 500,
        annualRate: 0.08,
        goals: [{ targetAmount: 500000, deadline: new Date(new Date().getFullYear() + 2, 6, 1), affectsPlanning: true }]
      });

      for (const point of projection) {
        expect(point.projectedTotal).toBeGreaterThanOrEqual(0);
        expect(point.principalInvested).toBeGreaterThanOrEqual(0);
      }
    });

    it('nunca deve gerar valores negativos com taxa real negativa (inflação > juros)', () => {
      // annualRate negativa simula inflação superando juros
      const projection = calculatePatrimonyProjection({
        currentAge: 30,
        retirementAge: 50,
        currentPatrimony: 10000,
        monthlyContribution: 500,
        annualRate: -0.02,
        goals: []
      });

      for (const point of projection) {
        expect(point.projectedTotal).toBeGreaterThanOrEqual(0);
        expect(point.principalInvested).toBeGreaterThanOrEqual(0);
      }
    });
  });

});
