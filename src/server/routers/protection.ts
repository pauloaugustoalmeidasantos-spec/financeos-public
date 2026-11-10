import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { getPaymentDate } from "@/lib/brazilian-holidays";
import Decimal from "decimal.js";

// ─── Schemas ────────────────────────────────────────────────────────────────

const InsuranceUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(["VIDA", "AUTO", "RESIDENCIAL", "SAUDE", "OUTRO"]),
  insurer: z.string().optional(),
  coverageAmount: z.number().optional(),
  monthlyPremium: z.number().optional(),
  expiresAt: z.string().optional(), // ISO date string
  notes: z.string().optional(),
});

const EssentialExpenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  categoryId: z.string().optional(),
});

// Risk classification for assets
const HIGH_RISK_CATEGORIES = ["Ações", "ETF", "Crypto", "FIIs"];
const LOW_LIQUIDITY_CATEGORIES = ["Imóvel", "PHYSICAL", "BUSINESS"];

// Emergency reserve multiplier by income stability
const RESERVE_MULTIPLIER: Record<string, number> = {
  STABLE: 6,   // CLT, servidor público
  MIXED: 9,    // PJ com contratos / profissional liberal
  VARIABLE: 12, // Autônomo, comissionado, renda variável
};

// ─── Router ──────────────────────────────────────────────────────────────────

