"use client";

import { WINDOWS, type Window } from "@/lib/types";

type Props = {
  active: Window;
  onChange: (w: Window) => void;
};

export function ScreenerToggle({ active, onChange }: Props) {
  return (
    <div className="inline-flex rounded-md border border-neutral-700 bg-neutral-900 p-0.5 text-xs">
      {WINDOWS.map((w) => (
        <button
          key={w}
          onClick={() => onChange(w)}
          className={`rounded px-2.5 py-1 transition-colors ${
            active === w ? "bg-neutral-100 text-neutral-900" : "text-neutral-400 hover:text-neutral-100"
          }`}
        >
          {w}
        </button>
      ))}
    </div>
  );
}
