"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface Asset {
  id: string;
  name: string;
  type: string;
  category: string | null;
  currentValue: number;
  purchaseValue: number | null;
  ticker: string | null;
  broker: string | null;
}

interface Props {
  financial: Asset[];
  physical: Asset[];
  business: Asset[];
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
}

function AssetRow({ asset, onEdit, onDelete }: { asset: Asset; onEdit: () => void; onDelete: () => void }) {
  const appreciation = asset.purchaseValue && asset.purchaseValue > 0
    ? ((asset.currentValue - asset.purchaseValue) / asset.purchaseValue) * 100
    : null;

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border last:border-b-0 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 group transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground truncate">{asset.name}</span>
            {asset.ticker && <span className="text-[10px] text-foreground-muted font-mono">{asset.ticker}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {asset.category && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{asset.category}</Badge>
            )}
            {asset.broker && (
              <span className="text-[10px] text-foreground-muted">{asset.broker}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <span className="font-bold text-sm text-foreground">{formatCurrency(asset.currentValue)}</span>
          {appreciation !== null && (
            <div className={`flex items-center justify-end gap-1 text-[10px] font-semibold ${appreciation >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {appreciation >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {appreciation >= 0 ? '+' : ''}{appreciation.toFixed(1)}%
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Edit2 className="w-3.5 h-3.5 text-blue-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AssetList({ financial, physical, business, onEdit, onDelete }: Props) {
  const sections = [
    { key: "financial", label: "Ativos Financeiros", emoji: "📈", items: financial },
    { key: "physical", label: "Bens Físicos", emoji: "🏠", items: physical },
    { key: "business", label: "Negócios", emoji: "💼", items: business },
  ];

  return (
    // @ts-ignore - Shadcn Accordion type prop conflict with Radix
    <Accordion type="multiple" defaultValue={["financial", "physical", "business"]} className="space-y-3">
      {sections.map(section => (
        <AccordionItem key={section.key} value={section.key} className="border border-border rounded-xl overflow-hidden shadow-sm">
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-amber-50/20 dark:hover:bg-amber-900/5">
            <div className="flex items-center gap-3">
              <span className="text-lg">{section.emoji}</span>
              <span className="font-bold text-foreground">{section.label}</span>
              <Badge variant="secondary" className="text-xs">{section.items.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            {section.items.length === 0 ? (
              <div className="py-6 text-center text-sm text-foreground-muted">
                Nenhum ativo cadastrado nesta categoria
              </div>
            ) : (
              section.items.map(asset => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  onEdit={() => onEdit(asset)}
                  onDelete={() => onDelete(asset.id)}
                />
              ))
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
