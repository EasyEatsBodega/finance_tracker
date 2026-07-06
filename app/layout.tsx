import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ticker Tracker",
  description: "Personal watchlist digest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">{children}</div>
      </body>
    </html>
  );
}
