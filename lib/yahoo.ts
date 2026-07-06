export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type ChartRange = "1h" | "4h" | "1d" | "3d" | "1w";

type YahooChartMeta = {
  regularMarketPrice: number;
  chartPreviousClose: number;
  previousClose?: number;
};

type YahooIndicators = {
  quote: Array<{
    open: (number | null)[];
    high: (number | null)[];
    low: (number | null)[];
    close: (number | null)[];
    volume: (number | null)[];
  }>;
};

type YahooResult = {
  meta: YahooChartMeta;
  timestamp?: number[];
  indicators: YahooIndicators;
};

type YahooResponse = {
  chart: {
    result?: YahooResult[];
    error?: { code: string; description: string } | null;
  };
};

const UA = "Mozilla/5.0 (compatible; TickerTracker/1.0)";

async function fetchChart(
  ticker: string,
  interval: string,
  range: string,
): Promise<YahooResult | null> {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`);
  url.searchParams.set("interval", interval);
  url.searchParams.set("range", range);
  url.searchParams.set("includePrePost", "false");
  const res = await fetch(url, { cache: "no-store", headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`Yahoo chart ${ticker} ${interval}/${range} failed: ${res.status}`);
  const body = (await res.json()) as YahooResponse;
  if (body.chart.error) throw new Error(`Yahoo error: ${body.chart.error.description}`);
  return body.chart.result?.[0] ?? null;
}

function toCandles(result: YahooResult): Candle[] {
  const ts = result.timestamp ?? [];
  const q = result.indicators.quote[0];
  if (!q) return [];
  const candles: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open[i];
    const h = q.high[i];
    const l = q.low[i];
    const c = q.close[i];
    const v = q.volume[i];
    if (o === null || h === null || l === null || c === null) continue;
    candles.push({ t: ts[i] * 1000, o, h, l, c, v: v ?? 0 });
  }
  return candles;
}

export type Quote = {
  currentPrice: number | null;
  previousClose: number | null;
  pctChangeToday: number | null;
};

export async function getQuote(ticker: string): Promise<Quote> {
  const result = await fetchChart(ticker, "1d", "5d");
  if (!result) return { currentPrice: null, previousClose: null, pctChangeToday: null };
  const currentPrice = result.meta.regularMarketPrice ?? null;
  const previousClose = result.meta.previousClose ?? result.meta.chartPreviousClose ?? null;
  const pctChangeToday =
    currentPrice !== null && previousClose !== null && previousClose > 0
      ? ((currentPrice - previousClose) / previousClose) * 100
      : null;
  return { currentPrice, previousClose, pctChangeToday };
}

export async function getDailyCloses(ticker: string): Promise<number[]> {
  const result = await fetchChart(ticker, "1d", "6mo");
  if (!result) return [];
  return toCandles(result).map((c) => c.c);
}

const RANGE_CONFIG: Record<
  ChartRange,
  { interval: string; range: string; sliceLastMs?: number }
> = {
  "1h": { interval: "1m", range: "1d", sliceLastMs: 60 * 60 * 1000 },
  "4h": { interval: "5m", range: "1d", sliceLastMs: 4 * 60 * 60 * 1000 },
  "1d": { interval: "15m", range: "1d" },
  "3d": { interval: "30m", range: "5d", sliceLastMs: 3 * 24 * 60 * 60 * 1000 },
  "1w": { interval: "1h", range: "5d" },
};

export async function getRangeCandles(ticker: string, range: ChartRange): Promise<Candle[]> {
  const cfg = RANGE_CONFIG[range];
  const result = await fetchChart(ticker, cfg.interval, cfg.range);
  if (!result) return [];
  const candles = toCandles(result);
  if (!cfg.sliceLastMs || candles.length === 0) return candles;
  const cutoff = candles[candles.length - 1].t - cfg.sliceLastMs;
  return candles.filter((c) => c.t >= cutoff);
}
