import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { BudgetUpsertSchema, BudgetListSchema } from "@/validations/budget";
import { TRPCError } from "@trpc/server";

export const budgetRouter = router({
  
  list: protectedProcedure
    .input(BudgetListSchema)
    .query(async ({ ctx, input }) => {
      const { month, year } = input;
      const userId = ctx.user.id;

      const budgets = await ctx.prisma.budget.findMany({
        where: { userId, month, year },
        include: { category: true }
      });

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const spentAgg = await ctx.prisma.transaction.groupBy({
        by: ['categoryId'],
        _sum: { amount: true },
        where: {
          userId,
          type: "EXPENSE",
          transactionDate: { gte: startDate, lte: endDate }
        }
      });

      const spentMap = new Map(spentAgg.map(s => [s.categoryId, Number(s._sum.amount || 0)]));

      return budgets.map((b: any) => ({
        ...b,
        amount: Number(b.amount),
        spent: spentMap.get(b.categoryId) || 0,
        percentage: Number(b.amount) > 0 ? ((spentMap.get(b.categoryId) || 0) / Number(b.amount)) * 100 : 0
      }));
    }),

  // Busca transações detalhadas de uma categoria em um mês
  transactions: protectedProcedure
    .input(z.object({
      categoryId: z.string().uuid(),
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2000).max(2100),
    }))
    .query(async ({ ctx, input }) => {
      const { categoryId, month, year } = input;
      const userId = ctx.user.id;
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      return ctx.prisma.transaction.findMany({
        where: {
          userId,
          categoryId,
          type: "EXPENSE",
          transactionDate: { gte: startDate, lte: endDate },
        },
        orderBy: { transactionDate: "desc" },
        select: {
          id: true,
          description: true,
          amount: true,
          transactionDate: true,
          parentId: true,
        },
      });
    }),

  upsert: protectedProcedure
    .input(BudgetUpsertSchema)
    .mutation(async ({ ctx, input }) => {
      const { categoryId, amount, month, year } = input;
      const userId = ctx.user.id;

      return ctx.prisma.budget.upsert({
        where: {
          userId_categoryId_month_year: {
            userId,
            categoryId,
            month,
            year
          }
        },
        create: { userId, categoryId, amount, month, year },
        update: { amount }
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const budget = await ctx.prisma.budget.findUnique({
        where: { id: input.id }
      });

      if (!budget || budget.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.prisma.budget.delete({
        where: { id: input.id }
      });
    })
});
