/**
 * Serviço de cotações do Tesouro Direto via API oficial Tesouro Transparente
 * Documentação: https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-tesouros-ofertados
 * 
 * API pública: https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/tesouro-direto-produtos.json
 */

export interface TesouroPriceResult {
  ticker: string;
  name: string;
  unitPrice: number;      // Preço unitário de compra
  sellUnitPrice: number;  // Preço unitário de venda
  annualReturn: number;   // Taxa de retorno anual (%)
  maturityDate: string;   // Data de vencimento
  updatedAt: string;
}

interface TesouroProduto {
  NmTitulo: string;
  DtFimVenda: string;
  DtVencimento: string;
  VlPuCompra: number;
  VlPuVenda: number;
  VlPuBaseAm: number;
  TxCompra: number;
  TxVenda: number;
  DtBaseResgate: string;
}

// In-memory cache — 1h TTL
let cachedData: TesouroPriceResult[] | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Normalizes the title name to a standard ticker format
// e.g. "Tesouro Selic 2026" → "SELIC2026"
export function normalizeTesouroticker(nmTitulo: string): string {
  const n = nmTitulo.toLowerCase().trim();
  
  // Extract year from the end
  const yearMatch = nmTitulo.match(/(\d{4})$/);
  const year = yearMatch ? yearMatch[1] : "";

  if (n.includes("selic")) return `SELIC${year}`;
  if (n.includes("prefixado") && n.includes("juro")) return `PREJ${year}`;
  if (n.includes("prefixado")) return `PRE${year}`;
  if (n.includes("ipca") && n.includes("juro")) return `IPCAJ${year}`;
  if (n.includes("ipca")) return `IPCA${year}`;
  if (n.includes("renda+") || n.includes("renda +")) return `RENDA${year}`;
  if (n.includes("educa+") || n.includes("educa +")) return `EDUCA${year}`;
  
  // Generic fallback: remove spaces and special chars
  return nmTitulo.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
}

export async function fetchTesouroPrices(): Promise<TesouroPriceResult[]> {
  // Return cache if fresh
  if (cachedData && Date.now() < cacheExpiresAt) {
    return cachedData;
  }

  try {
    const res = await fetch(
      "https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/tesouro-direto-produtos.json",
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; FinanceOS/1.0)",
        },
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error(`Tesouro API error: ${res.status}`);
    }

    const json = await res.json();
    
    // The API response structure
    const response = json?.response;
    const produtos: TesouroProduto[] = response?.TrsrBdTradgList || [];

    if (!produtos || produtos.length === 0) {
      throw new Error("No products returned from Tesouro API");
    }

    const results: TesouroPriceResult[] = produtos.map((p) => ({
      ticker: normalizeTesouroticker(p.NmTitulo),
      name: p.NmTitulo,
      unitPrice: p.VlPuCompra || p.VlPuBaseAm,
      sellUnitPrice: p.VlPuVenda,
      annualReturn: p.TxCompra || p.TxVenda || 0,
      maturityDate: p.DtVencimento,
      updatedAt: new Date().toISOString(),
    }));

    cachedData = results;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return results;
  } catch (error) {
    console.error("[tesouro] Error fetching prices:", error);
    return cachedData || [];
  }
}

export async function fetchTesouroPriceByTicker(ticker: string): Promise<TesouroPriceResult | null> {
  const all = await fetchTesouroPrices();
  return all.find((p) => p.ticker === ticker.toUpperCase()) || null;
}

export async function fetchMultipleTesouroPrices(tickers: string[]): Promise<Map<string, TesouroPriceResult>> {
  const all = await fetchTesouroPrices();
  const upperTickers = new Set(tickers.map((t) => t.toUpperCase()));
  const result = new Map<string, TesouroPriceResult>();
  
  for (const item of all) {
    if (upperTickers.has(item.ticker)) {
      result.set(item.ticker, item);
    }
  }
  
  return result;
}
