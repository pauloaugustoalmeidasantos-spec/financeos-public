import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { generateMissingOccurrences } from "@/server/services/recurrence.service";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminSecret = process.env.CRON_SECRET;

    if (!adminSecret) {
      return NextResponse.json({ error: "Configuração do CRON incompleta no Vercel" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Procura transações ROOT / PARENT
    const parents = await db.transaction.findMany({
      where: {
        parentId: null,
        isRecurring: true,
        NOT: { recurrenceType: "NONE" }
      }
    });

    let totalProcessed = 0;
    let totalGenerated = 0;
    const errors: string[] = [];

    for (const p of parents) {
      try {
        const genCount = await generateMissingOccurrences(p, 12);
        totalProcessed++;
        totalGenerated += genCount;
      } catch (err: any) {
        errors.push(`Falha no parente ${p.id}: ${err.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: totalProcessed, 
      generated: totalGenerated,
      errors
    });

  } catch (error) {
    return NextResponse.json({ error: "Falha de execução do Vercel Job" }, { status: 500 });
  }
}
