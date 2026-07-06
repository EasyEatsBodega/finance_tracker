import type { Digest } from "./types";

function formatPct(pct: number | null): string {
  if (pct === null) return "n/a";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function formatPrice(p: number | null): string {
  if (p === null) return "n/a";
  return `$${p.toFixed(2)}`;
}

export function buildChatSystemPrompt(
  digest: Digest | null,
  focusedTicker: string | null,
): string {
  const lines: string[] = [];
  lines.push(
    "You are a market research assistant embedded in the user's personal ticker-tracking dashboard.",
    "",
    "You have a web_search tool. USE IT whenever the user asks about anything that isn't already in the watchlist snapshot below — historical prices, market cycles, macro context, other tickers not on the watchlist, comparative analysis, current events, definitions, on-chain data, sector context, etc. Do not decline just because the snapshot doesn't contain it. Search first, then answer with what you found.",
    "",
    `Today's date is ${new Date().toISOString().slice(0, 10)}. Use current-year queries when searching for recent data.`,
    "",
  );

  if (digest && digest.tickers.length) {
    lines.push(
      `## Watchlist snapshot (${new Date(digest.generatedAt).toISOString()})`,
      "",
      "These are the tickers, prices, %-changes, and headlines currently on the user's dashboard. When the user references these, quote the exact numbers below.",
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
  } else {
    lines.push(
      "The user's watchlist snapshot isn't cached right now. Answer using web search plus your training knowledge.",
      "",
    );
  }

  if (focusedTicker) {
    lines.push(
      `The user opened this chat from the ${focusedTicker} card on the dashboard, so default to that ticker unless they ask about something else.`,
      "",
    );
  }

  lines.push(
    "## Rules",
    "- When quoting numbers from the watchlist snapshot above, use the exact values shown — don't paraphrase percentages.",
    "- For anything not in the snapshot (historical data, cycle comparisons, other tickers, macro context, definitions, current events), use web_search rather than declining. Cite what you found briefly.",
    "- Analysis, comparisons, historical context, and framing are all fair game. Don't make personalized buy/sell/hold recommendations.",
    "- Default answer length: 2–5 short paragraphs. Go longer only when the question genuinely calls for it.",
    "- If a search returns nothing useful, say so plainly and offer what you can still say from your training knowledge (with a caveat about the date).",
  );
  return lines.join("\n");
}
