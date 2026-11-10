import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { UserProfileSchema } from "@/validations/user-profile";
import { createClient } from "@/lib/supabase/server";

export const userRouter = router({
  healthCheck: publicProcedure.query(() => {
    return { status: "ok" as const, timestamp: new Date() };
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        profile: true,
        subscription: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Usuário não encontrado.",
      });
    }

    // Include auth providers so the frontend can adapt the security section.
    // Supabase stores providers in two ways:
    //   - app_metadata.providers: string[]  (preferred, may be absent on older accounts)
    //   - app_metadata.provider:  string    (always present, the primary provider)
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    const providersArray: string[] = Array.isArray(authUser?.app_metadata?.providers)
      ? authUser!.app_metadata.providers
      : authUser?.app_metadata?.provider
        ? [authUser.app_metadata.provider as string]
        : [];

    // true when the account has an email+password identity (not Google-only)
    const hasPasswordProvider = providersArray.includes("email");
    // true when the account has Google linked (may also have email)
    const hasGoogle = providersArray.includes("google");

    return { ...user, providers: providersArray, hasPasswordProvider, hasGoogle };
  }),

  updateProfile: protectedProcedure
    .input(UserProfileSchema.partial())
    .mutation(async ({ ctx, input }) => {
      const { name, avatarUrl, ...profileData } = input;

      // Update User if needed
      if (name !== undefined || avatarUrl !== undefined) {
        await ctx.prisma.user.update({
          where: { id: ctx.user.id },
          data: {
            ...(name !== undefined && { name }),
            ...(avatarUrl !== undefined && { avatarUrl }),
          },
        });
      }

      // Upsert UserProfile
      const profile = await ctx.prisma.userProfile.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          phone: profileData.phone,
          birthDate: profileData.birthDate,
          monthlyIncome: profileData.monthlyIncome ?? 0,
          additionalIncomes: profileData.additionalIncomes ? JSON.parse(JSON.stringify(profileData.additionalIncomes)) : [],
          incomeType: profileData.incomeType ?? "SALARY",
          incomeStability: profileData.incomeStability ?? "STABLE",
          financialGoal: profileData.financialGoal ?? "GROW_WEALTH",
          retirementAge: profileData.retirementAge ?? 65,
          retirementGoal: profileData.retirementGoal ?? 0,
          desiredMonthlyIncome: profileData.desiredMonthlyIncome ?? 0,
          monthlyInvestment: profileData.monthlyInvestment ?? 0,
          interestRate: profileData.interestRate ?? 8.0,
          inflationRate: profileData.inflationRate ?? 4.5,
          currency: profileData.currency ?? "BRL",
          notificationsEnabled: profileData.notificationsEnabled ?? true,
          aiAlertsEnabled: profileData.aiAlertsEnabled ?? true,
        },
        update: {
          ...profileData,
        },
      });

      return profile;
    }),

  completeOnboarding: protectedProcedure
    .input(
      z.object({
        step: z.enum(["accounts", "finances", "goals", "retirement"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { step } = input;

      if (step === "accounts") {
        // Create default categories if none exist
        const count = await ctx.prisma.category.count({
          where: { userId: ctx.user.id, isDefault: true },
        });

        if (count === 0) {
          await ctx.prisma.category.createMany({
            data: [
              // Expenses
              { userId: ctx.user.id, name: "Alimentação", type: "EXPENSE", isDefault: true, isActive: true },
              { userId: ctx.user.id, name: "Transporte", type: "EXPENSE", isDefault: true, isActive: true },
              { userId: ctx.user.id, name: "Moradia", type: "EXPENSE", isDefault: true, isActive: true },
              { userId: ctx.user.id, name: "Saúde", type: "EXPENSE", isDefault: true, isActive: true },
              { userId: ctx.user.id, name: "Lazer", type: "EXPENSE", isDefault: true, isActive: true },
              { userId: ctx.user.id, name: "Educação", type: "EXPENSE", isDefault: true, isActive: true },
              { userId: ctx.user.id, name: "Vestuário", type: "EXPENSE", isDefault: true, isActive: true },
              { userId: ctx.user.id, name: "Outros", type: "EXPENSE", isDefault: true, isActive: true },
              // Incomes
              { userId: ctx.user.id, name: "Salário", type: "INCOME", isDefault: true, isActive: true },
              { userId: ctx.user.id, name: "Freelance", type: "INCOME", isDefault: true, isActive: true },
              { userId: ctx.user.id, name: "Investimentos", type: "INCOME", isDefault: true, isActive: true },
              { userId: ctx.user.id, name: "Outros", type: "INCOME", isDefault: true, isActive: true },
            ],
            skipDuplicates: true,
          });
        }
      }

      // Determine next steps
      const profile = await ctx.prisma.userProfile.findUnique({ where: { userId: ctx.user.id } });
      const goalsCount = await ctx.prisma.goal.count({ where: { userId: ctx.user.id } });
      const assetsCount = await ctx.prisma.asset.count({ where: { userId: ctx.user.id } });

      const accountsDone = !!profile && Number(profile.monthlyIncome) > 0;
      const financesDone = assetsCount > 0;
      const goalsDone = goalsCount > 0;
      const retirementDone = !!profile && profile.retirementAge > 0;

      // Check overall progress
      const allDone = accountsDone && financesDone && goalsDone && retirementDone;

      if (allDone) {
        await ctx.prisma.user.update({
          where: { id: ctx.user.id },
          data: { onboardingComplete: true },
        });
      }

      return { completed: true, nextStep: null, allComplete: allDone };
    }),

  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.prisma.userProfile.findUnique({ where: { userId: ctx.user.id } });
    const goalsCount = await ctx.prisma.goal.count({ where: { userId: ctx.user.id } });
    const assetsCount = await ctx.prisma.asset.count({ where: { userId: ctx.user.id } });

    const steps = {
      accounts: !!profile && Number(profile.monthlyIncome) > 0,
      finances: assetsCount > 0,
      goals: goalsCount > 0,
      retirement: !!profile && profile.retirementAge > 0,
    };

    const allComplete = steps.accounts && steps.finances && steps.goals && steps.retirement;

    // Se tudo ok garante a atualização caso as chamadas de completeOnboarding percam alguma track
    if (allComplete) {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { onboardingComplete: true },
      });
    }

    return { steps, allComplete };
  }),

  getProjectionData: protectedProcedure.query(async ({ ctx }) => {
    const { getProjectionData } = await import("../services/financial-calculator");
    return getProjectionData(ctx.prisma, ctx.user.id);
  }),

  getDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. Current month transactions (strictly within current month boundaries)
    const currentMonthTx = await ctx.prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: startOfMonth, lte: endOfMonth } },
    });

    let income = 0, expenses = 0;
    for (const tx of currentMonthTx) {
      if (tx.type === "INCOME") income += Number(tx.amount);
      else expenses += Number(tx.amount);
    }

    // 2. Previous month transactions
    const prevMonthTx = await ctx.prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
    });

    let prevIncome = 0, prevExpenses = 0;
    for (const tx of prevMonthTx) {
      if (tx.type === "INCOME") prevIncome += Number(tx.amount);
      else prevExpenses += Number(tx.amount);
    }

    // 3. Top goals
    const goals = await ctx.prisma.goal.findMany({
      where: { userId, isActive: true },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 3,
    });

    const topGoals = goals.map((g: any) => {
      const target = Number(g.targetAmount);
      const current = Number(g.currentAmount);
      let monthsRemaining: number | null = null;
      if (g.deadline) {
        const diffTime = new Date(g.deadline).getTime() - now.getTime();
        monthsRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)));
      }
      return {
        id: g.id,
        name: g.name,
        type: g.type,
        percentComplete: Math.min(100, target > 0 ? (current / target) * 100 : 0),
        monthsRemaining,
      };
    });

    // 4. Patrimonio total
    const assets = await ctx.prisma.asset.findMany({
      where: { userId, isActive: true },
    });
    const patrimonioTotal = assets.reduce((acc: number, a: any) => acc + Number(a.currentValue), 0);

    // 5. Freedom progress
    const { getProjectionData } = await import("../services/financial-calculator");
    const projection = await getProjectionData(ctx.prisma, userId);

    // 6. Growth vs last month (simplified: balance diff)
    const prevBalance = prevIncome - prevExpenses;
    const currentBalance = income - expenses;
    const balanceChange = prevBalance !== 0 ? ((currentBalance - prevBalance) / Math.abs(prevBalance)) * 100 : 0;

    return {
      monthlySummary: {
        income: Math.round(income * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        balance: Math.round((income - expenses) * 100) / 100,
      },
      previousMonth: {
        income: Math.round(prevIncome * 100) / 100,
        expenses: Math.round(prevExpenses * 100) / 100,
        balance: Math.round(prevBalance * 100) / 100,
      },
      balanceChange: Math.round(balanceChange * 100) / 100,
      topGoals,
      patrimonioTotal: Math.round(patrimonioTotal * 100) / 100,
      freedomProgress: projection.freedomProgress,
      retirementNeeded: projection.retirementNeeded,
    };
  }),
  exportData: protectedProcedure.mutation(async ({ ctx }) => {
    const data = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        profile: true,
        transactions: true,
        categories: true,
        goals: true,
        assets: true,
        subscription: true,
        aiInsights: true,
      },
    });
    return data;
  }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    // 1. Delete Identity on Supabase
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { error } = await supabaseAdmin.auth.admin.deleteUser(ctx.user.id);
      if (error) {
        console.error("[deleteAccount] Falha no Supabase:", error);
        // We continue because the user might have been deleted manually in Supabase already
      }
    }

    // 2. Cascade Delete all database records in Prisma
    await ctx.prisma.user.delete({
      where: { id: ctx.user.id },
    });

    return { success: true };
  }),
});
