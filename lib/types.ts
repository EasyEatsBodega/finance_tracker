export type Window = "5d" | "10d" | "1mo" | "3mo";

export const WINDOWS: Window[] = ["5d", "10d", "1mo", "3mo"];

export const WINDOW_TRADING_DAYS: Record<Window, number> = {
  "5d": 5,
  "10d": 10,
  "1mo": 21,
  "3mo": 63,
};

export type Headline = {
  headline: string;
  source: string;
  url: string;
  publishedAt: number;
};

export type WindowStat = {
  window: Window;
  pctChange: number | null;
  percentile: number | null;
  isNewExtreme: "high" | "low" | null;
  lookbackDays: number;
};

export type TickerSnapshot = {
  ticker: string;
  currentPrice: number | null;
  previousClose: number | null;
  pctChangeToday: number | null;
  windows: WindowStat[];
  tldr: string | null;
  headlines: Headline[];
  error?: string;
};

export type Digest = {
  generatedAt: number;
  tickers: TickerSnapshot[];
};
