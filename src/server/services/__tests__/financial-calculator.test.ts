import { mockPrisma } from "@/__mocks__/prisma";
import { getProjectionData } from "@/server/services/financial-calculator";

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe("Financial Calculator Service", () => {
  const userId = "test-user-123";

  const mockProfile = {
    userId,
    interestRate: 8.0, // 8% anual
    retirementAge: 65,
    desiredMonthlyIncome: 10000,
    monthlyInvestment: 1000,
    birthDate: new Date("1994-01-15"), // ~32 anos
  };

  const mockAssets = [
    { id: "a1", currentValue: 10000, type: "FINANCIAL", isActive: true },
    { id: "a2", currentValue: 50000, type: "PHYSICAL", isActive: true },
  ];

  const mockGoals = [
    {
      id: "g1",
      targetAmount: 30000,
      deadline: new Date(new Date().getFullYear() + 2, 6, 1),
      affectsPlanning: true,
      isActive: true,
    },
  ];

  it("deve retornar patrimônio real somado dos assets", async () => {
    mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile);
    mockPrisma.asset.findMany.mockResolvedValue(mockAssets);
    mockPrisma.goal.findMany.mockResolvedValue(mockGoals);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    const result = await getProjectionData(mockPrisma as any, userId);

    // Patrimônio = 10.000 + 50.000
    expect(result.currentPatrimony).toBe(60000);
  });

  it("deve gerar projectionPoints com (retirementAge - currentAge) elementos", async () => {
    mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile);
    mockPrisma.asset.findMany.mockResolvedValue(mockAssets);
    mockPrisma.goal.findMany.mockResolvedValue(mockGoals);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    const result = await getProjectionData(mockPrisma as any, userId);

    // currentAge ~32, retirementAge 65 => 34 pontos (32 até 65 inclusive)
    const currentAge = result.profileParams.currentAge;
    const expectedPoints = 65 - currentAge + 1;
    expect(result.projectionPoints.length).toBe(expectedPoints);
  });

  it("primeiro ponto deve ter projectedTotal próximo do patrimônio atual", async () => {
    mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile);
    mockPrisma.asset.findMany.mockResolvedValue(mockAssets);
    mockPrisma.goal.findMany.mockResolvedValue([]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    const result = await getProjectionData(mockPrisma as any, userId);

    // Primeiro ponto = patrimônio inicial sem juros
    expect(result.projectionPoints[0].projectedTotal).toBeCloseTo(60000, -2);
  });

  it("o ano da meta deve ter projectedTotal reduzido", async () => {
    mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile);
    mockPrisma.asset.findMany.mockResolvedValue(mockAssets);
    mockPrisma.goal.findMany.mockResolvedValue(mockGoals);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    const result = await getProjectionData(mockPrisma as any, userId);

    // Sem meta no mesmo cenário
    mockPrisma.goal.findMany.mockResolvedValue([]);
    const resultNoGoal = await getProjectionData(mockPrisma as any, userId);

    // A meta vence ~2 anos no futuro
    const goalYear = mockGoals[0].deadline.getFullYear();
    const withGoalPoint = result.projectionPoints.find(
      (p) => p.year === goalYear
    );
    const noGoalPoint = resultNoGoal.projectionPoints.find(
      (p) => p.year === goalYear
    );

    if (withGoalPoint && noGoalPoint) {
      // O patrimônio com meta deve ser menor
      expect(withGoalPoint.projectedTotal).toBeLessThan(
        noGoalPoint.projectedTotal
      );
    }
  });

  it("regra dos 4% deve calcular corretamente", async () => {
    mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile);
    mockPrisma.asset.findMany.mockResolvedValue([]);
    mockPrisma.goal.findMany.mockResolvedValue([]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    const result = await getProjectionData(mockPrisma as any, userId);

    // retirementNeeded = (10000 * 12) / 0.04 = 3.000.000
    expect(result.retirementNeeded).toBe(3000000);
  });

  it("freedomProgress com patrimônio 0 deve ter percent 0", async () => {
    mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile);
    mockPrisma.asset.findMany.mockResolvedValue([]);
    mockPrisma.goal.findMany.mockResolvedValue([]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    const result = await getProjectionData(mockPrisma as any, userId);

    expect(result.freedomProgress.percent).toBe(0);
    expect(result.freedomProgress.have).toBe(0);
  });

  it("freedomProgress com patrimônio >= retirementNeeded deve ter percent = 100", async () => {
    mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile);
    mockPrisma.asset.findMany.mockResolvedValue([
      { id: "rich", currentValue: 3500000, type: "FINANCIAL", isActive: true },
    ]);
    mockPrisma.goal.findMany.mockResolvedValue([]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    const result = await getProjectionData(mockPrisma as any, userId);

    expect(result.freedomProgress.percent).toBe(100);
  });

  it("deve calcular média de renda e despesas dos últimos 3 meses", async () => {
    mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile);
    mockPrisma.asset.findMany.mockResolvedValue([]);
    mockPrisma.goal.findMany.mockResolvedValue([]);
    mockPrisma.transaction.findMany.mockResolvedValue([
      { type: "INCOME", amount: 9000 },
      { type: "INCOME", amount: 9000 },
      { type: "INCOME", amount: 9000 },
      { type: "EXPENSE", amount: 3000 },
      { type: "EXPENSE", amount: 3000 },
      { type: "EXPENSE", amount: 3000 },
    ]);

    const result = await getProjectionData(mockPrisma as any, userId);

    expect(result.avgMonthlyIncome).toBe(9000);
    expect(result.avgMonthlyExpenses).toBe(3000);
  });
});
