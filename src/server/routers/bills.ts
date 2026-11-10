import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const BillSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().default("Outros"),
  amount: z.number().positive("Valor deve ser positivo"),
  dueDay: z.number().int().min(1).max(31),
  isRecurring: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

export const billsRouter = router({

  /** Lista todas as contas a pagar do usuário com status do mês */
  list: protectedProcedure
    .input(z.object({
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2020).max(2100),
    }))
    .query(async ({ ctx, input }) => {
      const { month, year } = input;
      const userId = ctx.user.id;

      const bills = await ctx.prisma.bill.findMany({
        where: { userId, isActive: true },
        include: {
          payments: {
            where: { month, year },
          },
        },
        orderBy: { dueDay: "asc" },
      });

      const today = new Date();
      const todayDay = today.getDate();
      const todayMonth = today.getMonth() + 1;
      const todayYear = today.getFullYear();

      return bills.map(bill => {
        const payment = bill.payments[0] ?? null;
        const isPaid = !!payment;

        // Uma conta está atrasada quando:
        // O dia de vencimento JÁ PASSOU no mês selecionado e ainda não foi paga
        const isCurrentMonth = month === todayMonth && year === todayYear;
        const isPastDue = !isPaid && (
          (year < todayYear) ||
          (year === todayYear && month < todayMonth) ||
          (isCurrentMonth && todayDay > bill.dueDay)
        );

        return {
          id: bill.id,
          name: bill.name,
          category: bill.category,
          amount: Number(bill.amount),
          dueDay: bill.dueDay,
          isRecurring: bill.isRecurring,
          notes: bill.notes,
          isPaid,
          isPastDue,
          paidAt: payment?.paidAt ?? null,
          paidAmount: payment ? Number(payment.amount) : null,
        };
      });
    }),

  /** Cria uma nova conta a pagar */
  create: protectedProcedure
    .input(BillSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.bill.create({
        data: { ...input, userId: ctx.user.id },
      });
    }),

  /** Atualiza uma conta a pagar */
  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: BillSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      const bill = await ctx.prisma.bill.findUnique({ where: { id: input.id } });
      if (!bill || bill.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.bill.update({ where: { id: input.id }, data: input.data });
    }),

  /** Remove uma conta (soft delete) */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const bill = await ctx.prisma.bill.findUnique({ where: { id: input.id } });
      if (!bill || bill.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.bill.update({ where: { id: input.id }, data: { isActive: false } });
    }),

  /** Marca uma conta como paga no mês selecionado e cria lançamento */
  pay: protectedProcedure
    .input(z.object({
      billId: z.string().uuid(),
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2020).max(2100),
      amount: z.number().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { billId, month, year } = input;
      const userId = ctx.user.id;

      const bill = await ctx.prisma.bill.findUnique({ where: { id: billId } });
      if (!bill || bill.userId !== userId) throw new TRPCError({ code: "NOT_FOUND" });

      const payAmount = input.amount ?? Number(bill.amount);

      // Cria o registro de pagamento (upsert para evitar duplicatas)
      const payment = await ctx.prisma.billPayment.upsert({
        where: { billId_month_year: { billId, month, year } },
        create: { billId, userId, month, year, amount: payAmount },
        update: { paidAt: new Date(), amount: payAmount },
      });

      // Cria lançamento no livro caixa
      const paidDate = new Date(year, month - 1, bill.dueDay);
      const today = new Date();
      const txDate = paidDate > today ? today : paidDate;

      // Verifica se já existe lançamento para essa conta nesse mês
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      const existing = await ctx.prisma.transaction.findFirst({
        where: {
          userId,
          description: { contains: bill.name, mode: "insensitive" },
          type: "EXPENSE",
          transactionDate: { gte: startDate, lte: endDate },
        },
      });

      if (!existing) {
        await ctx.prisma.transaction.create({
          data: {
            userId,
            amount: payAmount,
            type: "EXPENSE",
            description: bill.name,
            transactionDate: txDate,
            isRecurring: false,
            recurrenceType: "NONE",
          },
        });
      }

      return { payment, transactionCreated: !existing };
    }),

  /** Remove pagamento (desfaz o pagamento do mês) */
  unpay: protectedProcedure
    .input(z.object({
      billId: z.string().uuid(),
      month: z.number().int().min(1).max(12),
      year: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { billId, month, year } = input;
      const userId = ctx.user.id;

      const payment = await ctx.prisma.billPayment.findUnique({
        where: { billId_month_year: { billId, month, year } },
      });
      if (!payment || payment.userId !== userId) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.prisma.billPayment.delete({
        where: { billId_month_year: { billId, month, year } },
      });

      return { success: true };
    }),
});
