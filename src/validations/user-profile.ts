import { z } from "zod";

export const UserProfileSchema = z.object({
  name: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  phone: z.string().optional(),
  birthDate: z.date().optional(),
  monthlyIncome: z.number().min(0).default(0),
  additionalIncomes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      amount: z.number(),
    })
  ).optional(),
  incomeType: z.enum(["SALARY", "FREELANCE", "BUSINESS", "INVESTMENT", "OTHER"]).default("SALARY"),
  incomeStability: z.enum(["STABLE", "VARIABLE", "MIXED"]).default("STABLE"),
  financialGoal: z.enum([
    "GROW_WEALTH",
    "GET_OUT_OF_DEBT",
    "FINANCIAL_INDEPENDENCE",
    "RETIREMENT",
    "OTHER",
  ]).default("GROW_WEALTH"),
  retirementAge: z.number().int().min(40).max(90).default(65),
  retirementGoal: z.number().min(0).default(0),
  desiredMonthlyIncome: z.number().min(0).default(0),
  monthlyInvestment: z.number().min(0).default(0),
  interestRate: z.number().min(0).max(50).default(8.0),
  inflationRate: z.number().min(0).max(30).default(4.5),
  currency: z.string().default("BRL"),
  notificationsEnabled: z.boolean().default(true),
  aiAlertsEnabled: z.boolean().default(true),
});

export type UserProfileInput = z.infer<typeof UserProfileSchema>;
