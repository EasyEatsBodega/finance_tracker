"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

const RANGES = ["1h", "4h", "1d", "3d", "1w"] as const;
type Range = (typeof RANGES)[number];

type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

export function TickerChart({ ticker }: { ticker: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [range, setRange] = useState<Range>("1d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#a3a3a3",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#262626" },
        horzLines: { color: "#262626" },
      },
      rightPriceScale: { borderColor: "#262626" },
      timeScale: { borderColor: "#262626", timeVisible: true, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height: 220,
      autoSize: true,
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",
      downColor: "#f87171",
      borderUpColor: "#34d399",
      borderDownColor: "#f87171",
      wickUpColor: "#34d399",
      wickDownColor: "#f87171",
    });
    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/chart?ticker=${encodeURIComponent(ticker)}&range=${range}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        if (cancelled) return;
        const candles = (body.candles as Candle[]).map<CandlestickData>((c) => ({
          time: (Math.floor(c.t / 1000)) as UTCTimestamp,
          open: c.o,
          high: c.h,
          low: c.l,
          close: c.c,
        }));
        seriesRef.current?.setData(candles);
        chartRef.current?.timeScale().fitContent();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ticker, range]);

  return (
    <div className="mt-3 space-y-2 border-t border-neutral-800 pt-3">
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-md border border-neutral-800 bg-neutral-950 p-0.5 text-xs">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-2 py-0.5 transition-colors ${
                range === r ? "bg-neutral-100 text-neutral-900" : "text-neutral-500 hover:text-neutral-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="text-xs text-neutral-500">
          {loading ? "loading…" : error ? <span className="text-red-400">{error}</span> : null}
        </div>
      </div>
      <div ref={containerRef} className="h-[220px] w-full" />
    </div>
  );
}