export const protectionRouter = router({

  /** Retorna todos os dados da guia de Proteção */
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const [profile, insurances, assets] = await Promise.all([
      ctx.prisma.userProfile.findUnique({ where: { userId } }),
      ctx.prisma.insurance.findMany({ where: { userId, isActive: true }, orderBy: { type: "asc" } }),
      ctx.prisma.asset.findMany({ where: { userId, isActive: true } }),
    ]);

    // ── Média dos últimos 3 meses (receitas e despesas) ───────────────────────
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [expenseTxs, incomeTxs] = await Promise.all([
      ctx.prisma.transaction.groupBy({
        by: ["transactionDate"],
        _sum: { amount: true },
        where: { userId, type: "EXPENSE", transactionDate: { gte: threeMonthsAgo, lte: endDate } },
      }),
      ctx.prisma.transaction.groupBy({
        by: ["transactionDate"],
        _sum: { amount: true },
        where: { userId, type: "INCOME", transactionDate: { gte: threeMonthsAgo, lte: endDate } },
      }),
    ]);

    // Group by month → average expenses
    const monthlyExpenseMap = new Map<string, number>();
    for (const tx of expenseTxs) {
      const key = `${tx.transactionDate.getFullYear()}-${tx.transactionDate.getMonth()}`;
      monthlyExpenseMap.set(key, (monthlyExpenseMap.get(key) ?? 0) + Number(tx._sum.amount ?? 0));
    }
    const monthlyExpenseValues = Array.from(monthlyExpenseMap.values());
    const avgMonthlyExpense = monthlyExpenseValues.length > 0
      ? monthlyExpenseValues.reduce((a, b) => a + b, 0) / monthlyExpenseValues.length
      : 0;

    // Group by month → average income from transactions
    const monthlyIncomeMap = new Map<string, number>();
    for (const tx of incomeTxs) {
      const key = `${tx.transactionDate.getFullYear()}-${tx.transactionDate.getMonth()}`;
      monthlyIncomeMap.set(key, (monthlyIncomeMap.get(key) ?? 0) + Number(tx._sum.amount ?? 0));
    }
    const monthlyIncomeValues = Array.from(monthlyIncomeMap.values());
    const avgMonthlyIncome = monthlyIncomeValues.length > 0
      ? monthlyIncomeValues.reduce((a, b) => a + b, 0) / monthlyIncomeValues.length
      : 0;

    // ── Essential expenses (override or average) ─────────────────────────────
    const essentialExpenses: any[] = profile?.essentialExpenses
      ? (profile.essentialExpenses as any[])
      : [];
    const essentialTotal = essentialExpenses.length > 0
      ? essentialExpenses.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0)
      : avgMonthlyExpense;

    // ── Emergency reserve calculation ─────────────────────────────────────────
    const stability = profile?.incomeStability ?? "STABLE";
    const multiplier = RESERVE_MULTIPLIER[stability] ?? 6;
    const reserveGoal = essentialTotal * multiplier;

    const reserveAmount = profile?.emergencyReserveAmount ? Number(profile.emergencyReserveAmount) : 0;

    // ── Linked reserve asset ──────────────────────────────────────────────────
    let linkedAsset: any = null;
    let reserveRiskAlert: string | null = null;

    if (profile?.emergencyReserveAssetId) {
      const asset = assets.find(a => a.id === profile.emergencyReserveAssetId);
      if (asset) {
        linkedAsset = {
          id: asset.id,
          name: asset.name,
          category: asset.category,
          currentValue: Number(asset.currentValue),
          type: asset.type,
        };

        const cat = asset.category ?? "";
        if (HIGH_RISK_CATEGORIES.includes(cat)) {
          reserveRiskAlert = `⚠️ Atenção: sua reserva está alocada em ${cat}, que é um investimento de risco e pode ter queda de valor em momentos de crise — exatamente quando você mais precisará da reserva.`;
        } else if (asset.type === "PHYSICAL" || asset.type === "BUSINESS" || LOW_LIQUIDITY_CATEGORIES.includes(cat)) {
          reserveRiskAlert = `⚠️ Atenção: ${asset.name} tem baixa liquidez. Em uma emergência, você pode não conseguir converter esse ativo em dinheiro rapidamente.`;
        }
      }
    }

    const effectiveReserveAmount = linkedAsset?.currentValue ?? reserveAmount;

    // ── Next salary date ──────────────────────────────────────────────────────
    let nextPaymentDate: string | null = null;
    if (profile?.incomePayDay && profile?.incomePayDayType) {
      const now = new Date();
      const payDay = profile.incomePayDay;
      const payDayType = (profile.incomePayDayType ?? "DAY_OF_MONTH") as "DAY_OF_MONTH" | "BUSINESS_DAY";
      const thisMonth = getPaymentDate(now.getFullYear(), now.getMonth(), payDay, payDayType);
      const target = thisMonth > now
        ? thisMonth
        : getPaymentDate(now.getFullYear(), now.getMonth() + 1, payDay, payDayType);
      nextPaymentDate = target.toISOString().split("T")[0];
    }

    return {
      profile: profile ? {
        monthlyIncome: Number(profile.monthlyIncome),
        incomeType: profile.incomeType,
        incomeStability: profile.incomeStability,
        incomePayDay: profile.incomePayDay,
        incomePayDayType: profile.incomePayDayType ?? "DAY_OF_MONTH",
        emergencyReserveAmount: reserveAmount,
        emergencyReserveAssetId: profile.emergencyReserveAssetId,
        additionalIncomes: (profile.additionalIncomes as any[]) ?? [],
        essentialExpenses,
      } : null,
      avgMonthlyIncome: Math.round(avgMonthlyIncome * 100) / 100,
      insurances: insurances.map(i => ({
        ...i,
        coverageAmount: i.coverageAmount ? Number(i.coverageAmount) : null,
        monthlyPremium: i.monthlyPremium ? Number(i.monthlyPremium) : null,
      })),
      assets: assets.map(a => ({
        id: a.id,
        name: a.name,
        category: a.category,
        type: a.type,
        currentValue: Number(a.currentValue),
      })),
      emergencyReserve: {
        goal: reserveGoal,
        amount: effectiveReserveAmount,
        multiplier,
        stability,
        avgMonthlyExpense,
        essentialTotal,
        percentComplete: reserveGoal > 0 ? Math.min(100, (effectiveReserveAmount / reserveGoal) * 100) : 0,
        linkedAsset,
        riskAlert: reserveRiskAlert,
      },
      nextPaymentDate,
    };
  }),

  /** Salva ou atualiza a configuração da renda/salário */
  saveIncomeConfig: protectedProcedure
    .input(z.object({
      monthlyIncome: z.number().min(0),
      incomeType: z.enum(["SALARY", "FREELANCE", "BUSINESS", "INVESTMENT", "OTHER"]),
      incomeStability: z.enum(["STABLE", "VARIABLE", "MIXED"]),
      incomePayDay: z.number().min(1).max(31),
      incomePayDayType: z.enum(["DAY_OF_MONTH", "BUSINESS_DAY"]),
      additionalIncomes: z.array(z.object({
        name: z.string(),
        amount: z.number(),
        frequency: z.string().optional(),
      })).optional(),
      syncToTransactions: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { syncToTransactions, ...profileData } = input;

      const profile = await ctx.prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          monthlyIncome: new Decimal(profileData.monthlyIncome),
          incomeType: profileData.incomeType,
          incomeStability: profileData.incomeStability,
          incomePayDay: profileData.incomePayDay,
          incomePayDayType: profileData.incomePayDayType,
          additionalIncomes: profileData.additionalIncomes ?? [],
        },
        update: {
          monthlyIncome: new Decimal(profileData.monthlyIncome),
          incomeType: profileData.incomeType,
          incomeStability: profileData.incomeStability,
          incomePayDay: profileData.incomePayDay,
          incomePayDayType: profileData.incomePayDayType,
          additionalIncomes: profileData.additionalIncomes ?? [],
        },
      });

      if (syncToTransactions && profileData.incomePayDay) {
        await syncSalaryToTransactions(ctx, userId, profileData);
      }

      return { success: true, profile };
    }),

  /** Sincroniza o salário como transação recorrente */
  syncSalaryTransaction: protectedProcedure
    .input(z.object({
      monthlyIncome: z.number(),
      incomePayDay: z.number(),
      incomePayDayType: z.enum(["DAY_OF_MONTH", "BUSINESS_DAY"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await syncSalaryToTransactions(ctx, ctx.user.id, input);
      return { success: true };
    }),

  /** Salva/atualiza um seguro */
  upsertInsurance: protectedProcedure
    .input(InsuranceUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      if (id) {
        const existing = await ctx.prisma.insurance.findUnique({ where: { id } });
        if (!existing || existing.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return ctx.prisma.insurance.update({
          where: { id },
          data: {
            ...data,
            coverageAmount: data.coverageAmount !== undefined ? new Decimal(data.coverageAmount) : undefined,
            monthlyPremium: data.monthlyPremium !== undefined ? new Decimal(data.monthlyPremium) : undefined,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          },
        });
      }

      return ctx.prisma.insurance.create({
        data: {
          userId: ctx.user.id,
          ...data,
          coverageAmount: data.coverageAmount !== undefined ? new Decimal(data.coverageAmount) : null,
          monthlyPremium: data.monthlyPremium !== undefined ? new Decimal(data.monthlyPremium) : null,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        },
      });
    }),

  /** Remove um seguro (soft delete) */
  deleteInsurance: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.insurance.findUnique({ where: { id: input.id } });
      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.prisma.insurance.update({ where: { id: input.id }, data: { isActive: false } });
      return { success: true };
    }),

  /** Salva configuração da reserva de emergência */
  saveReserveConfig: protectedProcedure
    .input(z.object({
      emergencyReserveAmount: z.number().min(0),
      emergencyReserveAssetId: z.string().uuid().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.userProfile.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          emergencyReserveAmount: new Decimal(input.emergencyReserveAmount),
          emergencyReserveAssetId: input.emergencyReserveAssetId ?? null,
        },
        update: {
          emergencyReserveAmount: new Decimal(input.emergencyReserveAmount),
          emergencyReserveAssetId: input.emergencyReserveAssetId ?? null,
        },
      });
      return { success: true };
    }),

  /** Salva lista de gastos essenciais personalizada */
  saveEssentialExpenses: protectedProcedure
    .input(z.object({
      essentialExpenses: z.array(EssentialExpenseSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.userProfile.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, essentialExpenses: input.essentialExpenses },
        update: { essentialExpenses: input.essentialExpenses },
      });
      return { success: true };
    }),

  /** Atualiza apenas a estabilidade da renda (para editar direto da aba Reserva) */
  saveStability: protectedProcedure
    .input(z.object({
      incomeStability: z.enum(["STABLE", "VARIABLE", "MIXED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.userProfile.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, incomeStability: input.incomeStability },
        update: { incomeStability: input.incomeStability },
      });
      return { success: true };
    }),
});

