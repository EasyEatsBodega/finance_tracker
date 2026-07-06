"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function KeyInput({ maskedInitial }: { maskedInitial: string | null }) {
  const [masked, setMasked] = useState<string | null>(maskedInitial);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!input.trim()) return;
    try {
      const res = await fetch("/api/set-key", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: input.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      const k = input.trim();
      setMasked(`${k.slice(0, 7)}…${k.slice(-4)}`);
      setInput("");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function clear() {
    setError(null);
    try {
      const res = await fetch("/api/set-key", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setMasked(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (masked) {
    return (
      <div className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
        <span className="font-mono text-neutral-300">{masked}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setMasked(null)}
            className="text-xs text-neutral-500 hover:text-neutral-200"
          >
            Replace
          </button>
          <button
            onClick={clear}
            disabled={pending}
            className="text-xs text-neutral-500 hover:text-red-400"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="sk-ant-…"
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
        />
        <button
          disabled={pending || !input.trim()}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700 disabled:opacity-50"
        >
          Save
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-xs text-neutral-500">
        Stored in Vercel KV. Used only by <span className="font-mono">/api/refresh</span> to generate
        the TL;DR line above each ticker's headlines. If unset, the app skips the TL;DR and still
        renders everything else.
      </p>
    </form>
  );
}
