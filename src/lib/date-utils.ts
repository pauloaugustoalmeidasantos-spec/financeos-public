import { format, parseISO, startOfDay, addMinutes } from "date-fns";

/**
 * Normaliza uma data vinda do servidor ou input para o "Meio-dia Local" 
 * ou apenas garante que o dia calendárico seja preservado ao formatar.
 * 
 * Problema: New Date("2024-04-01") cria UTC 00:00, que em UTC-3 vira 21:00 do dia anterior.
 */
export function toLocalMidnight(date: Date | string | number): Date {
  if (!date) return new Date();
  
  // Se for string YYYY-MM-DD pura
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  const d = new Date(date);
  
  // Se for uma data vinda do servidor (ex: Prisma @db.Date vira 00:00:00 em UTC)
  // Se as horas, minutos e segundos são 0 UTC, é quase certo que é uma data calendárica que sofreu drift.
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0);
  }

  // Fallback seguro para qualquer outra data: mantém o dia local às 12h
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}

/**
 * Formata uma data ignorando fuso horário (UTC safe para datas calendáricas)
 */
export function formatCalendarDate(date: Date | string, formatStr: string, locale?: any): string {
  const d = toLocalMidnight(date);
  return format(d, formatStr, { locale });
}
