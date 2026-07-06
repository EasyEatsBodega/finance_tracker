import { NextRequest, NextResponse } from "next/server";
import { buildAndCacheDigest } from "@/lib/digest";

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
    const digest = await buildAndCacheDigest();
    return NextResponse.json({
      ok: true,
      generatedAt: digest.generatedAt,
      count: digest.tickers.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const POST = GET;
