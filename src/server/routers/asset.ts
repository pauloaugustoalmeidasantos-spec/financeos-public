import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { AssetCreateSchema } from "@/validations/asset";
import { fetchMultipleQuotes, fetchQuote } from "@/server/services/brapi";
import { fetchTesouroPrices, fetchMultipleTesouroPrices } from "@/server/services/tesouro";
import Decimal from "decimal.js";

function isTesouroticker(ticker: string): boolean {
  return /^(SELIC|PRE|PREJ|IPCA|IPCAJ|RENDA|EDUCA)\d{4}$/.test(ticker);
}

export const assetRouter = router({

  searchTickers: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(10) }))
    .query(async ({ input }) => {
      try {
        const token = process.env.BRAPI_TOKEN;
        const url = token
          ? `https://brapi.dev/api/available?search=${encodeURIComponent(input.query)}&token=${token}`
          : `https://brapi.dev/api/available?search=${encodeURIComponent(input.query)}`;

        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return { stocks: [] };

        const json = await res.json();
        // brapi returns { stocks: string[] }
        const stocks: string[] = json.stocks ?? [];
        return { stocks: stocks.slice(0, 20) };
      } catch {
        return { stocks: [] };
      }
    }),

  getQuote: protectedProcedure
    .input(z.object({ ticker: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        const quote = await fetchQuote(input.ticker);
        return quote || null;
      } catch {
        return null;
      }
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      const assets = await ctx.prisma.asset.findMany({
        where: { userId: ctx.user.id, isActive: true },
        orderBy: { currentValue: "desc" },
      });

      const financial = assets.filter(a => a.type === "FINANCIAL");
      const physical = assets.filter(a => a.type === "PHYSICAL");
      const business = assets.filter(a => a.type === "BUSINESS");

      const sum = (arr: typeof assets) => arr.reduce((acc, a) => acc + Number(a.currentValue), 0);

      const format = (a: typeof assets[0]) => ({
        ...a,
        currentValue: Number(a.currentValue),
        purchaseValue: a.purchaseValue ? Number(a.purchaseValue) : null,
        averagePrice: a.averagePrice ? Number(a.averagePrice) : null,
        quantity: a.quantity ?? 1,
        autoUpdate: a.autoUpdate,
        source: a.source || "MANUAL",
      });

      return {
        financial: financial.map(format),
        physical: physical.map(format),
        business: business.map(format),
        totalFinancial: sum(financial),
        totalPhysical: sum(physical),
        totalBusiness: sum(business),
        grandTotal: sum(assets),
      };
    }),

  create: protectedProcedure
    .input(AssetCreateSchema)
    .mutation(async ({ ctx, input }) => {
      let finalCurrentValue = input.currentValue;

      // Ensure the initial current value is totally accurate from the server side if it's auto updating
      if (input.autoUpdate && input.ticker) {
        try {
          const quote = await fetchQuote(input.ticker);
          if (quote) {
            finalCurrentValue = quote.price * (input.quantity || 1);
          }
        } catch {
          // Fallback to client provided value
        }
      }

      const created = await ctx.prisma.asset.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          type: input.type,
          category: input.category,
          currentValue: new Decimal(finalCurrentValue),
          purchaseValue: input.purchaseValue !== undefined ? new Decimal(input.purchaseValue) : null,
          purchaseDate: input.purchaseDate,
          description: input.description,
          ticker: input.ticker,
          broker: input.broker,
          quantity: input.quantity || 1,
          autoUpdate: input.autoUpdate || false,
          averagePrice: input.averagePrice !== undefined ? new Decimal(input.averagePrice) : null,
          source: input.source || "MANUAL",
          isActive: true,
        },
      });

      // Save initial price point if it has a ticker
      if (created.ticker && created.autoUpdate) {
        try {
          await ctx.prisma.assetPriceHistory.create({
            data: {
              assetId: created.id,
              price: created.currentValue,
              date: new Date(),
            },
          });
        } catch {
          // Ignore duplicate date entries
        }
      }

      return { ...created, currentValue: Number(created.currentValue), purchaseValue: created.purchaseValue ? Number(created.purchaseValue) : null };
    }),

  update: protectedProcedure
    .input(AssetCreateSchema.partial().and(z.object({ id: z.string() })))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await ctx.prisma.asset.findUnique({ where: { id } });
      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ativo não encontrado" });
      }

      const updated = await ctx.prisma.asset.update({
        where: { id },
        data: {
          ...data,
          ...(data.currentValue !== undefined && { currentValue: new Decimal(data.currentValue) }),
          ...(data.purchaseValue !== undefined && { purchaseValue: new Decimal(data.purchaseValue) }),
          ...(data.averagePrice !== undefined && { averagePrice: new Decimal(data.averagePrice) }),
        },
      });
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.asset.findUnique({ where: { id: input.id } });
      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      // Soft delete
      await ctx.prisma.asset.update({
        where: { id: input.id },
        data: { isActive: false },
      });
      return { success: true };
    }),

  getTesouroPrices: protectedProcedure
    .query(async () => {
      try {
        const prices = await fetchTesouroPrices();
        return prices;
      } catch {
        return [];
      }
    }),

  refreshQuotes: protectedProcedure
    .mutation(async ({ ctx }) => {
      const assets = await ctx.prisma.asset.findMany({
        where: {
          userId: ctx.user.id,
          isActive: true,
          autoUpdate: true,
          ticker: { not: null },
        },
      });

      if (assets.length === 0) return { updated: 0 };

      const tickers = assets.map((a) => a.ticker!).filter(Boolean);
      const tesourotickers = tickers.filter((t) => isTesouroticker(t));
      const brapiTickers = tickers.filter((t) => !isTesouroticker(t) && !t.startsWith("RATE:"));

      const [tesouroPrices, brapiQuotes] = await Promise.all([
        tesourotickers.length > 0 ? fetchMultipleTesouroPrices(tesourotickers) : Promise.resolve(new Map()),
        brapiTickers.length > 0 ? fetchMultipleQuotes(brapiTickers) : Promise.resolve(new Map()),
      ]);

      let updated = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const asset of assets) {
        const ticker = asset.ticker!;
        let newValue: number | null = null;
        let newPrice: number | null = null;

        if (isTesouroticker(ticker)) {
          const tesPrice = tesouroPrices.get(ticker.toUpperCase());
          if (tesPrice) {
            const qty = asset.quantity ?? 1;
            newPrice = tesPrice.unitPrice;
            newValue = tesPrice.unitPrice * qty;
          }
        } else if (ticker.startsWith("RATE:")) {
          const annualRateStr = ticker.replace("RATE:", "");
          const annualRate = parseFloat(annualRateStr) / 100;
          if (!isNaN(annualRate) && annualRate > 0) {
            const dailyRate = Math.pow(1 + annualRate, 1 / 252) - 1;
            const currentValue = Number(asset.currentValue);
            newValue = currentValue * (1 + dailyRate);
            newPrice = newValue / (asset.quantity || 1);
          }
        } else {
          const quote = brapiQuotes.get(ticker.toUpperCase());
          if (quote) {
            const qty = asset.quantity ?? 1;
            newValue = quote.price * qty;
            newPrice = quote.price;
          }
        }

        if (newValue === null || newPrice === null) continue;

        await ctx.prisma.asset.update({
          where: { id: asset.id },
          data: {
            currentValue: new Decimal(newValue),
            lastQuoteAt: new Date(),
          },
        });

        try {
          await ctx.prisma.assetPriceHistory.upsert({
            where: { assetId_date: { assetId: asset.id, date: today } },
            update: { price: new Decimal(newPrice) },
            create: {
              assetId: asset.id,
              price: new Decimal(newPrice),
              date: today,
            },
          });
        } catch {
          // Ignore errors
        }

        updated++;
      }

      return { updated };
    }),

  getPriceHistory: protectedProcedure
    .input(z.object({
      assetId: z.string().uuid(),
      days: z.number().default(90),
    }))
    .query(async ({ ctx, input }) => {
      const asset = await ctx.prisma.asset.findUnique({ where: { id: input.assetId } });
      if (!asset || asset.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - input.days);

      const history = await ctx.prisma.assetPriceHistory.findMany({
        where: {
          assetId: input.assetId,
          date: { gte: sinceDate },
        },
        orderBy: { date: "asc" },
      });

      return {
        asset: {
          id: asset.id,
          name: asset.name,
          ticker: asset.ticker,
          averagePrice: asset.averagePrice ? Number(asset.averagePrice) : null,
          purchaseValue: asset.purchaseValue ? Number(asset.purchaseValue) : null,
          currentValue: Number(asset.currentValue),
          quantity: asset.quantity ?? 1,
        },
        history: history.map(h => ({
          date: h.date,
          price: Number(h.price),
        })),
      };
    }),

  getSummary: protectedProcedure
    .query(async ({ ctx }) => {
      const assets = await ctx.prisma.asset.findMany({
        where: { userId: ctx.user.id, isActive: true },
      });

      const total = assets.reduce((acc, a) => acc + Number(a.currentValue), 0);

      const byType: Record<string, number> = { FINANCIAL: 0, PHYSICAL: 0, BUSINESS: 0 };
      const catMap: Record<string, number> = {};

      for (const a of assets) {
        byType[a.type] = (byType[a.type] || 0) + Number(a.currentValue);
        const cat = a.category || "Outros";
        catMap[cat] = (catMap[cat] || 0) + Number(a.currentValue);
      }

      const byCategory = Object.entries(catMap).map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0,
      })).sort((a, b) => b.value - a.value);

      // Valorização dos ativos com purchaseValue
      const withAppreciation = assets
        .filter(a => a.purchaseValue && Number(a.purchaseValue) > 0)
        .map(a => ({
          name: a.name,
          currentValue: Number(a.currentValue),
          purchaseValue: Number(a.purchaseValue),
          appreciation: ((Number(a.currentValue) - Number(a.purchaseValue)) / Number(a.purchaseValue)) * 100,
        }));

      return {
        total,
        byType,
        byCategory,
        withAppreciation,
      };
    }),
});
