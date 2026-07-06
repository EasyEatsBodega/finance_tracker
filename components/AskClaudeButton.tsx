"use client";

import { useChat } from "./ChatContext";

export function AskClaudeButton({ ticker }: { ticker: string }) {
  const { openChat } = useChat();
  return (
    <button
      onClick={() => openChat({ ticker, seed: `What's going on with ${ticker} right now?` })}
      className="rounded border border-neutral-800 px-2 py-0.5 text-xs text-neutral-400 hover:border-neutral-600 hover:text-neutral-100"
    >
      Ask Claude
    </button>
  );
}
