import { router } from "../trpc";
import { userRouter } from "./user";
import { transactionRouter } from "./transaction";
import { goalRouter } from "./goal";
import { assetRouter } from "./asset";
import { categoryRouter } from "./category";
import { subscriptionRouter } from "./subscription";
import { aiRouter } from "./ai";
import { budgetRouter } from "./budget";
import { financingRouter } from "./financing";
import { protectionRouter } from "./protection";
import { cashflowRouter } from "./cashflow";
import { contasRouter } from "./contas";
import { billsRouter } from "./bills";

export const appRouter = router({
  user: userRouter,
  transaction: transactionRouter,
  goal: goalRouter,
  asset: assetRouter,
  category: categoryRouter,
  subscription: subscriptionRouter,
  ai: aiRouter,
  budget: budgetRouter,
  financing: financingRouter,
  protection: protectionRouter,
  cashflow: cashflowRouter,
  contas: contasRouter,
  bills: billsRouter,
});

export type AppRouter = typeof appRouter;
