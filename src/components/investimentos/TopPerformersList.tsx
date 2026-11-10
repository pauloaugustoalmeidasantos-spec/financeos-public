"use client";

import { formatCurrency } from "@/lib/formatters";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  ticker?: string | null;
  currentValue: number;
  averagePrice?: number | null;
  purchaseValue?: number | null;
  quantity?: number | null;
}

interface Props {
  assets: Asset[];
}

export function TopPerformersList({ assets }: Props) {
  const withPerformance = assets.map(asset => {
    const purchaseCost = asset.averagePrice ? asset.averagePrice * (asset.quantity ?? 1) : (asset.purchaseValue ?? 0);
    const gain = asset.currentValue - purchaseCost;
    const gainPercent = purchaseCost > 0 ? (gain / purchaseCost) * 100 : 0;
    return { ...asset, gain, gainPercent };
  });

  // Sort by highest gain percentage
  const sorted = [...withPerformance].sort((a, b) => b.gainPercent - a.gainPercent);
  
  // Get top 3 winners and top 2 losers (if they are actually negative)
  const topWinners = sorted.filter(a => a.gain > 0).slice(0, 3);
  const topLosers = sorted.filter(a => a.gain < 0).slice(-2).reverse();

  if (topWinners.length === 0 && topLosers.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full">
      <h3 className="font-bold text-foreground mb-4">Destaques da Carteira</h3>
      
      <div className="space-y-4">
        {topWinners.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Maiores Altas
            </p>
            <div className="space-y-2">
              {topWinners.map(asset => (
                <div key={asset.id} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{asset.ticker || asset.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-600">+{asset.gainPercent.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {topWinners.length > 0 && topLosers.length > 0 && <div className="border-t border-border my-2" />}

        {topLosers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> Maiores Baixas
            </p>
            <div className="space-y-2">
              {topLosers.map(asset => (
                <div key={asset.id} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{asset.ticker || asset.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-500">{asset.gainPercent.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
