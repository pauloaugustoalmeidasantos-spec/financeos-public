import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchMultipleQuotes } from "@/server/services/brapi";
import { fetchMultipleTesouroPrices, normalizeTesouroticker } from "@/server/services/tesouro";
import Decimal from "decimal.js";

export const dynamic = "force-dynamic";

// Tesouro Direto tickers follow a pattern: SELIC2026, IPCA2029, PRE2027, IPCAJ2032, etc.
function isTesouroticker(ticker: string): boolean {
  return /^(SELIC|PRE|PREJ|IPCA|IPCAJ|RENDA|EDUCA)\d{4}$/.test(ticker);
}

export async function GET(req: NextRequest) {
  // Optional: verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const assets = await prisma.asset.findMany({
      where: {
        isActive: true,
        autoUpdate: true,
        ticker: { not: null },
      },
    });

    if (assets.length === 0) {
      return NextResponse.json({ message: "No assets to update", updated: 0 });
    }

    const tickers = [...new Set(assets.map((a) => a.ticker!).filter(Boolean))];

    // Classify tickers into categories
    const tesourotickers = tickers.filter((t) => isTesouroticker(t));
    const rateTickers = tickers.filter((t) => t.startsWith("RATE:"));
    const brapiTickers = tickers.filter((t) => !isTesouroticker(t) && !t.startsWith("RATE:"));

    // Fetch from each source in parallel
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
        // ===== TESOURO DIRETO =====
        const tesPrice = tesouroPrices.get(ticker.toUpperCase());
        if (tesPrice) {
          // For Tesouro Direto, we track by value (not quantity of bonds typically)
          // If the user has stored "quantity" as number of bonds:
          const qty = asset.quantity ?? 1;
          newPrice = tesPrice.unitPrice;
          newValue = tesPrice.unitPrice * qty;
        } else {
          // If the bond is not found in current offering, keep growing by the stored rate
          // Try to extract a rate from the annual return stored, or use a default
          // Skip updating if we have no data
          console.warn(`[update-quotes] Tesouro ticker ${ticker} not found in API`);
        }
      } else if (ticker.startsWith("RATE:")) {
        // ===== RENDA FIXA (CDI/CDB/LCI/LCA based) =====
        const annualRateStr = ticker.replace("RATE:", "");
        const annualRate = parseFloat(annualRateStr) / 100;

        if (!isNaN(annualRate) && annualRate > 0) {
          // Use 252 working days for Brazilian standard
          const dailyRate = Math.pow(1 + annualRate, 1 / 252) - 1;
          const currentValue = Number(asset.currentValue);
          newValue = currentValue * (1 + dailyRate);
          newPrice = newValue / (asset.quantity || 1);
        }
      } else {
        // ===== AÇÕES / FIIs / ETFs (BRAPI) =====
        const quote = brapiQuotes.get(ticker.toUpperCase());
        if (quote) {
          const qty = asset.quantity ?? 1;
          newValue = quote.price * qty;
          newPrice = quote.price;
        }
      }

      if (newValue === null || newPrice === null) continue;

      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          currentValue: new Decimal(newValue),
          lastQuoteAt: new Date(),
        },
      });

      try {
        await prisma.assetPriceHistory.upsert({
          where: { assetId_date: { assetId: asset.id, date: today } },
          update: { price: new Decimal(newPrice) },
          create: {
            assetId: asset.id,
            price: new Decimal(newPrice),
            date: today,
          },
        });
      } catch {
        // Ignore duplicate
      }

      updated++;
    }

    return NextResponse.json({
      message: "Quotes updated",
      updated,
      total: assets.length,
      sources: {
        tesouro: tesourotickers.length,
        rateFixed: rateTickers.length,
        brapi: brapiTickers.length,
      },
    });
  } catch (error) {
    console.error("[update-quotes] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
