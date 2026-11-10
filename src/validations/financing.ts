import { z } from "zod";

export const FinancingCreateSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório").max(200),
  type: z.enum(["IMOVEL", "VEICULO", "OUTRO"]).default("IMOVEL"),
  totalValue: z.preprocess(v => Number.isNaN(v) ? 0 : v, z.number().min(0)),
  downPayment: z.preprocess(v => Number.isNaN(v) ? 0 : v, z.number().min(0).default(0)),
  totalInstallments: z.preprocess(v => Number.isNaN(v) ? 1 : v, z.number().int().min(1, "Mínimo 1 parcela")),
  monthlyPayment: z.preprocess(v => Number.isNaN(v) ? 0 : v, z.number().min(0)),
  paidInstallments: z.preprocess(v => Number.isNaN(v) ? 0 : v, z.number().int().min(0).default(0)),
  interestRate: z.preprocess(v => Number.isNaN(v) ? undefined : v, z.number().min(0)).optional(),
  startDate: z.date(),
  description: z.string().max(500).optional(),
});

export const FinancingPayInstallmentSchema = z.object({
  financingId: z.string().uuid(),
  amount: z.number().positive().optional(), // se não informar, usa monthlyPayment
  date: z.date().optional(),
  description: z.string().max(200).optional(),
});

export const FinancingUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(200),
  type: z.enum(["IMOVEL", "VEICULO", "OUTRO"]),
  totalValue: z.preprocess(v => Number.isNaN(v) ? 0 : v, z.number().min(0)),
  downPayment: z.preprocess(v => Number.isNaN(v) ? 0 : v, z.number().min(0)),
  totalInstallments: z.preprocess(v => Number.isNaN(v) ? 1 : v, z.number().int().min(1)),
  paidInstallments: z.preprocess(v => Number.isNaN(v) ? 0 : v, z.number().int().min(0)),
  monthlyPayment: z.preprocess(v => Number.isNaN(v) ? 0 : v, z.number().min(0)),
  interestRate: z.preprocess(v => Number.isNaN(v) ? undefined : v, z.number().min(0)).optional().nullable(),
  startDate: z.date(),
  description: z.string().max(500).optional().nullable(),
});
