import { getClaudeApiKey, getWatchlist, setCachedDigest } from "./kv";
import { getCompanyNews } from "./finnhub";
import { getDailyCloses, getQuote } from "./yahoo";
import { computeWindowStats } from "./screener";
import { generateTldr } from "./claude";
import type { Digest, TickerSnapshot } from "./types";

async function buildSnapshot(ticker: string, claudeKey: string | null): Promise<TickerSnapshot> {
  try {
    const [quote, closes, headlines] = await Promise.all([
      getQuote(ticker).catch(() => ({ currentPrice: null, previousClose: null, pctChangeToday: null })),
      getDailyCloses(ticker).catch(() => [] as number[]),
      getCompanyNews(ticker).catch(() => []),
    ]);

    const windows = computeWindowStats(closes);

    let tldr: string | null = null;
    if (claudeKey) {
      tldr = await generateTldr(claudeKey, {
        ticker,
        pctChangeToday: quote.pctChangeToday,
        windows,
        headlines,
      });
    }

    return {
      ticker,
      currentPrice: quote.currentPrice,
      previousClose: quote.previousClose,
      pctChangeToday: quote.pctChangeToday,
      windows,
      tldr,
      headlines,
    };
  } catch (err) {
    return {
      ticker,
      currentPrice: null,
      previousClose: null,
      pctChangeToday: null,
      windows: [],
      tldr: null,
      headlines: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function buildAndCacheDigest(): Promise<Digest> {
  const [watchlist, claudeKey] = await Promise.all([getWatchlist(), getClaudeApiKey()]);
  const snapshots = await Promise.all(watchlist.map((t) => buildSnapshot(t, claudeKey)));
  const digest: Digest = {
    generatedAt: Date.now(),
    tickers: snapshots,
  };
  await setCachedDigest(digest);
  return digest;
}