// ─── Helper: sync all income sources to transactions ───────────────────────

async function syncSalaryToTransactions(
  ctx: any,
  userId: string,
  input: {
    monthlyIncome: number;
    incomePayDay: number;
    incomePayDayType: "DAY_OF_MONTH" | "BUSINESS_DAY";
    additionalIncomes?: { name: string; amount: number }[];
  }
) {
  const TAG = "[SALARIO_PROTECAO]";

  // Find or create the "Salário" category
  let salaryCategory = await ctx.prisma.category.findFirst({
    where: { userId, name: "Salário", type: "INCOME", isActive: true },
  });
  if (!salaryCategory) {
    salaryCategory = await ctx.prisma.category.findFirst({
      where: { name: "Salário", type: "INCOME", isDefault: true },
    });
  }

  // Delete existing protection-synced transactions (future ones only)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await ctx.prisma.transaction.deleteMany({
    where: {
      userId,
      type: "INCOME",
      description: { contains: TAG },
      transactionDate: { gte: today },
    },
  });

  const now = new Date();
  const txData: any[] = [];

  for (let i = 0; i < 12; i++) {
    // Correct year/month calculation across year boundary
    const absMonth = now.getMonth() + i;
    const targetYear = now.getFullYear() + Math.floor(absMonth / 12);
    const targetMonth = absMonth % 12;

    const payDate = getPaymentDate(
      targetYear,
      targetMonth,
      input.incomePayDay,
      input.incomePayDayType
    );

    // Main salary
    txData.push({
      userId,
      amount: new Decimal(input.monthlyIncome),
      type: "INCOME",
      categoryId: salaryCategory?.id ?? null,
      description: `Salário ${TAG}`,
      transactionDate: payDate,
      isRecurring: false,
      recurrenceType: "NONE",
    });

    // Additional incomes — same date as salary
    for (const add of input.additionalIncomes ?? []) {
      if (!add.name || !add.amount) continue;
      txData.push({
        userId,
        amount: new Decimal(add.amount),
        type: "INCOME",
        categoryId: null,
        description: `${add.name} ${TAG}`,
        transactionDate: payDate,
        isRecurring: false,
        recurrenceType: "NONE",
      });
    }
  }

  if (txData.length > 0) {
    await ctx.prisma.transaction.createMany({ data: txData });
  }
}
