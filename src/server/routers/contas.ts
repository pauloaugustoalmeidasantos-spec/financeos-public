import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { parseCreditCardStatement, parseCreditCardStatementFromPDF } from "../services/credit-card-ai";

// ─── Schemas ───────────────────────────────────────────────────────────────

const BankAccountSchema = z.object({
  bankName: z.string().min(1),
  accountType: z.enum(["CHECKING", "SAVINGS", "INVESTMENT"]).default("CHECKING"),
  agencia: z.string().optional(),
  conta: z.string().optional(),
});

const CreditCardSchema = z.object({
  bankAccountId: z.string().uuid().optional().nullable(),
  cardName: z.string().min(1),
  lastFourDigits: z.string().max(4).optional().nullable(),
  dueDay: z.number().int().min(1).max(31).optional().nullable(),
  closingDay: z.number().int().min(1).max(31).optional().nullable(),
  isAutoDebit: z.boolean().default(false),
  limit: z.number().positive().optional().nullable(),
  color: z.string().optional().nullable(),
});

const InstallmentSchema = z.object({
  creditCardId: z.string().uuid(),
  description: z.string().min(1),
  totalAmount: z.number().positive(),
  installmentValue: z.number().positive(),
  totalInstallments: z.number().int().positive(),
  paidInstallments: z.number().int().min(0).default(0),
  startMonth: z.number().int().min(1).max(12),
  startYear: z.number().int().min(2020).max(2100),
  categoryId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ─── Router ───────────────────────────────────────────────────────────────

export const contasRouter = router({

  // ──────────────────────────────
  // BANK ACCOUNTS
  // ──────────────────────────────

  listBankAccounts: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.prisma.bankAccount.findMany({
      where: { userId: ctx.user.id, isActive: true },
      include: {
        creditCards: {
          where: { isActive: true },
          include: {
            installments: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return accounts;
  }),

  createBankAccount: protectedProcedure
    .input(BankAccountSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.bankAccount.create({
        data: { ...input, userId: ctx.user.id },
      });
    }),

  updateBankAccount: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: BankAccountSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      const acc = await ctx.prisma.bankAccount.findUnique({ where: { id: input.id } });
      if (!acc || acc.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.bankAccount.update({ where: { id: input.id }, data: input.data });
    }),

  deleteBankAccount: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const acc = await ctx.prisma.bankAccount.findUnique({ where: { id: input.id } });
      if (!acc || acc.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.bankAccount.update({ where: { id: input.id }, data: { isActive: false } });
    }),

  // ──────────────────────────────
  // CREDIT CARDS
  // ──────────────────────────────

  listCreditCards: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.creditCard.findMany({
      where: { userId: ctx.user.id, isActive: true },
      include: {
        bankAccount: true,
        installments: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  createCreditCard: protectedProcedure
    .input(CreditCardSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.creditCard.create({
        data: { ...input, userId: ctx.user.id },
        include: { bankAccount: true, installments: true },
      });
    }),

  updateCreditCard: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: CreditCardSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      const card = await ctx.prisma.creditCard.findUnique({ where: { id: input.id } });
      if (!card || card.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.creditCard.update({ where: { id: input.id }, data: input.data });
    }),

  deleteCreditCard: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const card = await ctx.prisma.creditCard.findUnique({ where: { id: input.id } });
      if (!card || card.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.creditCard.update({ where: { id: input.id }, data: { isActive: false } });
    }),

  // ──────────────────────────────
  // INSTALLMENTS (Parcelamentos)
  // ──────────────────────────────

  listInstallments: protectedProcedure
    .input(z.object({ creditCardId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.cardInstallment.findMany({
        where: {
          userId: ctx.user.id,
          isActive: true,
          ...(input.creditCardId && { creditCardId: input.creditCardId }),
        },
        orderBy: [{ startYear: "desc" }, { startMonth: "desc" }],
      });
    }),

  createInstallment: protectedProcedure
    .input(InstallmentSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify card belongs to user
      const card = await ctx.prisma.creditCard.findUnique({ where: { id: input.creditCardId } });
      if (!card || card.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

      const installment = await ctx.prisma.cardInstallment.create({
        data: { ...input, userId: ctx.user.id },
      });

      return installment;
    }),

  createInstallmentBatch: protectedProcedure
    .input(z.array(InstallmentSchema))
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) return { count: 0 };
      // Verificamos o dono do cartão pelo primeiro (assume-se que todos vão pro mesmo cartão)
      const cardId = input[0].creditCardId;
      const card = await ctx.prisma.creditCard.findUnique({ where: { id: cardId } });
      if (!card || card.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

      const dataToInsert = input.map(i => ({
        ...i,
        userId: ctx.user.id,
      }));

      const result = await ctx.prisma.cardInstallment.createMany({
        data: dataToInsert,
      });

      return { count: result.count };
    }),

  parseStatementWithAI: protectedProcedure
    .input(z.object({ rawText: z.string().min(5) }))
    .mutation(async ({ input }) => {
      try {
        const parsed = await parseCreditCardStatement(input.rawText);
        return parsed;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Erro ao processar o extrato",
        });
      }
    }),

  parseStatementFromPDF: protectedProcedure
    .input(z.object({ pdfBase64: z.string().min(100) }))
    .mutation(async ({ input }) => {
      try {
        const parsed = await parseCreditCardStatementFromPDF(input.pdfBase64);
        return parsed;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Erro ao processar o PDF",
        });
      }
    }),

  updateInstallment: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: InstallmentSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      const inst = await ctx.prisma.cardInstallment.findUnique({ where: { id: input.id } });
      if (!inst || inst.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.cardInstallment.update({ where: { id: input.id }, data: input.data });
    }),

  /**
   * Marca uma parcela como paga e cria o lançamento correspondente
   * se não existir um lançamento com a mesma descrição/mês.
   */
  payInstallment: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      month: z.number().int().min(1).max(12),
      year: z.number().int(),
      createTransaction: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const inst = await ctx.prisma.cardInstallment.findUnique({ where: { id: input.id } });
      if (!inst || inst.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

      const newPaid = Math.min(inst.paidInstallments + 1, inst.totalInstallments);

      await ctx.prisma.cardInstallment.update({
        where: { id: input.id },
        data: { paidInstallments: newPaid },
      });

      if (input.createTransaction) {
        const startDate = new Date(input.year, input.month - 1, 1);
        const endDate = new Date(input.year, input.month, 0, 23, 59, 59);

        // Check if a matching transaction already exists this month
        const existing = await ctx.prisma.transaction.findFirst({
          where: {
            userId: ctx.user.id,
            description: { contains: inst.description, mode: "insensitive" },
            transactionDate: { gte: startDate, lte: endDate },
            type: "EXPENSE",
          },
        });

        if (!existing) {
          const installmentNum = newPaid;
          const txDate = new Date(input.year, input.month - 1, 15); // mid-month
          await ctx.prisma.transaction.create({
            data: {
              userId: ctx.user.id,
              amount: inst.installmentValue,
              type: "EXPENSE",
              description: `${inst.description} (${installmentNum}/${inst.totalInstallments})`,
              transactionDate: txDate,
              categoryId: inst.categoryId || null,
              isRecurring: false,
              recurrenceType: "NONE",
            },
          });
        }
      }

      return { success: true, paidInstallments: newPaid };
    }),

  payFullCard: protectedProcedure
    .input(z.object({
      creditCardId: z.string().uuid(),
      month: z.number().int().min(1).max(12),
      year: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { creditCardId, month, year } = input;
      
      const card = await ctx.prisma.creditCard.findUnique({
        where: { id: creditCardId },
        include: {
          installments: {
            where: { userId: ctx.user.id, isActive: true },
          },
        },
      });

      if (!card || card.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

      // Filtrar as parcelas ativas neste mês
      const activeThisMonth = card.installments.filter((inst) => {
        const monthsElapsed = (year - inst.startYear) * 12 + (month - inst.startMonth);
        const isStarted = monthsElapsed >= 0;
        const isNotFinished = inst.paidInstallments < inst.totalInstallments;
        return isStarted && isNotFinished;
      });

      if (activeThisMonth.length === 0) return { success: true, count: 0 };

      // Incrementar paidInstallments para todas
      for (const inst of activeThisMonth) {
        await ctx.prisma.cardInstallment.update({
          where: { id: inst.id },
          data: { paidInstallments: inst.paidInstallments + 1 },
        });
      }

      const totalMonthlyValue = activeThisMonth.reduce(
        (acc, inst) => acc + Number(inst.installmentValue),
        0
      );

      // Criar a transação PAI (Fatura)
      const txDate = new Date(year, month - 1, card.dueDay || 10);
      const parentTx = await ctx.prisma.transaction.create({
        data: {
          userId: ctx.user.id,
          amount: totalMonthlyValue,
          type: "EXPENSE",
          description: `Fatura ${card.cardName} - ${month}/${year}`,
          transactionDate: txDate,
          isRecurring: false,
          recurrenceType: "NONE",
        },
      });

      // Criar as transações FILHAS (cada item da fatura)
      const childData = activeThisMonth.map((inst) => ({
        userId: ctx.user.id,
        amount: inst.installmentValue,
        type: "EXPENSE" as const,
        description: `${inst.description} (${inst.paidInstallments + 1}/${inst.totalInstallments})`,
        transactionDate: txDate,
        categoryId: inst.categoryId || null,
        isRecurring: false,
        recurrenceType: "NONE" as const,
        parentId: parentTx.id, // Vincula à fatura principal
      }));

      if (childData.length > 0) {
        await ctx.prisma.transaction.createMany({ data: childData });
      }

      return { success: true, count: activeThisMonth.length };
    }),

  deleteInstallment: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const inst = await ctx.prisma.cardInstallment.findUnique({ where: { id: input.id } });
      if (!inst || inst.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.cardInstallment.update({ where: { id: input.id }, data: { isActive: false } });
    }),

  /**
   * Retorna o resumo do cartão para o mês:
   * - Total de parcelas ativas
   * - Valor mensal comprometido
   * - Itens vencendo este mês
   */
  getCardSummaryForMonth: protectedProcedure
    .input(z.object({ creditCardId: z.string().uuid(), month: z.number(), year: z.number() }))
    .query(async ({ ctx, input }) => {
      const { creditCardId, month, year } = input;

      const card = await ctx.prisma.creditCard.findUnique({
        where: { id: creditCardId },
        include: {
          installments: {
            where: {
              userId: ctx.user.id,
              isActive: true,
            },
          },
        },
      });

      if (!card || card.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

      // Active installments this month = started on or before this month AND not yet fully paid
      const activeThisMonth = card.installments.filter((inst) => {
        const monthsElapsed =
          (year - inst.startYear) * 12 + (month - inst.startMonth);
        const isStarted = monthsElapsed >= 0;
        const isNotFinished = inst.paidInstallments < inst.totalInstallments;
        return isStarted && isNotFinished;
      });

      const totalMonthlyValue = activeThisMonth.reduce(
        (acc, inst) => acc + Number(inst.installmentValue),
        0
      );

      return {
        card: { ...card, limit: card.limit ? Number(card.limit) : null },
        activeInstallments: activeThisMonth.map((i) => ({
          ...i,
          totalAmount: Number(i.totalAmount),
          installmentValue: Number(i.installmentValue),
          remaining: i.totalInstallments - i.paidInstallments,
        })),
        totalMonthlyValue,
      };
    }),
});
