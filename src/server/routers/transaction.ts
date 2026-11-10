import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { TransactionCreateSchema, TransactionUpdateSchema, TransactionFilterSchema, BulkTransactionCreateSchema } from "@/validations/transaction";
import { addDays, addWeeks, addMonths, addYears, isAfter } from "date-fns";


export const transactionRouter = router({
  
  list: protectedProcedure
    .input(TransactionFilterSchema)
    .query(async ({ ctx, input }) => {
      const { type, categoryId, startDate, endDate, page, limit } = input;

      const where: any = {
        userId: ctx.user.id, // Strictly isolate
        ...(type !== "ALL" && { type }),
        ...(categoryId && { categoryId }),
        ...(startDate && endDate && {
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
      };

      const skip = (page - 1) * limit;

      const [transactions, totalCount] = await Promise.all([
        ctx.prisma.transaction.findMany({
          where,
          include: { category: true },
          orderBy: { transactionDate: "desc" },
          skip,
          take: limit,
        }),
        ctx.prisma.transaction.count({ where }),
      ]);

      const formatted = transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      }));

      return {
        transactions: formatted,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      };
    }),

  create: protectedProcedure
    .input(TransactionCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { amount, type, categoryId, description, transactionDate, isRecurring, recurrenceType, recurrenceEndDate } = input;

      return ctx.prisma.$transaction(async (tx) => {
        // 1. Cria transação "pai" principal
        const parentTransaction = await tx.transaction.create({
          data: {
            userId: ctx.user.id,
            amount: amount,
            type: type,
            categoryId: categoryId || null,
            description: description || null,
            transactionDate: transactionDate,
            isRecurring: isRecurring,
            recurrenceType: recurrenceType,
            recurrenceEndDate: recurrenceEndDate,
          },
        });

        // 2. Cria fluxo futuro "filho" se aplicável
        if (isRecurring && recurrenceType !== "NONE") {
          const childrenData: any[] = [];
          let nextDate = new Date(transactionDate);

          // Determinando limite prático de geração iterativa (1 ano mensal, 52 sem, 3 anos anual)
          let iterations = 0;
          let maxIterations = 0;
          switch(recurrenceType) {
            case "DAILY": maxIterations = 365; break; // Máx. 1 ano diário
            case "WEEKLY": maxIterations = 52; break; // Máx. 1 ano semanal
            case "MONTHLY": maxIterations = 12; break; // Próximos 12 meses
            case "YEARLY": maxIterations = 3; break; // Próximos 3 anos
            default: maxIterations = 0;
          }

          while (iterations < maxIterations) {
            // Avança intervalo relógio
            if (recurrenceType === "DAILY") nextDate = addDays(nextDate, 1);
            else if (recurrenceType === "WEEKLY") nextDate = addWeeks(nextDate, 1);
            else if (recurrenceType === "MONTHLY") nextDate = addMonths(nextDate, 1);
            else if (recurrenceType === "YEARLY") nextDate = addYears(nextDate, 1);

            // Verifica teto máximo providenciado pelo user
            if (recurrenceEndDate && isAfter(nextDate, recurrenceEndDate)) {
              break;
            }

            childrenData.push({
              userId: ctx.user.id,
              amount: amount,
              type: type,
              categoryId: categoryId || null,
              description: description || null,
              transactionDate: nextDate,
              isRecurring: false, // filhos não ramificam novamente
              recurrenceType: "NONE", 
              parentId: parentTransaction.id,
            });

            iterations++;
          }

          if (childrenData.length > 0) {
            await tx.transaction.createMany({
              data: childrenData,
            });
          }
        }

        return { ...parentTransaction, amount: Number(parentTransaction.amount) };
      });
    }),

  update: protectedProcedure
    .input(TransactionUpdateSchema.extend({
      updateMode: z.enum(["single", "all_future", "all"]).default("single")
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, updateMode, amount, type, categoryId, description, transactionDate, isRecurring, recurrenceType, recurrenceEndDate } = input;

      const current = await ctx.prisma.transaction.findUnique({
        where: { id },
      });

      if (!current || current.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transação não encontrada" });
      }

      const updateData: any = {};
      if (amount !== undefined) updateData.amount = amount;
      if (type !== undefined) updateData.type = type;
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (description !== undefined) updateData.description = description;
      if (isRecurring !== undefined) updateData.isRecurring = isRecurring;
      if (recurrenceType !== undefined) updateData.recurrenceType = recurrenceType;
      if (recurrenceEndDate !== undefined) updateData.recurrenceEndDate = recurrenceEndDate;

      return ctx.prisma.$transaction(async (tx) => {
        // Alvo direto
        const updated = await tx.transaction.update({
          where: { id },
          data: { ...updateData, ...(transactionDate && { transactionDate }) },
        });

        // Se está se tornando recorrente agora (era simples e virou recorrente)
        if (!current.isRecurring && isRecurring && recurrenceType && recurrenceType !== "NONE") {
          const childrenData: any[] = [];
          let nextDate = new Date(transactionDate || current.transactionDate);
          let iterations = 0;
          let maxIterations = 0;
          switch(recurrenceType) {
            case "DAILY": maxIterations = 365; break;
            case "WEEKLY": maxIterations = 52; break;
            case "MONTHLY": maxIterations = 12; break;
            case "YEARLY": maxIterations = 3; break;
            default: maxIterations = 0;
          }

          while (iterations < maxIterations) {
            if (recurrenceType === "DAILY") nextDate = addDays(nextDate, 1);
            else if (recurrenceType === "WEEKLY") nextDate = addWeeks(nextDate, 1);
            else if (recurrenceType === "MONTHLY") nextDate = addMonths(nextDate, 1);
            else if (recurrenceType === "YEARLY") nextDate = addYears(nextDate, 1);

            if (recurrenceEndDate && isAfter(nextDate, recurrenceEndDate)) break;

            childrenData.push({
              userId: ctx.user.id,
              amount: amount || current.amount,
              type: type || current.type,
              categoryId: categoryId || current.categoryId,
              description: description || current.description,
              transactionDate: nextDate,
              isRecurring: false,
              recurrenceType: "NONE", 
              parentId: updated.id,
            });
            iterations++;
          }
          if (childrenData.length > 0) {
            await tx.transaction.createMany({ data: childrenData });
          }
        }

        const rootId = current.parentId || current.id; // se ele for pai ou filho

        if (updateMode === "all") {
          // Atualiza o parent (se ele não for o modificado nesta chamada) e filhos generalizados
          await tx.transaction.updateMany({
            where: {
              OR: [{ id: rootId }, { parentId: rootId }],
              id: { not: id } // menos ele mesmo
            },
            data: updateData // (atualizar datas requer cuidado iterativo, manteremos campos absolutos)
          });
        } 
        else if (updateMode === "all_future") {
          // Atualiza apenas a galera atrelada ao fluxo da data 'atual' para frente
          await tx.transaction.updateMany({
            where: {
              OR: [{ id: rootId }, { parentId: rootId }],
              transactionDate: { gte: current.transactionDate },
              id: { not: id }
            },
            data: updateData
          });
        }

        return { ...updated, amount: Number(updated.amount) };
      });
    }),

  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      deleteMode: z.enum(["single", "all_future", "all"]).default("single")
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, deleteMode } = input;
      const target = await ctx.prisma.transaction.findUnique({ where: { id } });
      
      if (!target || target.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const rootId = target.parentId || target.id;

      return ctx.prisma.$transaction(async (tx) => {
        if (deleteMode === "all") {
          await tx.transaction.deleteMany({
            where: { OR: [{ id: rootId }, { parentId: rootId }] }
          });
        } 
        else if (deleteMode === "all_future") {
          await tx.transaction.deleteMany({
            where: {
              OR: [{ id: rootId }, { parentId: rootId }],
              transactionDate: { gte: target.transactionDate }
            }
          });
        } 
        else {
          await tx.transaction.delete({ where: { id } });
        }
        return { success: true };
      });
    }),

  getMonthlySummary: protectedProcedure
    .input(z.object({ month: z.date() }))
    .query(async ({ ctx, input }) => {
      const { month } = input;

      const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

      const pastStartDate = new Date(month.getFullYear(), month.getMonth() - 1, 1);
      const pastEndDate = new Date(month.getFullYear(), month.getMonth(), 0, 23, 59, 59);

      // Current Month Raw Fetch for category grouping and raw aggregations
      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          userId: ctx.user.id,
          transactionDate: { gte: startDate, lte: endDate }
        },
        include: { category: true }
      });

      const pastTransactions = await ctx.prisma.transaction.findMany({
        where: {
          userId: ctx.user.id,
          transactionDate: { gte: pastStartDate, lte: pastEndDate }
        },
        select: { type: true, amount: true }
      });

      let totalIncome = 0;
      let totalExpenses = 0;
      const expenseMap = new Map();

      transactions.forEach(t => {
        const val = Number(t.amount);
        if (t.type === "INCOME") {
          totalIncome += val;
        } else {
          totalExpenses += val;
          const catId = t.categoryId || "uncategorized";
          const catName = t.category?.name || "Sem Categoria";
          const catColor = t.category?.color || "#cbd5e1";
          
          if (!expenseMap.has(catId)) {
            expenseMap.set(catId, { categoryId: catId, categoryName: catName, categoryColor: catColor, total: 0 });
          }
          expenseMap.get(catId).total += val;
        }
      });

      const byCategory = Array.from(expenseMap.values()).map(c => ({
        ...c,
        percentage: totalExpenses > 0 ? (c.total / totalExpenses) * 100 : 0
      })).sort((a, b) => b.total - a.total); // Ordena maior pro menor

      // Past Month Math
      let pastIncome = 0;
      let pastExpenses = 0;
      pastTransactions.forEach(pt => {
        if (pt.type === "INCOME") pastIncome += Number(pt.amount);
        else pastExpenses += Number(pt.amount);
      });

      return {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        byCategory,
        previousMonth: {
          totalIncome: pastIncome,
          totalExpenses: pastExpenses
        }
      };
    }),

  getBiggestExpenses: protectedProcedure
    .input(z.object({ month: z.date(), limit: z.number().default(5) }))
    .query(async ({ ctx, input }) => {
      const { month, limit } = input;
      const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

      // Usar agregação do prisma onde aplicável
      const aggNode = await ctx.prisma.transaction.groupBy({
        by: ['categoryId'],
        _sum: { amount: true },
        _count: { _all: true },
        where: {
          userId: ctx.user.id,
          type: "EXPENSE",
          transactionDate: { gte: startDate, lte: endDate }
        },
        orderBy: {
          _sum: { amount: "desc" }
        },
        take: limit,
      });

      // Como o Prisma GroupBy não suporta include relations, buscaremos os nomes manual.
      const categoryIds = aggNode.filter(n => n.categoryId).map(n => n.categoryId as string);
      const categories = await ctx.prisma.category.findMany({
        where: { id: { in: categoryIds } }
      });
      const catMap = new Map(categories.map(c => [c.id, c]));

      // Teto para as porcentagens (necessita a soma global para precisão real, mas isso não foi estritamente forçado), assumo % relativo ao "top group"
      const totalGlobalExpenses = aggNode.reduce((acc, curr) => acc + Number(curr._sum.amount || 0), 0);

      return aggNode.map((node) => {
        const cat = node.categoryId ? catMap.get(node.categoryId) : null;
        const total = Number(node._sum.amount || 0);

        return {
          category: cat ? cat.name : "Sem Categoria",
          color: cat ? cat.color : "#cbd5e1",
          total,
          count: node._count._all,
          percentOfTotal: totalGlobalExpenses > 0 ? (total / totalGlobalExpenses) * 100 : 0
        };
      });
    }),

  getMonthlyComparison: protectedProcedure
    .input(z.object({ months: z.number().default(6) }))
    .query(async ({ ctx, input }) => {
      const limitMonths = input.months;
      const result = [];
      const now = new Date();

      for (let i = limitMonths - 1; i >= 0; i--) {
        const workingDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const startDate = new Date(workingDate.getFullYear(), workingDate.getMonth(), 1);
        const endDate = new Date(workingDate.getFullYear(), workingDate.getMonth() + 1, 0, 23, 59, 59);

        const group = await ctx.prisma.transaction.groupBy({
          by: ['type'],
          _sum: { amount: true },
          where: {
            userId: ctx.user.id,
            transactionDate: { gte: startDate, lte: endDate }
          }
        });

        let mIncome = 0;
        let mExpense = 0;
        group.forEach(g => {
          if (g.type === "INCOME") mIncome += Number(g._sum.amount || 0);
          else mExpense += Number(g._sum.amount || 0);
        });

        result.push({
          month: startDate,
          totalIncome: mIncome,
          totalExpenses: mExpense,
          balance: mIncome - mExpense
        });
      }

      return result;
    }),

  /** Cria múltiplas transações de uma vez (lançamento em massa) */
  bulkCreate: protectedProcedure
    .input(BulkTransactionCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const data = input.transactions.map((t) => ({
        userId: ctx.user.id,
        amount: t.amount,
        type: t.type,
        categoryId: t.categoryId || null,
        description: t.description || null,
        transactionDate: t.transactionDate,
        isRecurring: false,
        recurrenceType: "NONE" as const,
      }));

      const result = await ctx.prisma.transaction.createMany({ data });
      return { count: result.count };
    }),
});
