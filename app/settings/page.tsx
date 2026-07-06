import Link from "next/link";
import { getClaudeApiKey, getWatchlist, maskKey } from "@/lib/kv";
import { KeyInput } from "@/components/KeyInput";
import { WatchlistEditor } from "@/components/WatchlistEditor";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [watchlist, key] = await Promise.all([getWatchlist(), getClaudeApiKey()]);
  const masked = maskKey(key);

  return (
    <main className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-xs text-neutral-500">Manage your watchlist and Claude API key.</p>
        </div>
        <Link
          href="/"
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          ← Dashboard
        </Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400">Watchlist</h2>
        <WatchlistEditor initial={watchlist} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400">
          Claude API Key
        </h2>
        <KeyInput maskedInitial={masked} />
      </section>
    </main>
  );
}
