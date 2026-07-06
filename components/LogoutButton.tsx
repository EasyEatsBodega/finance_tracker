"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await fetch("/api/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-50"
    >
      {pending ? "…" : "Log out"}
    </button>
  );
}
