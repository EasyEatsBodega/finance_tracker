import { NextRequest, NextResponse } from "next/server";
import { getRangeCandles, type ChartRange } from "@/lib/yahoo";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const VALID_RANGES: ChartRange[] = ["1h", "4h", "1d", "3d", "1w"];

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  const range = req.nextUrl.searchParams.get("range") as ChartRange | null;

  if (!ticker || !/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker)) {
    return NextResponse.json({ error: "invalid ticker" }, { status: 400 });
  }
  if (!range || !VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: "invalid range" }, { status: 400 });
  }

  try {
    const candles = await getRangeCandles(ticker, range);
    return NextResponse.json({ candles });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
