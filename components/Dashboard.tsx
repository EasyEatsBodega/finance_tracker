"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { extremeFlag } from "@/lib/screener";
import type { Digest, TickerSnapshot, Window } from "@/lib/types";
import { ScreenerToggle } from "./ScreenerToggle";
import { TickerChart } from "./TickerChart";
import { AskClaudeButton } from "./AskClaudeButton";

const STALE_AFTER_MS = 10 * 60 * 1000;
const REFRESH_TIMEOUT_MS = 60_000;
const RELOAD_COUNTER_KEY = "tt_refresh_reload_count";
const MAX_RELOADS = 2;

function pct(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

function priceStr(n: number | null): string {
  if (n === null) return "—";
  return `$${n.toFixed(2)}`;
}

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function tickerWindowChange(t: TickerSnapshot, w: Window): number | null {
  return t.windows.find((x) => x.window === w)?.pctChange ?? null;
}

export function Dashboard({ digest }: { digest: Digest | null }) {
  const [window, setWindow] = useState<Window>("10d");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const hasKickedOffRef = useRef(false);

  const isStale =
    !digest || Date.now() - digest.generatedAt > STALE_AFTER_MS;

  useEffect(() => {
    if (digest) {
      sessionStorage.removeItem(RELOAD_COUNTER_KEY);
    }
  }, [digest]);

  useEffect(() => {
    if (hasKickedOffRef.current) return;
    if (!isStale) return;
    hasKickedOffRef.current = true;

    const reloadCount = Number(sessionStorage.getItem(RELOAD_COUNTER_KEY) ?? "0");
    if (reloadCount >= MAX_RELOADS) {
      sessionStorage.removeItem(RELOAD_COUNTER_KEY);
      setRefreshError(
        "Refresh completed but no data appeared in the cache. Likely a Vercel KV write/read mismatch — check /api/refresh function logs.",
      );
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);

    (async () => {
      setRefreshing(true);
      setRefreshError(null);
      try {
        const res = await fetch("/api/refresh", {
          method: "POST",
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        if (!cancelled) {
          sessionStorage.setItem(RELOAD_COUNTER_KEY, String(reloadCount + 1));
          location.reload();
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === "AbortError") {
          setRefreshError(
            `Refresh took longer than ${REFRESH_TIMEOUT_MS / 1000}s and was aborted.`,
          );
        } else {
          setRefreshError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setRefreshing(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [isStale]);

  const sortedTickers = useMemo(() => {
    if (!digest) return [];
    return [...digest.tickers].sort((a, b) => {
      const av = tickerWindowChange(a, window);
      const bv = tickerWindowChange(b, window);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return bv - av;
    });
  }, [digest, window]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs text-neutral-500">
          {digest ? (
            <>
              Sorted by change over
              <span className="ml-1 text-neutral-300">{window}</span>. Updated{" "}
              {relTime(digest.generatedAt)}.
            </>
          ) : (
            <>Building your first digest…</>
          )}
          {refreshing && <span className="ml-2 text-neutral-400">· fetching latest…</span>}
        </div>
        <ScreenerToggle active={window} onChange={setWindow} />
      </div>

      {refreshError && (
        <div className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          Couldn't refresh: {refreshError}
        </div>
      )}

      {!digest && !refreshing && !refreshError && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">
          Loading…
        </div>
      )}

      {!digest && refreshing && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">
          Building your first digest. This can take up to a minute on cold start.
        </div>
      )}

      {digest && (
        <div className="space-y-3">
          {sortedTickers.map((t) => (
            <TickerCard key={t.ticker} snapshot={t} activeWindow={window} />
          ))}
        </div>
      )}
    </div>
  );
}

function TickerCard({ snapshot, activeWindow }: { snapshot: TickerSnapshot; activeWindow: Window }) {
  const [showAllHeadlines, setShowAllHeadlines] = useState(false);
  const windowStat = snapshot.windows.find((w) => w.window === activeWindow);
  const flag = windowStat ? extremeFlag(windowStat) : null;
  const shownHeadlines = showAllHeadlines ? snapshot.headlines : snapshot.headlines.slice(0, 5);

  const activeChange = windowStat?.pctChange ?? null;
  const activeColor =
    activeChange === null
      ? "text-neutral-500"
      : activeChange >= 0
        ? "text-emerald-400"
        : "text-red-400";

  return (
    <article className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{snapshot.ticker}</h2>
          <span className="text-sm text-neutral-400">{priceStr(snapshot.currentPrice)}</span>
          <span
            className={`text-sm ${
              snapshot.pctChangeToday === null
                ? "text-neutral-500"
                : snapshot.pctChangeToday >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
            }`}
          >
            {pct(snapshot.pctChangeToday)} today
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-lg font-medium ${activeColor}`}>
            {pct(activeChange, 1)} <span className="text-xs text-neutral-500">{activeWindow}</span>
          </div>
          <AskClaudeButton ticker={snapshot.ticker} />
        </div>
      </header>

      {flag && (
        <div className="mt-2 inline-flex items-center rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
          {flag}
        </div>
      )}

      {snapshot.tldr && (
        <p className="mt-3 text-sm leading-relaxed text-neutral-200">{snapshot.tldr}</p>
      )}

      {snapshot.error && (
        <p className="mt-3 text-xs text-red-400">Data error: {snapshot.error}</p>
      )}

      <TickerChart ticker={snapshot.ticker} />

      {snapshot.headlines.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-neutral-800 pt-3">
          {shownHeadlines.map((h, i) => (
            <a
              key={i}
              href={h.url}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-neutral-300 hover:text-neutral-100"
            >
              <span className="text-neutral-500">
                {new Date(h.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                {" · "}
                {h.source}
                {" · "}
              </span>
              {h.headline}
            </a>
          ))}
          {snapshot.headlines.length > 5 && (
            <button
              onClick={() => setShowAllHeadlines((s) => !s)}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              {showAllHeadlines
                ? "show fewer"
                : `show ${snapshot.headlines.length - 5} more`}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
