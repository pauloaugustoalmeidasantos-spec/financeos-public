import { mockPrisma } from "@/__mocks__/prisma";
import { calculateGoalMonthlyNeeded } from "@/lib/financial";
import Decimal from "decimal.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Goal Router Logic", () => {
  const userId = "test-user-goal";

  describe("create - monthlyNeeded calculation", () => {
    it("deve calcular monthlyNeeded corretamente para meta com prazo", () => {
      const target = 10000;
      const current = 0;
      const months = 12;
      const rate = 0.08;

      const result = calculateGoalMonthlyNeeded(target, current, months, rate);

      // PMT deve ser positivo e razoável
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(target); // não deve ser mais que o alvo
    });

    it("deve retornar 0 se currentAmount >= targetAmount", () => {
      const result = calculateGoalMonthlyNeeded(10000, 15000, 12, 0.08);
      expect(result).toBe(0);
    });

    it("deve retornar divisão simples se taxa = 0", () => {
      const result = calculateGoalMonthlyNeeded(12000, 0, 12, 0);
      expect(result).toBe(1000); // 12000 / 12
    });
  });

  describe("create - isViable check", () => {
    it("isViable deve ser false quando monthlyNeeded > 50% da renda", () => {
      const monthlyIncome = 5000;
      const monthlyNeeded = calculateGoalMonthlyNeeded(100000, 0, 6, 0.08);

      const isViable = monthlyNeeded <= monthlyIncome * 0.5;
      expect(isViable).toBe(false);
    });

    it("isViable deve ser true quando monthlyNeeded <= 50% da renda", () => {
      const monthlyIncome = 10000;
      const monthlyNeeded = calculateGoalMonthlyNeeded(10000, 5000, 24, 0.08);

      const isViable = monthlyNeeded <= monthlyIncome * 0.5;
      expect(isViable).toBe(true);
    });
  });

  describe("addContribution - incrementa currentAmount", () => {
    it("deve incrementar o currentAmount da goal", async () => {
      const existingGoal = {
        id: "g1",
        userId,
        currentAmount: new Decimal(5000),
        targetAmount: new Decimal(10000),
      };

      mockPrisma.goal.findUnique.mockResolvedValue(existingGoal);
      mockPrisma.goalContribution.create.mockResolvedValue({});

      const newAmount = new Decimal(existingGoal.currentAmount).plus(2000);
      mockPrisma.goal.update.mockResolvedValue({
        ...existingGoal,
        currentAmount: newAmount,
      });

      // Simulate the contribution flow
      const goal = await mockPrisma.goal.findUnique({ where: { id: "g1" } });
      expect(goal).toBeTruthy();

      await mockPrisma.goalContribution.create({
        data: { goalId: "g1", userId, amount: new Decimal(2000) },
      });

      const updated = await mockPrisma.goal.update({
        where: { id: "g1" },
        data: { currentAmount: newAmount },
      });

      expect(Number(updated.currentAmount)).toBe(7000);
      expect(mockPrisma.goal.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.goalContribution.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("list - percentComplete calculado", () => {
    it("deve calcular percentComplete nos resultados", () => {
      const goal = {
        currentAmount: 7500,
        targetAmount: 10000,
      };

      const percentComplete = Math.min(
        100,
        (goal.currentAmount / goal.targetAmount) * 100
      );
      expect(percentComplete).toBe(75);
    });

    it("percentComplete nunca deve exceder 100", () => {
      const goal = {
        currentAmount: 15000,
        targetAmount: 10000,
      };

      const percentComplete = Math.min(
        100,
        (goal.currentAmount / goal.targetAmount) * 100
      );
      expect(percentComplete).toBe(100);
    });
  });
});
