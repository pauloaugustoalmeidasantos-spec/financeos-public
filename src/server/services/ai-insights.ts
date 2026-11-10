import OpenAI from "openai";
import { z } from "zod";
import { PrismaClient } from "@/generated/prisma/client";
import { redis } from "@/lib/redis";
import { subMonths, format } from "date-fns";

// ── Schemas ───────────────────────────────────────────────────────────

const InsightModuleEnum = z.enum([
  "DASHBOARD",
  "FINANCES",
  "GOALS",
  "FUTURE",
  "PATRIMONY",
]);

const InsightTypeEnum = z.enum(["ALERT", "RECOMMENDATION", "INFO", "WARNING"]);

export const InsightResponseSchema = z.object({
  insights: z
    .array(
      z.object({
        module: InsightModuleEnum,
        type: InsightTypeEnum,
        title: z.string().max(100),
        content: z.string().max(500),
      })
    )
    .max(7),
});

export type InsightModule = z.infer<typeof InsightModuleEnum>;

// ── OpenAI Client ─────────────────────────────────────────────────────

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ── System Prompt ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um consultor financeiro pessoal especializado em finanças pessoais brasileiras.
Analise os dados financeiros do usuário e retorne insights acionáveis em JSON.

Instruções:
- Linguagem: sempre em português brasileiro, informal mas profissional.
- Tom: conselheiro amigável e encorajador, nunca alarmista.
- Valores monetários: sempre em R$ com formatação brasileira (ex: R$ 1.500,00).
- Retorne no MÁXIMO 7 insights por chamada, priorizando os mais importantes.
- Tipos de insight:
  * ALERT — gastos excessivos, padrões preocupantes
  * WARNING — metas em risco, prazos apertados
  * RECOMMENDATION — oportunidades de economia, investimento, otimização
  * INFO — conquistas, marcos atingidos, tendências positivas
- Cada insight deve ter um módulo (DASHBOARD, FINANCES, GOALS, FUTURE, PATRIMONY) que indica onde exibi-lo.
- O título deve ser curto e impactante (max 100 caracteres).
- O conteúdo deve ser específico com números e porcentagens reais (max 500 caracteres).

