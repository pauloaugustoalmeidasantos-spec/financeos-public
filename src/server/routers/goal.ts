import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { GoalCreateSchema } from "@/validations/goal";
import { calculateGoalMonthlyNeeded } from "@/lib/financial";
import { differenceInMonths } from "date-fns";
import Decimal from "decimal.js";

export const goalRouter = router({
  
  list: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().default(true) }).optional())
    .query(async ({ ctx, input }) => {
      const activeFilter = input?.activeOnly ? { isActive: true } : {};
      
      const goals = await ctx.prisma.goal.findMany({
        where: { userId: ctx.user.id, ...activeFilter },
        orderBy: [
          { priority: "asc" },
          { createdAt: "desc" }
        ],
      });

      const profile = await ctx.prisma.userProfile.findUnique({
        where: { userId: ctx.user.id }
      });
      const annualRate = profile?.interestRate ? Number(profile.interestRate) / 100 : 0.08;
      const monthlyIncome = profile?.monthlyIncome ? Number(profile.monthlyIncome) : 0;

      return goals.map(goal => {
        const target = Number(goal.targetAmount);
        const current = Number(goal.currentAmount);
        
        let monthsRemaining: number | null = null;
        let monthlyNeeded = 0;
        
        if (goal.deadline) {
          monthsRemaining = differenceInMonths(new Date(goal.deadline), new Date());
          monthsRemaining = Math.max(1, monthsRemaining); // minimo 1 mês para proteger div/zero
          
          monthlyNeeded = calculateGoalMonthlyNeeded(
            target,
            current,
            monthsRemaining,
            annualRate
          );
        }

        const percentComplete = Math.min(100, target > 0 ? (current / target) * 100 : 0);
        const isViable = monthlyNeeded <= (monthlyIncome * 0.5);

        return {
          ...goal,
          targetAmount: target,
          currentAmount: current,
          percentComplete,
          monthsRemaining,
          monthlyNeeded,
          isViable: goal.deadline ? isViable : true
        };
      });
    }),

  create: protectedProcedure
    .input(GoalCreateSchema)
    .mutation(async ({ ctx, input }) => {
      
      const profile = await ctx.prisma.userProfile.findUnique({
        where: { userId: ctx.user.id }
      });
      
      const annualRate = profile?.interestRate ? Number(profile.interestRate) / 100 : 0.08;
      const monthlyIncome = profile?.monthlyIncome ? Number(profile.monthlyIncome) : 0;

      let monthlyNeeded = 0;
      let isViable = true;

      // Se passou deadline, valida o esforço mensal
      if (input.deadline) {
        let diff = differenceInMonths(new Date(input.deadline), new Date());
        diff = Math.max(1, diff);
        
        monthlyNeeded = calculateGoalMonthlyNeeded(
          input.targetAmount,
          input.currentAmount,
          diff,
          annualRate
        );

        if (monthlyNeeded > (monthlyIncome * 0.5)) {
          isViable = false;
        }
      }

      const created = await ctx.prisma.goal.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          type: input.type,
          description: input.description,
          targetAmount: new Decimal(input.targetAmount),
          currentAmount: new Decimal(input.currentAmount),
          deadline: input.deadline,
          priority: input.priority,
          isActive: input.isActive,
          affectsPlanning: input.affectsPlanning
        }
      });

      return {
        ...created,
        targetAmount: Number(created.targetAmount),
        currentAmount: Number(created.currentAmount),
        monthlyNeeded,
        isViable
      };
    }),

  update: protectedProcedure
    .input(GoalCreateSchema.partial().and(z.object({ id: z.string() })))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      
      const existing = await ctx.prisma.goal.findUnique({ where: { id } });
      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Goal não encontrada ou não pertence a você" });
      }

      const updated = await ctx.prisma.goal.update({
        where: { id },
        data: {
          ...data,
          ...(data.targetAmount !== undefined && { targetAmount: new Decimal(data.targetAmount) }),
          ...(data.currentAmount !== undefined && { currentAmount: new Decimal(data.currentAmount) })
        }
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.goal.findUnique({ where: { id: input.id } });
      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.prisma.goal.delete({ where: { id: input.id } });
      return { success: true };
    }),

  addContribution: protectedProcedure
    .input(z.object({
      goalId: z.string(),
      amount: z.number().positive(),
      note: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.prisma.goal.findUnique({ where: { id: input.goalId } });
      if (!goal || goal.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Add to Ledger
      await ctx.prisma.goalContribution.create({
        data: {
          goalId: goal.id,
          userId: ctx.user.id,
          amount: new Decimal(input.amount),
          note: input.note
        }
      });

      // Update Top entity
      const newAmount = new Decimal(goal.currentAmount).plus(input.amount);
      const updated = await ctx.prisma.goal.update({
        where: { id: goal.id },
        data: {
          currentAmount: newAmount,
          // Optativo: isActive: false caso termine? Mantemos como logica livre.
        }
      });

      return updated;
    }),

  getTopGoals: protectedProcedure
    .input(z.object({ limit: z.number().default(3) }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 3;
      
      const goals = await ctx.prisma.goal.findMany({
        where: { userId: ctx.user.id, isActive: true },
        orderBy: [ { priority: "asc" }, { createdAt: "desc" } ],
        take: limit
      });

      return goals.map(goal => {
        const target = Number(goal.targetAmount);
        const current = Number(goal.currentAmount);

        let daysRemaining: number | null = null;
        if (goal.deadline) {
          const diffTime = new Date(goal.deadline).getTime() - new Date().getTime();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const percentComplete = Math.min(100, target > 0 ? (current / target) * 100 : 0);

        return {
          ...goal,
          targetAmount: target,
          currentAmount: current,
          percentComplete,
          daysRemaining
        };
      });
    })
});
