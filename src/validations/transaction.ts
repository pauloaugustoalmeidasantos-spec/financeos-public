import { z } from "zod";

export const TransactionCreateSchema = z.object({
  amount: z.number().positive("O valor deve ser maior que zero"),
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().uuid("Categoria inválida").optional().nullable(),
  description: z.string().max(255).optional(),
  transactionDate: z.date(),
  isRecurring: z.boolean().default(false),
  recurrenceType: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).default("NONE"),
  recurrenceEndDate: z.date().optional().nullable(),
});

export const TransactionUpdateSchema = TransactionCreateSchema.partial().extend({
  id: z.string().uuid("ID de transação inválido"),
  isRecurring: z.boolean().optional(),
  recurrenceType: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  recurrenceEndDate: z.date().optional().nullable(),
});

export const TransactionFilterSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "ALL"]).default("ALL"),
  categoryId: z.string().uuid().optional().nullable(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type TransactionCreateInput = z.infer<typeof TransactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof TransactionUpdateSchema>;
export type TransactionFilterInput = z.infer<typeof TransactionFilterSchema>;

export const BulkTransactionItemSchema = z.object({
  amount: z.number().positive("O valor deve ser maior que zero"),
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().uuid("Categoria inválida").optional().nullable(),
  description: z.string().max(255).optional(),
  transactionDate: z.date(),
});

export const BulkTransactionCreateSchema = z.object({
  transactions: z.array(BulkTransactionItemSchema).min(1, "Adicione pelo menos 1 lançamento").max(100, "Máximo de 100 lançamentos por vez"),
});

export type BulkTransactionCreateInput = z.infer<typeof BulkTransactionCreateSchema>;
