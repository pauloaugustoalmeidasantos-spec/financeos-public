/**
 * whatsapp-ai.ts
 * Serviço que processa mensagens do WhatsApp (texto e áudio) usando Gemini
 * e cria transações automaticamente no FinanceOS.
 */

import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { PrismaClient } from "@/generated/prisma/client";
import { format, subDays } from "date-fns";

// ── Gemini Client ─────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Gemini 1.5 Flash: mais rápido e 10x mais barato que Pro
// Suporta áudio nativamente para transcrição
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ── Types ─────────────────────────────────────────────────────────────

export type WhatsAppMessageType = "text" | "audio";

export interface ParsedTransaction {
  amount: number;
  type: "EXPENSE" | "INCOME";
  description: string;
  categoryName: string | null; // nome sugerido pela IA
  categoryId: string | null;   // resolvido após busca no banco
  transactionDate: Date;
  confidence: "high" | "medium" | "low";
}

export interface WhatsAppProcessResult {
  success: boolean;
  transaction?: ParsedTransaction & { id: string };
  rawText?: string;         // texto original ou transcrito
  confirmationMessage: string;
  errorMessage?: string;
}

// ── System Prompt ─────────────────────────────────────────────────────

function buildExtractionPrompt(
  userMessage: string,
  categories: { id: string; name: string; type: string }[],
  today: string
): string {
  const categoryList = categories
    .map((c) => `  - id="${c.id}" nome="${c.name}" tipo="${c.type}"`)
    .join("\n");

  return `Você é um assistente financeiro pessoal brasileiro. Sua tarefa é extrair informações de transações financeiras de mensagens de texto ou áudio transcritos.

DATA DE HOJE: ${today}

CATEGORIAS DISPONÍVEIS DO USUÁRIO:
${categoryList || "  (nenhuma categoria cadastrada)"}

MENSAGEM DO USUÁRIO: "${userMessage}"

Analise a mensagem e extraia as informações da transação. Retorne APENAS um JSON válido com esta estrutura exata:

{
  "found": true,
  "amount": 50.00,
  "type": "EXPENSE",
  "description": "Mercado São João",
  "categoryId": "uuid-da-categoria-aqui-ou-null",
  "categoryName": "Alimentação",
  "transactionDate": "2024-01-15",
  "confidence": "high",
  "responseMessage": "✅ Registrei: Gasto de R$ 50,00 em Alimentação (Mercado São João)"
}

REGRAS:
- "found": false se não há transação na mensagem (ex: saudações, perguntas)
- "amount": valor numérico em reais (ex: 50.00, 1500.00, 89.90)
- "type": "EXPENSE" para gastos/pagamentos, "INCOME" para receitas/salários/ganhos
- "description": descrição curta e clara do que foi gasto/recebido
- "categoryId": id exato de uma das categorias listadas acima, ou null se nenhuma se encaixa
- "categoryName": nome da categoria escolhida, ou sugestão de nova categoria
- "transactionDate": data no formato ISO "YYYY-MM-DD". Use a data de hoje se não mencionada. Interprete "ontem", "segunda", etc.
- "confidence": "high" se tudo claro, "medium" se alguma ambiguidade, "low" se muita incerteza
- "responseMessage": mensagem amigável em português para enviar de volta ao usuário via WhatsApp

EXEMPLOS DE INTERPRETAÇÃO:
- "gastei 50 reais no mercado" → EXPENSE, R$50, categoria Alimentação
- "paguei conta de luz 120" → EXPENSE, R$120, categoria Contas/Utilities
- "recebi salário 5000" → INCOME, R$5000, categoria Salário
- "uber 25,50" → EXPENSE, R$25.50, categoria Transporte
- "ifood 45 ontem" → EXPENSE, R$45, data de ontem, categoria Alimentação
- "oi tudo bem?" → found: false`;
}

// ── Main Processing Function ──────────────────────────────────────────

/**
 * Processa uma mensagem de texto do WhatsApp
 */
