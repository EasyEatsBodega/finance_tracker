"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ChatContextValue = {
  open: boolean;
  focusedTicker: string | null;
  seedInput: string | null;
  openChat: (opts?: { ticker?: string; seed?: string }) => void;
  closeChat: () => void;
  clearSeed: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [focusedTicker, setFocusedTicker] = useState<string | null>(null);
  const [seedInput, setSeedInput] = useState<string | null>(null);

  const openChat = useCallback((opts?: { ticker?: string; seed?: string }) => {
    setFocusedTicker(opts?.ticker ?? null);
    setSeedInput(opts?.seed ?? null);
    setOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setOpen(false);
  }, []);

  const clearSeed = useCallback(() => setSeedInput(null), []);

  const value = useMemo(
    () => ({ open, focusedTicker, seedInput, openChat, closeChat, clearSeed }),
    [open, focusedTicker, seedInput, openChat, closeChat, clearSeed],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}
