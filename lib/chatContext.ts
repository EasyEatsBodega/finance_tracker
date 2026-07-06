import type { Digest } from "./types";

function formatPct(pct: number | null): string {
  if (pct === null) return "n/a";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function formatPrice(p: number | null): string {
  if (p === null) return "n/a";
  return `$${p.toFixed(2)}`;
}

export function buildChatSystemPrompt(digest: Digest | null, focusedTicker: string | null): string {
  if (!digest || digest.tickers.length === 0) {
    return [
      "You are a helpful stock research assistant embedded in a personal ticker-tracking dashboard.",
      "The dashboard has no cached data yet. Politely tell the user they need to click 'Refresh now' on the dashboard first, then ask again.",
    ].join("\n");
  }

  const lines: string[] = [];
  lines.push(
    "You are a helpful stock research assistant embedded in a personal ticker-tracking dashboard.",
    "The user is watching the tickers below. Every answer must use this data — do not invent numbers or headlines.",
    "",
    `## Data snapshot (as of ${new Date(digest.generatedAt).toISOString()})`,
    "",
  );

  for (const t of digest.tickers) {
    lines.push(`### ${t.ticker}`);
    const priceLine =
      t.pctChangeToday !== null
        ? `Price ${formatPrice(t.currentPrice)} (${formatPct(t.pctChangeToday)} today)`
        : `Price ${formatPrice(t.currentPrice)}`;
    lines.push(priceLine);
    if (t.windows.length) {
      const windowStr = t.windows
        .map((w) => `${w.window}=${formatPct(w.pctChange)}`)
        .join(", ");
      lines.push(`Change over windows: ${windowStr}`);
    }
    if (t.tldr) lines.push(`System summary: ${t.tldr}`);
    if (t.headlines.length) {
      lines.push("Recent headlines (most recent first):");
      for (const h of t.headlines.slice(0, 8)) {
        const d = new Date(h.publishedAt).toISOString().slice(0, 10);
        lines.push(`  - [${d} · ${h.source}] ${h.headline}`);
      }
    }
    if (t.error) lines.push(`Data note: ${t.error}`);
    lines.push("");
  }

  if (focusedTicker) {
    lines.push(
      `The user opened this chat from the ${focusedTicker} card on the dashboard, so default to that ticker unless they ask about something else.`,
      "",
    );
  }

  lines.push(
    "## Rules",
    "- Ground every claim in the data above (headlines, prices, %-changes, TL;DR notes).",
    "- Cite headlines by paraphrasing them briefly when they support a point.",
    "- If the user asks about a ticker not in the watchlist, say it's not on their watchlist and offer to help them add it via Settings.",
    "- Do NOT speculate about future prices, give price targets, or make buy/sell recommendations.",
    "- Keep answers concise: 2–4 short sentences by default. Go longer only when the question genuinely needs it.",
    "- When numbers matter (percent moves, prices), quote them exactly as shown above.",
  );

  return lines.join("\n");
}
