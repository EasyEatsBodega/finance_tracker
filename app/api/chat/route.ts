import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getCachedDigest, getClaudeApiKey } from "@/lib/kv";
import { buildChatSystemPrompt } from "@/lib/chatContext";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const maxDuration = 60;

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOOL_ITERATIONS = 4;

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
    (m) =>
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.length,
  );
  if (!messages.length) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const digest = await getCachedDigest();
  const system = buildChatSystemPrompt(digest, body.focusedTicker ?? null);

  const client = new Anthropic({ apiKey });

  const tools = [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 5,
    },
  ] as unknown as Anthropic.Messages.ToolUnion[];

  try {
    let convo: Anthropic.Messages.MessageParam[] = messages;
    let final: Anthropic.Messages.Message | null = null;
    let searched = false;

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system,
        tools,
        messages: convo,
      });

      if (res.content.some((b) => b.type === "server_tool_use")) {
        searched = true;
      }

      if (res.stop_reason === "pause_turn") {
        convo = [...convo, { role: "assistant", content: res.content }];
        continue;
      }
      final = res;
      break;
    }

    if (!final) {
      return NextResponse.json(
        { error: "Chat exceeded max tool iterations without a final response." },
        { status: 500 },
      );
    }

    const content = final.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n\n")
      .trim();

    return NextResponse.json({
      content: content || "(empty response)",
      usedWebSearch: searched,
      stopReason: final.stop_reason,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
