import { WINDOWS, WINDOW_TRADING_DAYS, type WindowStat } from "./types";

function pctChange(a: number, b: number): number {
  return ((b - a) / a) * 100;
}

function percentileRank(sample: number[], value: number): number {
  if (sample.length === 0) return 0.5;
  let below = 0;
  for (const s of sample) if (s < value) below++;
  return below / sample.length;
}

/**
 * For a given window of N trading days, produce (currentPctChange, historicalDistribution)
 * where the distribution is every N-day rolling % change across the closes array,
 * EXCLUDING the current one.
 */
function windowStats(closes: number[], n: number): { current: number | null; distribution: number[] } {
  if (closes.length <= n) return { current: null, distribution: [] };
  const last = closes.length - 1;
  const current = pctChange(closes[last - n], closes[last]);
  const distribution: number[] = [];
  for (let i = n; i < last; i++) {
    distribution.push(pctChange(closes[i - n], closes[i]));
  }
  return { current, distribution };
}

export function computeWindowStats(closes: number[]): WindowStat[] {
  return WINDOWS.map((w) => {
    const n = WINDOW_TRADING_DAYS[w];
    const { current, distribution } = windowStats(closes, n);
    if (current === null || distribution.length === 0) {
      return { window: w, pctChange: current, percentile: null, isNewExtreme: null, lookbackDays: 0 };
    }
    const percentile = percentileRank(distribution, current);
    const max = Math.max(...distribution);
    const min = Math.min(...distribution);
    const isNewExtreme: WindowStat["isNewExtreme"] =
      current > max ? "high" : current < min ? "low" : null;
    return {
      window: w,
      pctChange: current,
      percentile,
      isNewExtreme,
      lookbackDays: distribution.length + n,
    };
  });
}

export function extremeFlag(stat: WindowStat): string | null {
  if (stat.pctChange === null) return null;
  const months = Math.round(stat.lookbackDays / 21);
  if (stat.isNewExtreme === "high") {
    return `biggest ${stat.window} move up in ${months}mo`;
  }
  if (stat.isNewExtreme === "low") {
    return `biggest ${stat.window} move down in ${months}mo`;
  }
  if (stat.percentile !== null && stat.percentile >= 0.95) {
    return `top 5% ${stat.window} move (${months}mo)`;
  }
  if (stat.percentile !== null && stat.percentile <= 0.05) {
    return `bottom 5% ${stat.window} move (${months}mo)`;
  }
  return null;
}
