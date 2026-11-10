/**
 * Utilitário de feriados nacionais brasileiros (feriados bancários).
 * Calcula feriados móveis (Carnaval, Sexta-feira Santa, Corpus Christi)
 * com base no cálculo de Páscoa (algoritmo de Gauss).
 */

/** Retorna a data da Páscoa para um dado ano */
function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Retorna a lista de feriados bancários nacionais para um dado ano */
export function getBrazilianHolidays(year: number): Date[] {
  const easter = getEaster(year);
  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };

  return [
    // Feriados fixos
    new Date(year, 0, 1),   // Confraternização Universal (Ano Novo)
    new Date(year, 3, 21),  // Tiradentes
    new Date(year, 4, 1),   // Dia do Trabalho
    new Date(year, 8, 7),   // Independência do Brasil
    new Date(year, 9, 12),  // Nossa Senhora Aparecida
    new Date(year, 10, 2),  // Finados
    new Date(year, 10, 15), // Proclamação da República
    new Date(year, 11, 25), // Natal

    // Feriados móveis baseados na Páscoa
    addDays(easter, -48),  // Segunda de Carnaval
    addDays(easter, -47),  // Terça de Carnaval
    addDays(easter, -2),   // Sexta-feira Santa (Paixão de Cristo)
    easter,                // Páscoa
    addDays(easter, 60),   // Corpus Christi
  ].map(d => {
    // Normaliza para meia-noite local
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

/** Verifica se uma data é feriado bancário nacional */
export function isHoliday(date: Date, year?: number): boolean {
  const y = year ?? date.getFullYear();
  const holidays = getBrazilianHolidays(y);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return holidays.some(h => h.getTime() === d.getTime());
}

/** Verifica se uma data é dia útil (seg–sex, não feriado) */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay(); // 0=dom, 6=sab
  if (day === 0 || day === 6) return false;
  return !isHoliday(date);
}

/**
 * Retorna a data do N-ésimo dia útil de um dado mês/ano.
 * Ex: getNthBusinessDay(2025, 4, 5) → 5° dia útil de maio/2025
 */
export function getNthBusinessDay(year: number, month: number, n: number): Date {
  let count = 0;
  const date = new Date(year, month, 1);
  while (count < n) {
    if (isBusinessDay(date)) {
      count++;
      if (count === n) break;
    }
    date.setDate(date.getDate() + 1);
  }
  return new Date(date);
}

/**
 * Retorna a data de pagamento para um mês/ano com base na configuração:
 * - DAY_OF_MONTH: dia fixo (ex: dia 5). Se cair em fds/feriado, avança para o próximo dia útil.
 * - BUSINESS_DAY: N-ésimo dia útil do mês.
 */
export function getPaymentDate(
  year: number,
  month: number, // 0-indexed (Jan = 0)
  payDay: number,
  payDayType: "DAY_OF_MONTH" | "BUSINESS_DAY"
): Date {
  if (payDayType === "BUSINESS_DAY") {
    return getNthBusinessDay(year, month, payDay);
  }

  // DAY_OF_MONTH: ajusta se cair em fds ou feriado
  const maxDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(payDay, maxDay);
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);

  // Avança até encontrar um dia útil
  while (!isBusinessDay(date)) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}
