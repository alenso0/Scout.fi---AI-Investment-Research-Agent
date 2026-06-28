const BASE_URL = "https://finnhub.io/api/v1";

function withToken(path: string, params: Record<string, string>) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("token", process.env.FINNHUB_API_KEY ?? "");
  return url.toString();
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Finnhub request failed (${res.status}): ${url.split("?")[0]}`);
  }
  return res.json() as Promise<T>;
}

export interface FinnhubSymbolMatch {
  symbol: string;
  description: string;
  type: string;
}

export interface FinnhubProfile {
  name: string;
  ticker: string;
  weburl: string;
  finnhubIndustry: string;
  exchange: string;
  marketCapitalization: number;
}

export interface FinnhubBasicFinancials {
  metric: Record<string, number | undefined>;
}

export interface FinnhubNewsItem {
  headline: string;
  summary: string;
  url: string;
  datetime: number;
  source: string;
}

export async function searchSymbol(query: string) {
  const data = await getJson<{ result: FinnhubSymbolMatch[] }>(
    withToken("/search", { q: query })
  );
  return data.result;
}

export async function getCompanyProfile(symbol: string) {
  return getJson<FinnhubProfile>(withToken("/stock/profile2", { symbol }));
}

export async function getBasicFinancials(symbol: string) {
  return getJson<FinnhubBasicFinancials>(
    withToken("/stock/metric", { symbol, metric: "all" })
  );
}

export async function getPeers(symbol: string) {
  return getJson<string[]>(withToken("/stock/peers", { symbol }));
}

export async function getCompanyNews(symbol: string, fromISODate: string, toISODate: string) {
  return getJson<FinnhubNewsItem[]>(
    withToken("/company-news", { symbol, from: fromISODate, to: toISODate })
  );
}