Formato de resposta JSON obrigatório:
{
  "insights": [
    {
      "module": "FINANCES",
      "type": "ALERT",
      "title": "Gastos com alimentação acima da média",
      "content": "Seus gastos com alimentação representam 35% da sua renda este mês (R$ 2.100,00), um aumento de 15% em relação ao mês passado. Considere planejar refeições semanais para reduzir esse custo."
    }
  ]
}`;

// ── Build Financial Context ───────────────────────────────────────────

export async function buildFinancialContext(
  prisma: PrismaClient,
  userId: string
): Promise<string> {
  // 1. Profile
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  const monthlyIncome = profile?.monthlyIncome
    ? Number(profile.monthlyIncome)
    : 0;
  const financialGoal = profile?.financialGoal ?? "GROW_WEALTH";
  const interestRate = profile?.interestRate
    ? Number(profile.interestRate)
    : 8.0;

  let currentAge: number | null = null;
  if (profile?.birthDate) {
    const birth = new Date(profile.birthDate);
    const today = new Date();
    currentAge = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      currentAge--;
    }
  }

  // 2. Transactions — last 3 months
  const now = new Date();
  const threeMonthsAgo = subMonths(now, 3);
  const oneMonthAgo = subMonths(now, 1);
  const twoMonthsAgo = subMonths(now, 2);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: { gte: threeMonthsAgo },
    },
    include: { category: true },
  });

  // Split into current and previous month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  let totalIncome3m = 0;
  let totalExpense3m = 0;
  let currentMonthExpense = 0;
  let prevMonthExpense = 0;
  let currentMonthIncome = 0;
  let prevMonthIncome = 0;

  const categoryExpenses = new Map<
    string,
    { name: string; total: number }
  >();

  for (const tx of transactions) {
    const amount = Number(tx.amount);
    const txDate = new Date(tx.transactionDate);

    if (tx.type === "INCOME") {
      totalIncome3m += amount;
      if (txDate >= currentMonthStart) currentMonthIncome += amount;
      else if (txDate >= prevMonthStart) prevMonthIncome += amount;
    } else {
      totalExpense3m += amount;
      if (txDate >= currentMonthStart) currentMonthExpense += amount;
      else if (txDate >= prevMonthStart) prevMonthExpense += amount;

      const catName = tx.category?.name || "Sem Categoria";
      const existing = categoryExpenses.get(catName) || {
        name: catName,
        total: 0,
      };
      existing.total += amount;
      categoryExpenses.set(catName, existing);
    }
  }

  const avgMonthlyIncome = totalIncome3m / 3;
  const avgMonthlyExpenses = totalExpense3m / 3;
  const avgBalance = avgMonthlyIncome - avgMonthlyExpenses;

  // Top 5 expense categories
  const topCategories = Array.from(categoryExpenses.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Month-over-month comparison
  const expenseChange =
    prevMonthExpense > 0
      ? ((currentMonthExpense - prevMonthExpense) / prevMonthExpense) * 100
      : 0;
  const incomeChange =
    prevMonthIncome > 0
      ? ((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100
      : 0;

  // 3. Goals
  const goals = await prisma.goal.findMany({
    where: { userId, isActive: true },
  });

  // 4. Assets / Patrimony
  const assets = await prisma.asset.findMany({
    where: { userId, isActive: true },
  });
  const totalPatrimony = assets.reduce(
    (acc, a) => acc + Number(a.currentValue),
    0
  );

  const assetsByType = new Map<string, number>();
  for (const asset of assets) {
    const existing = assetsByType.get(asset.type) || 0;
    assetsByType.set(asset.type, existing + Number(asset.currentValue));
  }

  // ── Format Context ──────────────────────────────────────────────────

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const pct = (v: number) => `${v.toFixed(1)}%`;

  let ctx = `## Perfil do Usuário\n`;
  ctx += `- Renda mensal declarada: ${fmt(monthlyIncome)}\n`;
  ctx += `- Objetivo financeiro: ${financialGoal}\n`;
  if (currentAge) ctx += `- Idade: ${currentAge} anos\n`;
  ctx += `- Taxa de juros referência: ${interestRate}% a.a.\n`;

  ctx += `\n## Resumo dos Últimos 3 Meses\n`;
  ctx += `- Receita média mensal: ${fmt(avgMonthlyIncome)}\n`;
  ctx += `- Despesa média mensal: ${fmt(avgMonthlyExpenses)}\n`;
  ctx += `- Saldo médio mensal: ${fmt(avgBalance)}\n`;

  ctx += `\n## Top 5 Categorias de Gasto\n`;
  for (const cat of topCategories) {
    const pctIncome =
      monthlyIncome > 0 ? (cat.total / 3 / monthlyIncome) * 100 : 0;
    ctx += `- ${cat.name}: ${fmt(cat.total / 3)}/mês (${pct(pctIncome)} da renda)\n`;
  }

  ctx += `\n## Comparação Mês Atual vs Mês Anterior\n`;
  ctx += `- Receitas: ${fmt(currentMonthIncome)} (${incomeChange >= 0 ? "+" : ""}${pct(incomeChange)})\n`;
  ctx += `- Despesas: ${fmt(currentMonthExpense)} (${expenseChange >= 0 ? "+" : ""}${pct(expenseChange)})\n`;

  ctx += `\n## Metas Ativas (${goals.length})\n`;
  for (const goal of goals) {
    const target = Number(goal.targetAmount);
    const current = Number(goal.currentAmount);
    const progress = target > 0 ? (current / target) * 100 : 0;
    const deadline = goal.deadline
      ? format(new Date(goal.deadline), "dd/MM/yyyy")
      : "sem prazo";
    const viability = goal.isViable === null ? "N/A" : goal.isViable ? "viável" : "inviável";
    ctx += `- ${goal.name}: ${pct(progress)} concluído, prazo ${deadline}, ${viability}\n`;
  }

  ctx += `\n## Patrimônio Total: ${fmt(totalPatrimony)}\n`;
  for (const [type, value] of assetsByType.entries()) {
    ctx += `- ${type}: ${fmt(value)}\n`;
  }

  return ctx;
}

