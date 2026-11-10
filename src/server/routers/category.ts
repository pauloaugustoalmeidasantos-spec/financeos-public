import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const categoryRouter = router({
  list: protectedProcedure
    .input(z.object({ type: z.enum(["INCOME", "EXPENSE", "ALL"]).optional() }).default({}))
    .query(async ({ ctx, input }) => {
      const { type } = input;
      const categories = await ctx.prisma.category.findMany({
        where: {
          OR: [
            { isDefault: true },
            { userId: ctx.user.id }
          ],
          ...(type && type !== "ALL" ? { type } : {}),
          isActive: true
        },
        orderBy: [
          { isDefault: "desc" },
          { name: "asc" }
        ]
      });
      return categories;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      icon: z.string().optional(),
      color: z.string().optional(),
      type: z.enum(["INCOME", "EXPENSE"])
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.category.findFirst({
        where: { userId: ctx.user.id, name: input.name, type: input.type }
      });
      
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Categoria já existe" });

      return ctx.prisma.category.create({
        data: {
          ...input,
          userId: ctx.user.id,
          isDefault: false
        }
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const cat = await ctx.prisma.category.findUnique({ where: { id: input.id } });
      if (!cat) throw new TRPCError({ code: "NOT_FOUND" });
      if (cat.isDefault || cat.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Categorias padrões não podem ser editadas" });
      }

      return ctx.prisma.category.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.icon && { icon: input.icon }),
          ...(input.color && { color: input.color })
        }
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const cat = await ctx.prisma.category.findUnique({ where: { id: input.id } });
      if (!cat) throw new TRPCError({ code: "NOT_FOUND" });
      if (cat.isDefault || cat.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Categorias padrões não podem ser excluídas" });
      }

      // Deleta e O prisma fará cascade (transacoes perdem categoria via onDelete: SetNull setupado no Schema)
      await ctx.prisma.category.delete({ where: { id: input.id } });
      return { success: true };
    })
});