export async function processTextMessage(
  prisma: PrismaClient,
  userId: string,
  text: string
): Promise<WhatsAppProcessResult> {
  try {
    // 1. Busca categorias do usuário
    const categories = await prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true },
    });

    const today = format(new Date(), "yyyy-MM-dd");
    const prompt = buildExtractionPrompt(text, categories, today);

    // 2. Chama Gemini
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 3. Parse do JSON (remove blocos markdown se houver)
    const cleanJson = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleanJson);

    if (!parsed.found) {
      return {
        success: false,
        rawText: text,
        confirmationMessage:
          "Olá! 👋 Pode me enviar seus gastos ou receitas que eu registro automaticamente. Exemplos:\n• \"gastei 50 reais no mercado\"\n• \"paguei 120 de luz\"\n• \"recebi salário 5000\"",
      };
    }

    // 4. Cria a transação no banco
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: parsed.amount,
        type: parsed.type,
        description: parsed.description || null,
        categoryId: parsed.categoryId || null,
        transactionDate: new Date(parsed.transactionDate),
        isRecurring: false,
        recurrenceType: "NONE",
      },
    });

    return {
      success: true,
      rawText: text,
      transaction: {
        id: transaction.id,
        amount: parsed.amount,
        type: parsed.type,
        description: parsed.description,
        categoryName: parsed.categoryName,
        categoryId: parsed.categoryId,
        transactionDate: new Date(parsed.transactionDate),
        confidence: parsed.confidence,
      },
      confirmationMessage: parsed.responseMessage || generateDefaultConfirmation(parsed),
    };
  } catch (error) {
    console.error("[WhatsApp AI] Error processing text message:", error);
    return {
      success: false,
      rawText: text,
      confirmationMessage:
        "❌ Não consegui processar sua mensagem. Tente novamente com formato como: \"gastei 50 reais no mercado\"",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Processa um áudio do WhatsApp
 * O áudio chega como base64 (formato .ogg/opus do WhatsApp)
 */
export async function processAudioMessage(
  prisma: PrismaClient,
  userId: string,
  audioBase64: string,
  mimeType: string = "audio/ogg"
): Promise<WhatsAppProcessResult> {
  try {
    // 1. Busca categorias do usuário
    const categories = await prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true },
    });

    const today = format(new Date(), "yyyy-MM-dd");
    const categoryList = categories
      .map((c) => `  - id="${c.id}" nome="${c.name}" tipo="${c.type}"`)
      .join("\n");

    // 2. Gemini processa áudio diretamente (multimodal) — transcreve E extrai
    const audioPart: Part = {
      inlineData: {
        data: audioBase64,
        mimeType: mimeType as any,
      },
    };

    const textPart: Part = {
      text: `Você é um assistente financeiro pessoal brasileiro. 
      
DATA DE HOJE: ${today}

CATEGORIAS DO USUÁRIO:
${categoryList || "  (nenhuma cadastrada)"}

INSTRUÇÕES:
1. Transcreva o áudio
2. Extraia a transação financeira (se houver)
3. Retorne APENAS JSON válido:

{
  "transcription": "texto transcrito do áudio",
  "found": true,
  "amount": 50.00,
  "type": "EXPENSE",
  "description": "Mercado São João",
  "categoryId": "uuid-ou-null",
  "categoryName": "Alimentação",
  "transactionDate": "2024-01-15",
  "confidence": "high",
  "responseMessage": "✅ Registrei: Gasto de R$ 50,00 em Alimentação"
}

Se não há transação no áudio, retorne: {"transcription": "...", "found": false, "responseMessage": "mensagem amigável"}`,
    };

    const result = await model.generateContent([audioPart, textPart]);
    const responseText = result.response.text();

    const cleanJson = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleanJson);
    const transcription = parsed.transcription || "(áudio não transcrito)";

    if (!parsed.found) {
      return {
        success: false,
        rawText: transcription,
        confirmationMessage:
          parsed.responseMessage ||
          `🎙️ Ouvi: "${transcription}"\n\nNão encontrei uma transação. Diga algo como "gastei 50 reais no mercado".`,
      };
    }

    // 3. Cria a transação no banco
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: parsed.amount,
        type: parsed.type,
        description: parsed.description || null,
        categoryId: parsed.categoryId || null,
        transactionDate: new Date(parsed.transactionDate),
        isRecurring: false,
        recurrenceType: "NONE",
      },
    });

    return {
      success: true,
      rawText: transcription,
      transaction: {
        id: transaction.id,
        amount: parsed.amount,
        type: parsed.type,
        description: parsed.description,
        categoryName: parsed.categoryName,
        categoryId: parsed.categoryId,
        transactionDate: new Date(parsed.transactionDate),
        confidence: parsed.confidence,
      },
      confirmationMessage: parsed.responseMessage || generateDefaultConfirmation(parsed),
    };
  } catch (error) {
    console.error("[WhatsApp AI] Error processing audio message:", error);
    return {
      success: false,
      confirmationMessage:
        "❌ Não consegui processar o áudio. Tente enviar a mensagem por texto.",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function generateDefaultConfirmation(parsed: any): string {
  const emoji = parsed.type === "INCOME" ? "💰" : "💸";
  const typeLabel = parsed.type === "INCOME" ? "Receita" : "Gasto";
  const amount = Number(parsed.amount).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return `${emoji} *${typeLabel} registrado!*\n\n• Valor: ${amount}\n• Categoria: ${parsed.categoryName || "Sem categoria"}\n• Descrição: ${parsed.description}\n\nAcesse o FinanceOS para ver o lançamento completo.`;
}

/**
 * Busca usuário pelo número de WhatsApp
 */
export async function findUserByWhatsAppPhone(
  prisma: PrismaClient,
  phone: string
): Promise<{ id: string; email: string } | null> {
  // Normaliza o número (remove +, espaços, etc.)
  const normalizedPhone = phone.replace(/\D/g, "");

  const user = await (prisma as any).user.findFirst({
    where: {
      whatsappPhone: {
        contains: normalizedPhone,
      },
    },
    select: { id: true, email: true },
  });

  return user;
}
