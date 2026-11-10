import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { createCheckoutSession, createPortalSession } from "../services/stripe";
import { TRPCError } from "@trpc/server";

export const subscriptionRouter = router({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!subscription) {
      return {
        isActive: false,
        isTrialing: false,
        trialDaysRemaining: 0,
        canAccessPremium: false,
        plan: "FREE",
        monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID,
        yearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID,
      };
    }

    const now = new Date();
    
    const isTrialing =
      subscription.status === "TRIALING" &&
      subscription.trialEndsAt !== null &&
      subscription.trialEndsAt > now;

    let trialDaysRemaining = 0;
    if (isTrialing && subscription.trialEndsAt) {
      const msPerDay = 1000 * 60 * 60 * 24;
      trialDaysRemaining = Math.ceil((subscription.trialEndsAt.getTime() - now.getTime()) / msPerDay);
    }

    const isActive = subscription.status === "ACTIVE" || isTrialing;
    
    return {
      ...subscription,
      isTrialing,
      trialDaysRemaining,
      isActive,
      canAccessPremium: isActive,
      monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID,
      yearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID,
    };
  }),

  createCheckout: protectedProcedure
    .input(z.object({ priceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const url = await createCheckoutSession({
          userId: ctx.user.id,
          email: ctx.user.email ?? "",
          priceId: input.priceId,
        });
        
        return { url };
      } catch (error: any) {
        console.error("Failed to create checkout session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not create checkout session",
        });
      }
    }),

  createPortal: protectedProcedure.mutation(async ({ ctx }) => {
    const subscription = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!subscription?.stripeCustomerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No Stripe customer found. Please subscribe first.",
      });
    }

    try {
      const url = await createPortalSession({
        stripeCustomerId: subscription.stripeCustomerId,
      });
      return { url };
    } catch (error: any) {
      console.error("Failed to create portal session:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not create portal session",
      });
    }
  }),
});
