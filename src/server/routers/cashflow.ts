import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const CashFlowEntrySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.number().positive("Valor deve ser positivo"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  isRecurring: z.boolean().optional().default(false),
  recurrenceInterval: z.number().int().min(1).max(12).optional().default(1),
});

const MonthYearSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

export const cashflowRouter = router({

  /**
   * Retorna as entradas/saídas previstas + os valores reais calculados
   * a partir dos lançamentos (transactions) do período.
   */
  summary: protectedProcedure
    .input(MonthYearSchema)
    .query(async ({ ctx, input }) => {
      const { month, year } = input;
      const userId = ctx.user.id;

      // 1. Itens explicitamente cadastrados no Fluxo de Caixa
      const entries = await ctx.prisma.cashFlowEntry.findMany({
        where: { userId, month, year },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      });

      // 2. Buscar orçamentos do mês para auto-popular saídas previstas
      const budgets = await ctx.prisma.budget.findMany({
        where: { userId, month, year },
        include: { category: true },
      });

      // 3. Reais do período via lançamentos
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const realAgg = await ctx.prisma.transaction.groupBy({
        by: ["type"],
        _sum: { amount: true },
        where: {
          userId,
          transactionDate: { gte: startDate, lte: endDate },
        },
      });

      // 4. Receitas reais do mês (para sugerir entradas previstas)
      const incomeTransactions = await ctx.prisma.transaction.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
        where: {
          userId,
          type: "INCOME",
          transactionDate: { gte: startDate, lte: endDate },
        },
      });

      const realIncome = Number(
        realAgg.find((r) => r.type === "INCOME")?._sum.amount ?? 0
      );
      const realExpense = Number(
        realAgg.find((r) => r.type === "EXPENSE")?._sum.amount ?? 0
      );

      // 5. Mesclar orçamentos como saídas previstas virtuais
      // (apenas os que não têm entrada manual correspondente pelo mesmo nome)
      const existingExpenseKeys = new Set(
        entries
          .filter((e) => e.type === "EXPENSE")
          .map((e) => e.description.toLowerCase().trim())
      );
      // Saídas virtuais vindas dos orçamentos
      // IMPORTANTE: o campo `type` é obrigatório para que o cliente consiga
      // filtrar income vs expense sem erros de TypeScript.
      const virtualExpenses: Array<{ id: string; type: string; description: string; amount: number; isRecurring: boolean; isVirtual: boolean }> = [];
      for (const budget of budgets) {
        const key = budget.category.name.toLowerCase().trim();
        if (!existingExpenseKeys.has(key)) {
          virtualExpenses.push({
            id: `budget::${budget.id}`,
            type: "EXPENSE",
            description: budget.category.name,
            amount: Number(budget.amount),
            isRecurring: true,
            isVirtual: true,
          });
        }
      }

      // Formatar entradas reais
      const formattedEntries = entries.map((e) => ({
        ...e,
        amount: Number(e.amount),
        isVirtual: false,
      }));

      // Combinar entradas reais + virtuais dos orçamentos
      const allExpenseEntries = [
        ...formattedEntries.filter((e) => e.type === "EXPENSE"),
        ...virtualExpenses,
      ];
      const allIncomeEntries = formattedEntries.filter((e) => e.type === "INCOME");
      const allEntries = [...allIncomeEntries, ...allExpenseEntries];

      // 6. Totais previstos
      const plannedIncome = allIncomeEntries.reduce((acc, e) => acc + e.amount, 0);
      const plannedExpense = [...formattedEntries.filter(e => e.type === "EXPENSE"), ...virtualExpenses]
        .reduce((acc, e) => acc + e.amount, 0);

      return {
        entries: allEntries,
        summary: {
          plannedIncome,
          plannedExpense,
          plannedBalance: plannedIncome - plannedExpense,
          realIncome,
          realExpense,
          realBalance: realIncome - realExpense,
        },
      };
    }),

  /** Cria um novo item de fluxo de caixa. */
  create: protectedProcedure
    .input(CashFlowEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      return ctx.prisma.cashFlowEntry.create({
        data: { ...input, userId },
      });
    }),

  /** Atualiza um item existente. */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: CashFlowEntrySchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.cashFlowEntry.findUnique({
        where: { id: input.id },
      });
      if (!entry || entry.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.prisma.cashFlowEntry.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  /** Remove um item. */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.cashFlowEntry.findUnique({
        where: { id: input.id },
      });
      if (!entry || entry.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.prisma.cashFlowEntry.delete({ where: { id: input.id } });
    }),

  /**
   * Marca um item como pago, criando automaticamente o lançamento na data de HOJE.
   * Pode ser chamado:
   * - a partir do Fluxo de Caixa: passa `id` (uuid do cashflow entry)
   * - a partir dos Orçamentos: passa `categoryName` + `amount` (sem id de cashflow)
   */
  markAsPaid: protectedProcedure
    .input(z.object({
      id: z.string().uuid().optional(),
      month: z.number().int().min(1).max(12),
      year: z.number().int(),
      // Campos extras para chamadas vindas da tela de Orçamentos
      categoryName: z.string().optional(),
      categoryId: z.string().optional(),
      amount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      let description: string;
      let txAmount: number;
      let txType: "INCOME" | "EXPENSE" = "EXPENSE";

      if (input.id) {
        // Chamada vinda do Fluxo de Caixa — buscar o entry pelo id
        const entry = await ctx.prisma.cashFlowEntry.findUnique({ where: { id: input.id } });
        if (!entry || entry.userId !== userId) throw new TRPCError({ code: "NOT_FOUND" });
        description = entry.description;
        txAmount = Number(entry.amount);
        txType = entry.type as "INCOME" | "EXPENSE";
      } else if (input.categoryName && input.amount !== undefined) {
        // Chamada vinda dos Orçamentos — usar o nome da categoria
        description = input.categoryName;
        txAmount = input.amount;
        txType = "EXPENSE";
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe id ou categoryName+amount." });
      }

      // Resolve categoryId from input or from category name lookup
      let resolvedCategoryId: string | null = input.categoryId ?? null;
      if (!resolvedCategoryId && input.categoryName) {
        const cat = await ctx.prisma.category.findFirst({
          where: { userId, name: { equals: input.categoryName, mode: "insensitive" }, isActive: true },
        });
        if (cat) resolvedCategoryId = cat.id;
      }

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate   = new Date(input.year, input.month, 0, 23, 59, 59);

      // Verificar se já existe lançamento com o mesmo nome nesse mês
      const existing = await ctx.prisma.transaction.findFirst({
        where: {
          userId,
          ...(resolvedCategoryId
            ? { categoryId: resolvedCategoryId }
            : { description: { contains: description, mode: "insensitive" } }),
          type: txType,
          transactionDate: { gte: startDate, lte: endDate },
        },
      });

      if (existing) {
        return { created: false, message: "Lançamento já existe para esse item neste mês." };
      }

      // Usar a data de HOJE como data do lançamento
      const today = new Date();
      // Garantir que a data esteja dentro do mês selecionado
      const txDate = today.getMonth() + 1 === input.month && today.getFullYear() === input.year
        ? today
        : new Date(input.year, input.month - 1, 1); // Se mês diferente, usar dia 1 do mês

      await ctx.prisma.transaction.create({
        data: {
          userId,
          amount: txAmount,
          type: txType,
          categoryId: resolvedCategoryId,
          description,
          transactionDate: txDate,
          isRecurring: false,
          recurrenceType: "NONE",
        },
      });

      return { created: true, message: "Lançamento criado com sucesso!" };
    }),



  /**
   * Replica os itens recorrentes para o mês atual, respeitando o intervalo.
   * - interval=1: replica todo mês (busca 1 mês atrás)
   * - interval=2: replica a cada 2 meses (busca 2 meses atrás)
   * - interval=3: replica a cada 3 meses (busca 3 meses atrás), etc.
   */
  replicateRecurring: protectedProcedure
    .input(MonthYearSchema)
    .mutation(async ({ ctx, input }) => {
      const { month, year } = input;
      const userId = ctx.user.id;

      // Buscar todos os itens recorrentes dos últimos 12 meses
      const allRecurring = await ctx.prisma.cashFlowEntry.findMany({
        where: { userId, isRecurring: true },
      });

      // Itens já existentes no mês atual
      const existing = await ctx.prisma.cashFlowEntry.findMany({
        where: { userId, month, year },
        select: { description: true, type: true },
      });
      const existingKeys = new Set(existing.map((e) => `${e.type}::${e.description}`));

      // Para cada intervalo único, calcular o mês-fonte
      const toCreate: typeof allRecurring = [];

      for (const entry of allRecurring) {
        const interval = entry.recurrenceInterval ?? 1;

        // Calcular o mês de onde viria esta replicação
        let srcMonth = month - interval;
        let srcYear = year;
        while (srcMonth <= 0) { srcMonth += 12; srcYear -= 1; }

        // A entrada deve existir exatamente no mês-fonte
        if (entry.month === srcMonth && entry.year === srcYear) {
          const key = `${entry.type}::${entry.description}`;
          if (!existingKeys.has(key)) {
            toCreate.push(entry);
          }
        }
      }

      if (toCreate.length === 0) return { created: 0 };

      await ctx.prisma.cashFlowEntry.createMany({
        data: toCreate.map(({ id, createdAt, updatedAt, ...rest }) => ({
          ...rest,
          month,
          year,
        })),
      });

      return { created: toCreate.length };
    }),
});
