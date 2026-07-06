import { NextRequest, NextResponse } from "next/server";
import { removeTicker } from "@/lib/kv";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { ticker?: string };
    if (!body.ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });
    const watchlist = await removeTicker(body.ticker);
    return NextResponse.json({ ok: true, watchlist });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
