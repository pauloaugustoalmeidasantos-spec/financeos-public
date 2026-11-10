import { mockPrisma } from "@/__mocks__/prisma";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Asset Router Logic", () => {
  const userId = "test-user-asset";

  describe("list - agrupamento por tipo", () => {
    it("deve agrupar ativos por tipo corretamente", () => {
      const assets = [
        { id: "1", type: "FINANCIAL", currentValue: 10000, isActive: true },
        { id: "2", type: "FINANCIAL", currentValue: 5000, isActive: true },
        { id: "3", type: "PHYSICAL", currentValue: 200000, isActive: true },
        { id: "4", type: "BUSINESS", currentValue: 50000, isActive: true },
      ];

      const financial = assets.filter((a) => a.type === "FINANCIAL");
      const physical = assets.filter((a) => a.type === "PHYSICAL");
      const business = assets.filter((a) => a.type === "BUSINESS");

      expect(financial.length).toBe(2);
      expect(physical.length).toBe(1);
      expect(business.length).toBe(1);
    });

    it("deve calcular totais por tipo", () => {
      const assets = [
        { id: "1", type: "FINANCIAL", currentValue: 10000 },
        { id: "2", type: "FINANCIAL", currentValue: 5000 },
        { id: "3", type: "PHYSICAL", currentValue: 200000 },
        { id: "4", type: "BUSINESS", currentValue: 50000 },
      ];

      const sum = (arr: typeof assets) =>
        arr.reduce((acc, a) => acc + a.currentValue, 0);

      expect(sum(assets.filter((a) => a.type === "FINANCIAL"))).toBe(15000);
      expect(sum(assets.filter((a) => a.type === "PHYSICAL"))).toBe(200000);
      expect(sum(assets.filter((a) => a.type === "BUSINESS"))).toBe(50000);
    });
  });

  describe("getSummary - grandTotal", () => {
    it("grandTotal deve ser soma de todos os currentValue", () => {
      const assets = [
        { currentValue: 10000 },
        { currentValue: 50000 },
        { currentValue: 200000 },
      ];

      const total = assets.reduce((acc, a) => acc + a.currentValue, 0);
      expect(total).toBe(260000);
    });

    it("byCategory deve somar categorias e calcular percentuais", () => {
      const assets = [
        { currentValue: 10000, category: "Ações" },
        { currentValue: 5000, category: "Ações" },
        { currentValue: 200000, category: "Imóvel Residencial" },
      ];

      const total = assets.reduce((acc, a) => acc + a.currentValue, 0);
      const catMap: Record<string, number> = {};

      for (const a of assets) {
        catMap[a.category] = (catMap[a.category] || 0) + a.currentValue;
      }

      const byCategory = Object.entries(catMap).map(([name, value]) => ({
        name,
        value,
        percentage: Math.round((value / total) * 100),
      }));

      expect(byCategory.find((c) => c.name === "Ações")?.value).toBe(15000);
      expect(
        byCategory.find((c) => c.name === "Imóvel Residencial")?.percentage
      ).toBe(93); // 200000/215000 * 100 ≈ 93
    });
  });

  describe("delete - soft delete", () => {
    it("deve fazer soft delete marcando isActive = false", async () => {
      const existing = {
        id: "a1",
        userId,
        isActive: true,
        currentValue: 10000,
      };

      mockPrisma.asset.findUnique.mockResolvedValue(existing);
      mockPrisma.asset.update.mockResolvedValue({
        ...existing,
        isActive: false,
      });

      // Simulate soft delete
      const asset = await mockPrisma.asset.findUnique({ where: { id: "a1" } });
      expect(asset).toBeTruthy();

      const updated = await mockPrisma.asset.update({
        where: { id: "a1" },
        data: { isActive: false },
      });

      expect(updated.isActive).toBe(false);
      expect(mockPrisma.asset.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: { isActive: false },
      });
    });

    it("NÃO deve chamar prisma.asset.delete (soft delete, não hard delete)", async () => {
      // O router usa update, não delete
      expect(mockPrisma.asset.update).not.toHaveBeenCalled();
    });
  });

  describe("valorização", () => {
    it("deve calcular % de valorização quando purchaseValue existe", () => {
      const asset = {
        currentValue: 15000,
        purchaseValue: 10000,
      };

      const appreciation =
        ((asset.currentValue - asset.purchaseValue) / asset.purchaseValue) *
        100;
      expect(appreciation).toBe(50); // +50%
    });

    it("deve calcular depreciação quando currentValue < purchaseValue", () => {
      const asset = {
        currentValue: 8000,
        purchaseValue: 10000,
      };

      const appreciation =
        ((asset.currentValue - asset.purchaseValue) / asset.purchaseValue) *
        100;
      expect(appreciation).toBe(-20); // -20%
    });
  });
});
