import { z } from "zod";

export const BudgetUpsertSchema = z.object({
  categoryId: z.string().uuid("Categoria inválida"),
  amount: z.number().positive("O valor deve ser maior que zero"),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
});

export const BudgetListSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
});

export type BudgetUpsertInput = z.infer<typeof BudgetUpsertSchema>;
export type BudgetListInput = z.infer<typeof BudgetListSchema>;
