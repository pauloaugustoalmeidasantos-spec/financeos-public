import { z } from "zod";

export const AssetCreateSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
  type: z.enum(["FINANCIAL", "PHYSICAL", "BUSINESS"]),
  category: z.string().min(1, "Categoria obrigatória"),
  currentValue: z.preprocess(v => Number.isNaN(v) ? undefined : v, z.number().min(0, "Valor não pode ser negativo")),
  purchaseValue: z.preprocess(v => Number.isNaN(v) ? undefined : v, z.number().min(0)).optional(),
  purchaseDate: z.date().optional(),
  description: z.string().max(500).optional(),
  ticker: z.string().max(20).optional(),
  broker: z.string().max(100).optional(),
  quantity: z.preprocess(v => Number.isNaN(v) ? undefined : v, z.number().int().min(1)).optional(),
  autoUpdate: z.boolean().optional(),
  averagePrice: z.preprocess(v => Number.isNaN(v) ? undefined : v, z.number().min(0)).optional(),
  source: z.string().optional(),
});
