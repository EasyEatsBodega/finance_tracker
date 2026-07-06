import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm space-y-6 pt-16">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Ticker Tracker</h1>
        <p className="mt-1 text-xs text-neutral-500">Enter your password to continue.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
