import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getCachedDigest, getClaudeApiKey } from "@/lib/kv";
import { buildChatSystemPrompt } from "@/lib/chatContext";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const maxDuration = 60;

const MODEL = "claude-haiku-4-5-20251001";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const apiKey = await getClaudeApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "No Claude API key stored. Add one in Settings first." },
      { status: 400 },
    );
  }

  let body: { messages?: ChatMessage[]; focusedTicker?: string | null };
  try {
    body = (await req.json()) as {
      messages?: ChatMessage[];
      focusedTicker?: string | null;
    };
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const messages = (body.messages ?? []).filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length,
  );
  if (!messages.length) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const digest = await getCachedDigest();
  const system = buildChatSystemPrompt(digest, body.focusedTicker ?? null);

  const client = new Anthropic({ apiKey });
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages,
    });
    const block = res.content[0];
    const content = block && block.type === "text" ? block.text.trim() : "";
    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
