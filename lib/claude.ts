import Anthropic from "@anthropic-ai/sdk";
import type { Headline, WindowStat } from "./types";

const MODEL = "claude-haiku-4-5-20251001";

export type TldrInput = {
  ticker: string;
  pctChangeToday: number | null;
  windows: WindowStat[];
  headlines: Headline[];
};

function formatWindow(w: WindowStat): string {
  if (w.pctChange === null) return `${w.window}: n/a`;
  return `${w.window}: ${w.pctChange >= 0 ? "+" : ""}${w.pctChange.toFixed(1)}%`;
}

export async function generateTldr(apiKey: string, input: TldrInput): Promise<string | null> {
  const client = new Anthropic({ apiKey });
  const headlineLines = input.headlines
    .slice(0, 8)
    .map((h) => `- ${h.headline} (${h.source})`)
    .join("\n");
  const windowLines = input.windows.map(formatWindow).join(", ");
  const today =
    input.pctChangeToday === null
      ? "today: n/a"
      : `today: ${input.pctChangeToday >= 0 ? "+" : ""}${input.pctChangeToday.toFixed(2)}%`;

  const prompt = `Ticker: ${input.ticker}
Price context — ${today}. Recent windows: ${windowLines}.

Recent headlines (last ~7 days):
${headlineLines || "(none)"}

Write ONE plain sentence (max 25 words) that summarizes what's been going on with ${input.ticker} recently. Focus on the concrete story from the headlines, tied to the price move if there's an obvious link. Do NOT speculate about future price. Do NOT hedge with phrases like "may indicate" or "could suggest". If the headlines are thin, say so briefly.`;

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 120,
      messages: [{ role: "user", content: prompt }],
    });
    const block = res.content[0];
    if (block && block.type === "text") return block.text.trim();
    return null;
  } catch (err) {
    console.error(`Claude TL;DR failed for ${input.ticker}:`, err);
    return null;
  }
}
