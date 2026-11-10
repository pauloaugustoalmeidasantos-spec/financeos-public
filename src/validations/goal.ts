import { z } from 'zod';

export const GoalCreateSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
  type: z.enum(['TRAVEL', 'CAR', 'HOUSE', 'RETIREMENT', 'EDUCATION', 'EMERGENCY', 'BUSINESS', 'OTHER']),
  description: z.string().max(500).optional(),
  targetAmount: z.number().positive("O Alvo precisa ser maior que zero"),
  currentAmount: z.number().min(0).default(0),
  deadline: z.date().optional(),
  priority: z.number().int().min(1).max(3).default(3),
  isActive: z.boolean().default(true),
  affectsPlanning: z.boolean().default(true),
});
