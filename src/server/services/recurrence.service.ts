import { prisma as db } from "@/lib/prisma";
import { addDays, addWeeks, addMonths, addYears, isAfter, max } from "date-fns";

export async function generateMissingOccurrences(parentTransaction: any, monthsAhead: number = 12): Promise<number> {
  // 1. Achar as filhas existentes
  const existingChildren = await db.transaction.findMany({
    where: { parentId: parentTransaction.id },
    orderBy: { transactionDate: 'desc' }
  });

  const referenceDate = new Date(); // 'agora' / data do CRON job
  const cutoffLimit = addMonths(referenceDate, monthsAhead);

  let nextDate = parentTransaction.transactionDate;
  
  if (existingChildren.length > 0) {
    // Pegar o max entre a data do parent e a última filha gerada
    const childDates = existingChildren.map((c: any) => new Date(c.transactionDate));
    nextDate = max([...childDates, new Date(parentTransaction.transactionDate)]);
  } else {
    nextDate = new Date(parentTransaction.transactionDate);
  }

  // Verifica se a última gerada já está >= o horizonte planejado 
  // (ex: geramos para 12 meses, se a última gerada é no ano que vem, não faz nada)
  if (!isAfter(cutoffLimit, nextDate)) {
    return 0;
  }

  let iterations = 0;
  let maxLoop = 365; // Travação de emergência anti-crash infinito
  const newTransactionsData = [];
  const recType = parentTransaction.recurrenceType;

  while (isAfter(cutoffLimit, nextDate) && iterations < maxLoop) {
    if (recType === "DAILY") nextDate = addDays(nextDate, 1);
    else if (recType === "WEEKLY") nextDate = addWeeks(nextDate, 1);
    else if (recType === "MONTHLY") nextDate = addMonths(nextDate, 1);
    else if (recType === "YEARLY") nextDate = addYears(nextDate, 1);

    // Se bater na restrição end-date providenciada hardcoded pelo User no ato do cadastro original
    if (parentTransaction.recurrenceEndDate && isAfter(nextDate, new Date(parentTransaction.recurrenceEndDate))) {
      break;
    }

    newTransactionsData.push({
      userId: parentTransaction.userId,
      amount: parentTransaction.amount,
      type: parentTransaction.type,
      categoryId: parentTransaction.categoryId || null,
      description: parentTransaction.description || null,
      transactionDate: nextDate,
      isRecurring: false, // filhos explícitos não bifurcam
      recurrenceType: "NONE" as any,
      parentId: parentTransaction.id,
    });

    iterations++;
  }

  if (newTransactionsData.length > 0) {
    await db.transaction.createMany({
      data: newTransactionsData,
    });
  }

  return newTransactionsData.length;
}
