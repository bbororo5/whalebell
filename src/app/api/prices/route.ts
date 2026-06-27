import { NextResponse } from "next/server";
import { FX_RATE, getPriceUsd } from "@/lib/domain/pricing";

/**
 * 코인 현재가(원화) 조회. CoinGecko 실시간 → 실패 시 fallback.
 * 예: /api/prices?symbols=WLD,ETH,USDT
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const prices: Record<string, number> = {};
  const sources: Record<string, string> = {};

  await Promise.all(
    symbols.map(async (sym) => {
      const { priceUsd, source } = await getPriceUsd(sym);
      prices[sym] = priceUsd * FX_RATE;
      sources[sym] = source;
    }),
  );

  return NextResponse.json({ ok: true, prices, sources });
}
