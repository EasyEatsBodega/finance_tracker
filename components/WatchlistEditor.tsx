"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function WatchlistEditor({ initial }: { initial: string[] }) {
  const [watchlist, setWatchlist] = useState(initial);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ticker = input.trim().toUpperCase();
    if (!ticker) return;
    try {
      const res = await fetch("/api/add-ticker", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setWatchlist(body.watchlist);
      setInput("");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function remove(ticker: string) {
    setError(null);
    try {
      const res = await fetch("/api/remove-ticker", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setWatchlist(body.watchlist);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add ticker (e.g. NVDA)"
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
        />
        <button
          disabled={pending || !input.trim()}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && <p className="text-xs text-red-400">{error}</p>}

      <ul className="divide-y divide-neutral-800 rounded-md border border-neutral-800">
        {watchlist.length === 0 && (
          <li className="p-3 text-sm text-neutral-500">Watchlist is empty.</li>
        )}
        {watchlist.map((t) => (
          <li key={t} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="font-medium">{t}</span>
            <button
              onClick={() => remove(t)}
              className="text-xs text-neutral-500 hover:text-red-400"
            >
              Untrack
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
