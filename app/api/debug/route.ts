import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getCachedDigest, getWatchlist } from "@/lib/kv";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const password = process.env.DASHBOARD_PASSWORD;

  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth === `Bearer ${cronSecret}`) return true;
  }

  if (password) {
    const cookie = req.cookies.get("dashboard_auth")?.value;
    if (cookie === password) return true;
  }

  return !cronSecret && !password;
}

async function safeCall<T>(
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const envVars = {
    KV_URL: !!process.env.KV_URL,
    KV_REST_API_URL: !!process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
    KV_REST_API_READ_ONLY_TOKEN: !!process.env.KV_REST_API_READ_ONLY_TOKEN,
    FINNHUB_API_KEY: !!process.env.FINNHUB_API_KEY,
    CRON_SECRET: !!process.env.CRON_SECRET,
    DASHBOARD_PASSWORD: !!process.env.DASHBOARD_PASSWORD,
  };

  const kvRestUrlHost = process.env.KV_REST_API_URL
    ? new URL(process.env.KV_REST_API_URL).host
    : null;

  const watchlist = await safeCall(() => getWatchlist());

  const digestRead = await safeCall(async () => {
    const d = await getCachedDigest();
    return d
      ? {
          generatedAt: d.generatedAt,
          generatedAtISO: new Date(d.generatedAt).toISOString(),
          ageMinutes: Math.round((Date.now() - d.generatedAt) / 60000),
          tickerCount: d.tickers.length,
          firstTicker: d.tickers[0]?.ticker ?? null,
          firstPrice: d.tickers[0]?.currentPrice ?? null,
          firstError: d.tickers[0]?.error ?? null,
        }
      : null;
  });

  const testKey = `debug:roundtrip:${Date.now()}`;
  const testValue = `hello-${Date.now()}`;
  const roundtrip = await safeCall(async () => {
    const setResult = await kv.set(testKey, testValue, { ex: 60 });
    const readBack = await kv.get<string>(testKey);
    return {
      key: testKey,
      wrote: testValue,
      setResult,
      readBack,
      match: readBack === testValue,
    };
  });

  return NextResponse.json({
    envVars,
    kvRestUrlHost,
    watchlist,
    digestRead,
    roundtrip,
  });
}
