import { kv } from "@vercel/kv";
import type { Digest } from "./types";

const KEYS = {
  watchlist: "watchlist",
  claudeApiKey: "claude_api_key",
  cachedDigest: "cache:digest",
} as const;

const DEFAULT_WATCHLIST = ["CIFR", "IREN", "OPEN", "MSTR", "COIN"];

function normalize(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export async function getWatchlist(): Promise<string[]> {
  const stored = await kv.get<string[]>(KEYS.watchlist);
  if (stored && Array.isArray(stored)) return stored;
  await kv.set(KEYS.watchlist, DEFAULT_WATCHLIST);
  return DEFAULT_WATCHLIST;
}

export async function addTicker(ticker: string): Promise<string[]> {
  const t = normalize(ticker);
  if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(t)) {
    throw new Error(`Invalid ticker: ${ticker}`);
  }
  const list = await getWatchlist();
  if (list.includes(t)) return list;
  const next = [...list, t];
  await kv.set(KEYS.watchlist, next);
  return next;
}

export async function removeTicker(ticker: string): Promise<string[]> {
  const t = normalize(ticker);
  const list = await getWatchlist();
  const next = list.filter((x) => x !== t);
  await kv.set(KEYS.watchlist, next);
  return next;
}

export async function getClaudeApiKey(): Promise<string | null> {
  return (await kv.get<string>(KEYS.claudeApiKey)) ?? null;
}

export async function setClaudeApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed.startsWith("sk-ant-")) {
    throw new Error("That doesn't look like a Claude API key (expected sk-ant-...)");
  }
  await kv.set(KEYS.claudeApiKey, trimmed);
}

export async function clearClaudeApiKey(): Promise<void> {
  await kv.del(KEYS.claudeApiKey);
}

export async function getCachedDigest(): Promise<Digest | null> {
  return (await kv.get<Digest>(KEYS.cachedDigest)) ?? null;
}

export async function setCachedDigest(digest: Digest): Promise<void> {
  await kv.set(KEYS.cachedDigest, digest);
}

export function maskKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 12) return "sk-ant-…";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}
