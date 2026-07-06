import type { Headline } from "./types";

const BASE = "https://finnhub.io/api/v1";

function key(): string {
  const k = process.env.FINNHUB_API_KEY;
  if (!k) throw new Error("FINNHUB_API_KEY not set");
  return k;
}

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("token", key());
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Finnhub ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

type NewsItem = {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
};

export async function getCompanyNews(ticker: string, lookbackDays = 7): Promise<Headline[]> {
  const now = new Date();
  const from = new Date(now.getTime() - lookbackDays * 86400 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const raw = await get<NewsItem[]>("/company-news", {
    symbol: ticker,
    from: fmt(from),
    to: fmt(now),
  });
  return raw
    .filter((n) => n.headline && n.url)
    .map((n) => ({
      headline: n.headline,
      source: n.source,
      url: n.url,
      publishedAt: n.datetime * 1000,
    }))
    .sort((a, b) => b.publishedAt - a.publishedAt);
}
