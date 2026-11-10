import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { buildFinancialContext } from "@/server/services/ai-insights";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const SYSTEM_PROMPT = `Você é um consultor financeiro pessoal especializado em finanças pessoais brasileiras.
Analise os dados financeiros do usuário e converse sobre suas finanças de forma amigável e profissional.
Sempre responda em português brasileiro. Use valores em R$ com formatação brasileira.
Seja específico com números quando possível. Tom: conselheiro amigável, não alarmista.`;

/**
 * POST /api/ai/insights
 * Streaming chat endpoint for Dash.IA using Vercel AI SDK.
 * Compatible with useChat on the client side.
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Não autorizado", { status: 401 });
  }

  // 2. Parse body
  const { messages } = await req.json();

  // 3. Build financial context
  const financialContext = await buildFinancialContext(
    prisma as any,
    user.id
  );

  // 4. Stream response using Vercel AI SDK
  const result = streamText({
    model: openai("gpt-4o"),
    temperature: 0.4,
    maxOutputTokens: 2000,
    system: `${SYSTEM_PROMPT}\n\nContexto financeiro atual do usuário:\n\n${financialContext}`,
    messages,
  });

  return result.toTextStreamResponse();
}
