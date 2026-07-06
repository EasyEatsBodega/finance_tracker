import { NextRequest, NextResponse } from "next/server";
import { buildAndCacheDigest } from "@/lib/digest";
import { getCachedDigest } from "@/lib/kv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    console.log("[refresh] starting");
    const digest = await buildAndCacheDigest();
    console.log(
      `[refresh] built digest generatedAt=${digest.generatedAt} tickers=${digest.tickers.length}`,
    );
    const readBack = await getCachedDigest();
    const readBackOk =
      !!readBack && readBack.generatedAt === digest.generatedAt;
    console.log(
      `[refresh] immediate readBack found=${!!readBack} matches=${readBackOk}`,
    );
    return NextResponse.json({
      ok: true,
      generatedAt: digest.generatedAt,
      count: digest.tickers.length,
      firstTicker: digest.tickers[0]?.ticker ?? null,
      firstPrice: digest.tickers[0]?.currentPrice ?? null,
      immediateReadBack: {
        found: !!readBack,
        matches: readBackOk,
        readBackGeneratedAt: readBack?.generatedAt ?? null,
      },
    });
  } catch (err) {
    console.error("[refresh] threw", err);
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : null;
    return NextResponse.json({ ok: false, error: message, stack }, { status: 500 });
  }
}

export const POST = GET;
