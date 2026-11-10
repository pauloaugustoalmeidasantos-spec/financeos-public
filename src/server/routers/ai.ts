import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  generateInsightsForUser,
  checkInsightRateLimit,
} from "../services/ai-insights";

const InsightModuleEnum = z.enum([
  "DASHBOARD",
  "FINANCES",
  "GOALS",
  "FUTURE",
  "PATRIMONY",
]);

export const aiRouter = router({
  /**
   * Busca insights do usuário, com filtros opcionais.
   */
  getInsights: protectedProcedure
    .input(
      z.object({
        module: InsightModuleEnum.optional(),
        unreadOnly: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: ctx.user.id,
        isDismissed: false,
      };

      if (input.module) {
        where.module = input.module;
      }

      if (input.unreadOnly) {
        where.isRead = false;
      }

      const insights = await ctx.prisma.aiInsight.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      return insights;
    }),

  /**
   * Gera novos insights via GPT-4o.
   * Rate limit: máximo 3 gerações por usuário por dia.
   */
  generateInsights: protectedProcedure
    .input(
      z
        .object({
          modules: z.array(InsightModuleEnum).optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      // Rate limit check
      const rateCheck = await checkInsightRateLimit(ctx.user.id);

      if (!rateCheck.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Você atingiu o limite de 3 gerações de insights por dia. Tente novamente amanhã.",
        });
      }

      const insights = await generateInsightsForUser(
        ctx.prisma,
        ctx.user.id,
        input?.modules
      );

      return {
        generated: insights.length,
        remaining: rateCheck.remaining,
        insights,
      };
    }),

  /**
   * Marca um insight como lido.
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const insight = await ctx.prisma.aiInsight.findUnique({
        where: { id: input.id },
      });

      if (!insight || insight.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Insight não encontrado.",
        });
      }

      return ctx.prisma.aiInsight.update({
        where: { id: input.id },
        data: { isRead: true },
      });
    }),

  /**
   * Descarta/oculta um insight.
   */
  dismiss: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const insight = await ctx.prisma.aiInsight.findUnique({
        where: { id: input.id },
      });

      if (!insight || insight.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Insight não encontrado.",
        });
      }

      return ctx.prisma.aiInsight.update({
        where: { id: input.id },
        data: { isDismissed: true },
      });
    }),

  /**
   * Contagem de insights não lidos para badge na sidebar.
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.prisma.aiInsight.count({
      where: {
        userId: ctx.user.id,
        isRead: false,
        isDismissed: false,
      },
    });

    return { count };
  }),
});
