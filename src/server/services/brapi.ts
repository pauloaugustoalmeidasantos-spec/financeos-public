/**
 * Serviço de cotações via brapi.dev
 * Tickers de teste sem token: PETR4, VALE3, MGLU3, ITUB4
 * Para outros: gere token em https://brapi.dev
 */

const BRAPI_BASE = "https://brapi.dev/api";

interface BrapiQuote {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: string;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketPreviousClose: number;
}

interface QuoteResult {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  updatedAt: string;
}

// In-memory cache — 15 min TTL
const cache = new Map<string, { data: QuoteResult; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function getCached(ticker: string): QuoteResult | null {
  const entry = cache.get(ticker.toUpperCase());
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }
  cache.delete(ticker.toUpperCase());
  return null;
}

function setCache(ticker: string, data: QuoteResult) {
  cache.set(ticker.toUpperCase(), { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function fetchQuote(ticker: string): Promise<QuoteResult | null> {
  const cached = getCached(ticker);
  if (cached) return cached;

  try {
    const token = process.env.BRAPI_TOKEN;
    const url = token
      ? `${BRAPI_BASE}/quote/${ticker}?token=${token}`
      : `${BRAPI_BASE}/quote/${ticker}`;

    const res = await fetch(url, { next: { revalidate: 900 } }); // 15 min SSR cache
    if (!res.ok) return null;

    const json = await res.json();
    const results = json.results as BrapiQuote[] | undefined;
    if (!results || results.length === 0) return null;

    const q = results[0];
    const result: QuoteResult = {
      ticker: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      previousClose: q.regularMarketPreviousClose,
      dayHigh: q.regularMarketDayHigh,
      dayLow: q.regularMarketDayLow,
      updatedAt: q.regularMarketTime,
    };

    setCache(ticker, result);
    return result;
  } catch (error) {
    console.error(`[brapi] Error fetching quote for ${ticker}:`, error);
    return null;
  }
}

export async function fetchMultipleQuotes(tickers: string[]): Promise<Map<string, QuoteResult>> {
  const results = new Map<string, QuoteResult>();

  // Separate cached vs uncached
  const uncached: string[] = [];
  for (const t of tickers) {
    const cached = getCached(t);
    if (cached) {
      results.set(t.toUpperCase(), cached);
    } else {
      uncached.push(t);
    }
  }

  if (uncached.length === 0) return results;

  try {
    const token = process.env.BRAPI_TOKEN;
    const tickerList = uncached.join(",");
    const url = token
      ? `${BRAPI_BASE}/quote/${tickerList}?token=${token}`
      : `${BRAPI_BASE}/quote/${tickerList}`;

    const res = await fetch(url);
    if (!res.ok) return results;

    const json = await res.json();
    const apiResults = json.results as BrapiQuote[] | undefined;
    if (!apiResults) return results;

    for (const q of apiResults) {
      const result: QuoteResult = {
        ticker: q.symbol,
        name: q.shortName || q.longName || q.symbol,
        price: q.regularMarketPrice,
        change: q.regularMarketChange,
        changePercent: q.regularMarketChangePercent,
        previousClose: q.regularMarketPreviousClose,
        dayHigh: q.regularMarketDayHigh,
        dayLow: q.regularMarketDayLow,
        updatedAt: q.regularMarketTime,
      };
      setCache(q.symbol, result);
      results.set(q.symbol.toUpperCase(), result);
    }
  } catch (error) {
    console.error("[brapi] Error fetching multiple quotes:", error);
  }

  return results;
}
