import { NextRequest, NextResponse } from "next/server";
import { clearClaudeApiKey, setClaudeApiKey } from "@/lib/kv";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { key?: string; clear?: boolean };
    if (body.clear) {
      await clearClaudeApiKey();
      return NextResponse.json({ ok: true, cleared: true });
    }
    if (!body.key) return NextResponse.json({ error: "key required" }, { status: 400 });
    await setClaudeApiKey(body.key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
