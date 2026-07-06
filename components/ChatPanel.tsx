"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useChat } from "./ChatContext";

type Message = { role: "user" | "assistant"; content: string };

export function ChatPanel() {
  const pathname = usePathname();
  const { open, focusedTicker, seedInput, closeChat, clearSeed } = useChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (open && seedInput) {
      setInput(seedInput);
      clearSeed();
    }
  }, [open, seedInput, clearSeed]);

  if (!open) return null;
  if (pathname === "/login") return null;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next, focusedTicker }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setMessages([...next, { role: "assistant", content: body.content || "(empty response)" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  function newChat() {
    setMessages([]);
    setError(null);
    setInput("");
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-x-auto sm:right-4 sm:bottom-4">
      <div className="mx-auto flex h-[85vh] w-full max-w-md flex-col rounded-t-xl border border-neutral-800 bg-neutral-950 shadow-2xl sm:h-[600px] sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-100">Ask Claude</h3>
            {focusedTicker && (
              <span className="rounded border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 text-xs text-neutral-400">
                {focusedTicker}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={newChat}
              className="text-xs text-neutral-500 hover:text-neutral-200"
              disabled={sending}
            >
              New
            </button>
            <button
              onClick={closeChat}
              className="text-xs text-neutral-500 hover:text-neutral-200"
            >
              Close
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <div className="rounded-md border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-400">
              Ask anything about your watchlist — a ticker, a headline, why something moved, what
              the momentum flag means. Claude sees your latest cached digest{" "}
              {focusedTicker ? (
                <>
                  and is focused on <span className="text-neutral-200">{focusedTicker}</span>.
                </>
              ) : (
                "for every ticker."
              )}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-8 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-100"
                  : "mr-8 whitespace-pre-wrap rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              }
            >
              {m.content}
            </div>
          ))}
          {sending && (
            <div className="mr-8 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm italic text-neutral-500">
              thinking…
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-neutral-800 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={focusedTicker ? `Ask about ${focusedTicker}…` : "Ask about your watchlist…"}
            disabled={sending}
            className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm placeholder-neutral-600 focus:border-neutral-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
