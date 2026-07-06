"use client";

import { usePathname } from "next/navigation";
import { useChat } from "./ChatContext";

export function ChatFab() {
  const pathname = usePathname();
  const { open, openChat } = useChat();

  if (open) return null;
  if (pathname === "/login") return null;

  return (
    <button
      onClick={() => openChat()}
      className="fixed bottom-4 right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-neutral-100 px-4 text-sm font-medium text-neutral-900 shadow-lg transition-transform hover:scale-105"
      aria-label="Ask Claude"
    >
      Ask Claude
    </button>
  );
}