// ── Generate Insights ─────────────────────────────────────────────────

export async function generateInsightsForUser(
  prisma: PrismaClient,
  userId: string,
  modules?: InsightModule[]
): Promise<any[]> {
  const today = format(new Date(), "yyyy-MM-dd");
  const cacheKey = `insights:${userId}:${today}`;

  // 1. Check cache
  try {
    const cached = await redis.get<string>(cacheKey);
    if (cached) {
      const parsed =
        typeof cached === "string" ? JSON.parse(cached) : cached;
      return parsed;
    }
  } catch {
    // Redis failure is non-fatal — proceed to OpenAI
    console.warn("[AI Insights] Redis cache read failed, proceeding without cache");
  }

  // 2. Build context
  const financialContext = await buildFinancialContext(prisma, userId);

  const userPrompt = `Aqui estão os dados financeiros do usuário:\n\n${financialContext}\n\nCom base nesses dados, gere insights financeiros personalizados seguindo o formato JSON especificado. Foque nos pontos mais relevantes e acionáveis.${
    modules && modules.length > 0
      ? `\n\nFoque especialmente nos módulos: ${modules.join(", ")}`
      : ""
  }`;

  // 3. Call OpenAI
  let insightsData: z.infer<typeof InsightResponseSchema>;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1500,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("OpenAI returned empty response");
    }

    // Log token usage in development
    if (process.env.NODE_ENV === "development" && completion.usage) {
      console.log(
        `[AI Insights] Tokens used — prompt: ${completion.usage.prompt_tokens}, completion: ${completion.usage.completion_tokens}, total: ${completion.usage.total_tokens}`
      );
    }

    insightsData = InsightResponseSchema.parse(JSON.parse(raw));
  } catch (error) {
    console.error("[AI Insights] OpenAI call failed:", error);

    // Try to return cached insights if available (from previous days)
    try {
      const fallbackKeys = await redis.keys(`insights:${userId}:*`);
      if (fallbackKeys.length > 0) {
        const fallback = await redis.get<string>(fallbackKeys[0]);
        if (fallback) {
          return typeof fallback === "string" ? JSON.parse(fallback) : fallback;
        }
      }
    } catch {
      // Ignore Redis fallback errors
    }

    throw error;
  }

  // 4. Persist to database
  const createdInsights = await prisma.aiInsight.createManyAndReturn({
    data: insightsData.insights.map((insight) => ({
      userId,
      module: insight.module,
      type: insight.type,
      title: insight.title,
      content: insight.content,
    })),
  });

  // 5. Cache in Redis (6 hours = 21600 seconds)
  try {
    await redis.set(cacheKey, JSON.stringify(createdInsights), { ex: 21600 });
  } catch {
    console.warn("[AI Insights] Redis cache write failed");
  }

  return createdInsights;
}

// ── Rate Limit Check ──────────────────────────────────────────────────

export async function checkInsightRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const today = format(new Date(), "yyyy-MM-dd");
  const rateLimitKey = `rate:insights:${userId}:${today}`;

  try {
    const current = (await redis.get<number>(rateLimitKey)) || 0;

    if (current >= 3) {
      return { allowed: false, remaining: 0 };
    }

    await redis.incr(rateLimitKey);
    // Expire at end of day (set TTL to 24h on first increment)
    if (current === 0) {
      await redis.expire(rateLimitKey, 86400);
    }

    return { allowed: true, remaining: 2 - current };
  } catch {
    // If Redis is down, allow the request but log warning
    console.warn("[AI Insights] Rate limit check failed, allowing request");
    return { allowed: true, remaining: 3 };
  }
}
