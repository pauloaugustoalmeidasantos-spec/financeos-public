import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatCurrency(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}

export function formatDate(date: Date | string, formatStyle: "short" | "long" | "month" = "short"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  switch (formatStyle) {
    case "long":
      return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    case "month":
      return format(d, "MMMM yyyy", { locale: ptBR });
    case "short":
    default:
      return format(d, "dd/MM/yyyy");
  }
}

export function getMonthRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

export function getMonthsArray(months = 12): { label: string; value: string; date: Date }[] {
  const arr = [];
  const today = new Date();
  
  for (let i = 0; i < months; i++) {
    const d = subMonths(today, i);
    const mFormat = format(d, "yyyy-MM");
    arr.push({
      label: format(d, "MMM/yy", { locale: ptBR }).toUpperCase(),
      value: mFormat,
      date: startOfMonth(d),
    });
  }
  return arr.reverse(); // chronological from left to right
}
