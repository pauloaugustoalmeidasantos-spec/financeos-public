import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export interface ParsedStatementItem {
  description: string;
  installmentValue: number;
  totalInstallments: number;
  paidInstallments: number;
}

const PROMPT_INSTRUCTIONS = `Você é um assistente financeiro especialista em ler faturas e extratos de cartão de crédito brasileiros.
Sua tarefa é extrair TODAS as compras que aparecem no documento ou texto, sejam elas parceladas ou à vista.

REGRAS DE EXTRAÇÃO:
1. Extraia TODAS as compras/transações de débito do cliente. Ignore apenas: pagamento de fatura, crédito/estorno, juros, IOF, anuidade.
2. Se a compra tiver indicação de parcela (ex: "02/12", "Parc 2/10", "2 de 10"), use esses valores. paidInstallments = número atual, totalInstallments = número total.
3. Se NÃO tiver indicação de parcela: totalInstallments = 1, paidInstallments = 1 (compra à vista).
4. O valor deve ser o valor da PARCELA (não o total). Converta de "R$ 1.500,00" para 1500.00 (número positivo, ponto decimal).
5. description deve ser o nome limpo do estabelecimento (ex: "Amazon", "Uber", "iFood"). Remova datas, números de parcela e caracteres especiais.
6. Retorne EXCLUSIVAMENTE um array JSON válido com as chaves: description, installmentValue, totalInstallments, paidInstallments.
7. NÃO use markdown (\`\`\`json). Retorne APENAS o JSON puro, começando com [ e terminando com ].
8. Se não encontrar nenhuma compra, retorne um array vazio: []

Formato esperado de saída (exemplo):
[{"description":"Amazon","installmentValue":150.00,"totalInstallments":6,"paidInstallments":2},{"description":"iFood","installmentValue":45.90,"totalInstallments":1,"paidInstallments":1}]
`;

export async function parseCreditCardStatement(rawText: string): Promise<ParsedStatementItem[]> {
  const prompt = `${PROMPT_INSTRUCTIONS}\n\nTEXTO DO EXTRATO:\n${rawText}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Remove qualquer markdown que a IA possa ter colocado
    const cleanText = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Garante que só pega o JSON array
    const jsonStart = cleanText.indexOf("[");
    const jsonEnd = cleanText.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("A IA não retornou um JSON válido.");
    }
    const jsonStr = cleanText.substring(jsonStart, jsonEnd + 1);

    const parsed = JSON.parse(jsonStr) as ParsedStatementItem[];

    return parsed.map(item => ({
      description: String(item.description || "Compra Desconhecida").trim(),
      installmentValue: Math.abs(Number(item.installmentValue) || 0),
      totalInstallments: Number(item.totalInstallments) || 1,
      paidInstallments: Number(item.paidInstallments) || 1,
    })).filter(i => i.installmentValue > 0);
  } catch (error) {
    console.error("[parseCreditCardStatement/text] Erro:", error);
    throw new Error("Falha ao processar o extrato com a IA. Verifique se o texto é válido.");
  }
}

/**
 * Processa um PDF em base64 diretamente via Gemini (sem precisar de File API/upload)
 * Gemini 1.5 Flash aceita PDFs inline até 20MB
 */
export async function parseCreditCardStatementFromPDF(pdfBase64: string): Promise<ParsedStatementItem[]> {
  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      },
      PROMPT_INSTRUCTIONS,
    ]);

    const response = await result.response;
    const text = response.text().trim();

    const cleanText = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const jsonStart = cleanText.indexOf("[");
    const jsonEnd = cleanText.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("A IA não encontrou compras no PDF.");
    }
    const jsonStr = cleanText.substring(jsonStart, jsonEnd + 1);

    const parsed = JSON.parse(jsonStr) as ParsedStatementItem[];

    return parsed.map(item => ({
      description: String(item.description || "Compra Desconhecida").trim(),
      installmentValue: Math.abs(Number(item.installmentValue) || 0),
      totalInstallments: Number(item.totalInstallments) || 1,
      paidInstallments: Number(item.paidInstallments) || 1,
    })).filter(i => i.installmentValue > 0);
  } catch (error) {
    console.error("[parseCreditCardStatement/pdf] Erro:", error);
    throw new Error("Falha ao processar o PDF da fatura. Verifique se o arquivo é válido.");
  }
}
