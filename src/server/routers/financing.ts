import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { FinancingCreateSchema, FinancingPayInstallmentSchema, FinancingUpdateSchema } from "@/validations/financing";
import Decimal from "decimal.js";

export const financingRouter = router({

  list: protectedProcedure
    .query(async ({ ctx }) => {
      const financings = await ctx.prisma.financing.findMany({
        where: { userId: ctx.user.id, isActive: true },
        include: { asset: true },
        orderBy: { createdAt: "desc" },
      });

      return financings.map(f => ({
        ...f,
        totalValue: Number(f.totalValue),
        downPayment: Number(f.downPayment),
        monthlyPayment: Number(f.monthlyPayment),
        interestRate: f.interestRate ? Number(f.interestRate) : null,
        paidAmount: Number(f.monthlyPayment) * f.paidInstallments + Number(f.downPayment),
        remainingInstallments: f.totalInstallments - f.paidInstallments,
        progress: Math.round((f.paidInstallments / f.totalInstallments) * 100),
        assetValue: f.asset ? Number(f.asset.currentValue) : 0,
      }));
    }),

  create: protectedProcedure
    .input(FinancingCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        // 1. Create the asset linked to patrimônio (PHYSICAL type)
        const asset = await tx.asset.create({
          data: {
            userId: ctx.user.id,
            name: input.name,
            type: "PHYSICAL",
            category: input.type === "IMOVEL" ? "Imóvel Residencial" : input.type === "VEICULO" ? "Veículo" : "Outros",
            currentValue: new Decimal(input.downPayment + (input.monthlyPayment * (input.paidInstallments || 0))),
            purchaseValue: new Decimal(input.totalValue),
            purchaseDate: input.startDate,
            description: input.description || `Financiamento: ${input.name}`,
            isActive: true,
            source: "FINANCING",
          },
        });

        // 2. Create financing linked to the asset
        const financing = await tx.financing.create({
          data: {
            userId: ctx.user.id,
            name: input.name,
            type: input.type,
            totalValue: new Decimal(input.totalValue),
            downPayment: new Decimal(input.downPayment),
            totalInstallments: input.totalInstallments,
            paidInstallments: input.paidInstallments || 0,
            monthlyPayment: new Decimal(input.monthlyPayment),
            interestRate: input.interestRate !== undefined ? new Decimal(input.interestRate) : null,
            startDate: input.startDate,
            description: input.description,
            assetId: asset.id,
          },
        });

        // 3. If down payment > 0, register it as a transaction (expense)
        if (input.downPayment > 0) {
          // Find or create "Financiamento" category
          let category = await tx.category.findFirst({
            where: {
              OR: [
                { userId: ctx.user.id, name: "Financiamento", type: "EXPENSE" },
                { isDefault: true, name: "Financiamento", type: "EXPENSE" },
              ],
            },
          });

          if (!category) {
            category = await tx.category.create({
              data: {
                userId: ctx.user.id,
                name: "Financiamento",
                icon: "🏠",
                color: "#6366f1",
                type: "EXPENSE",
              },
            });
          }

          await tx.transaction.create({
            data: {
              userId: ctx.user.id,
              amount: new Decimal(input.downPayment),
              type: "EXPENSE",
              categoryId: category.id,
              description: `Entrada - ${input.name}`,
              transactionDate: input.startDate,
            },
          });
        }

        return { ...financing, totalValue: Number(financing.totalValue) };
      });
    }),

  payInstallment: protectedProcedure
    .input(FinancingPayInstallmentSchema)
    .mutation(async ({ ctx, input }) => {
      const financing = await ctx.prisma.financing.findUnique({
        where: { id: input.financingId },
        include: { asset: true },
      });

      if (!financing || financing.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Financiamento não encontrado" });
      }

      if (financing.paidInstallments >= financing.totalInstallments) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Todas as parcelas já foram pagas" });
      }

      const paymentAmount = input.amount || Number(financing.monthlyPayment);
      const paymentDate = input.date || new Date();

      return ctx.prisma.$transaction(async (tx) => {
        // 1. Increment paid installments
        const updated = await tx.financing.update({
          where: { id: financing.id },
          data: {
            paidInstallments: financing.paidInstallments + 1,
          },
        });

        // 2. Update asset value in patrimônio (accumulated paid amount)
        if (financing.assetId) {
          const newPaidTotal = Number(financing.downPayment) + (Number(financing.monthlyPayment) * (financing.paidInstallments + 1));
          await tx.asset.update({
            where: { id: financing.assetId },
            data: {
              currentValue: new Decimal(newPaidTotal),
            },
          });
        }

        // 3. Create expense transaction
        let category = await tx.category.findFirst({
          where: {
            OR: [
              { userId: ctx.user.id, name: "Financiamento", type: "EXPENSE" },
              { isDefault: true, name: "Financiamento", type: "EXPENSE" },
            ],
          },
        });

        if (!category) {
          category = await tx.category.create({
            data: {
              userId: ctx.user.id,
              name: "Financiamento",
              icon: "🏠",
              color: "#6366f1",
              type: "EXPENSE",
            },
          });
        }

        await tx.transaction.create({
          data: {
            userId: ctx.user.id,
            amount: new Decimal(paymentAmount),
            type: "EXPENSE",
            categoryId: category.id,
            description: input.description || `Parcela ${financing.paidInstallments + 1}/${financing.totalInstallments} - ${financing.name}`,
            transactionDate: paymentDate,
          },
        });

        return {
          ...updated,
          totalValue: Number(updated.totalValue),
          monthlyPayment: Number(updated.monthlyPayment),
          paidInstallments: updated.paidInstallments,
        };
      });
    }),

  update: protectedProcedure
    .input(FinancingUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.financing.findUnique({
        where: { id: input.id },
      });

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Financiamento não encontrado" });
      }

      return ctx.prisma.$transaction(async (tx) => {
        const financing = await tx.financing.update({
          where: { id: input.id },
          data: {
            name: input.name,
            type: input.type,
            totalValue: new Decimal(input.totalValue),
            downPayment: new Decimal(input.downPayment),
            totalInstallments: input.totalInstallments,
            paidInstallments: input.paidInstallments,
            monthlyPayment: new Decimal(input.monthlyPayment),
            interestRate: input.interestRate !== null && input.interestRate !== undefined ? new Decimal(input.interestRate) : null,
            startDate: input.startDate,
            description: input.description,
          },
        });

        // Update asset value in patrimônio (accumulated paid amount)
        if (financing.assetId) {
          const newPaidTotal = Number(financing.downPayment) + (Number(financing.monthlyPayment) * financing.paidInstallments);
          await tx.asset.update({
            where: { id: financing.assetId },
            data: {
              name: input.name,
              category: input.type === "IMOVEL" ? "Imóvel Residencial" : input.type === "VEICULO" ? "Veículo" : "Outros",
              currentValue: new Decimal(newPaidTotal),
              purchaseValue: new Decimal(input.totalValue),
              purchaseDate: input.startDate,
              description: input.description || `Financiamento: ${input.name}`,
            },
          });
        }

        return {
          ...financing,
          totalValue: Number(financing.totalValue),
          downPayment: Number(financing.downPayment),
          monthlyPayment: Number(financing.monthlyPayment),
          interestRate: financing.interestRate ? Number(financing.interestRate) : null,
        };
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.financing.findUnique({ where: { id: input.id } });
      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.prisma.financing.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      return { success: true };
    }),
});
