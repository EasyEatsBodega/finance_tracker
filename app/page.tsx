import Link from "next/link";
import { getCachedDigest } from "@/lib/kv";
import { Dashboard } from "@/components/Dashboard";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function Home() {
  const digest = await getCachedDigest();

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Ticker Tracker</h1>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>Personal watchlist digest</span>
            <span>·</span>
            <LogoutButton />
          </div>
        </div>
        <Link
          href="/settings"
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Settings
        </Link>
      </header>

      <Dashboard digest={digest} />
    </main>
  );
}
