/**
 * [B-2 환산] 코인 수량 → 원화 규모.
 * fiatKrw = tokenAmount × priceUsd × FX_RATE
 * 시세는 CoinGecko에서 실시간 조회하고, 실패/미지원 시 코인별 fallback을 사용한다.
 */

export const FX_RATE = 1380; // USD→KRW 고정 환율(MVP)

/** 코인별 fallback USD 시세(대략). live 시세 실패/미사용 시 사용. */
export const FALLBACK_PRICES_USD: Record<string, number> = {
  WLD: 2.2,
  ETH: 3600,
  USDT: 1,
  BTC: 95000,
  XRP: 2.2,
  SOL: 150,
  DOGE: 0.22,
  SHIB: 0.00002,
  PEPE: 0.000015,
};

/** CoinGecko coin id 매핑 */
const COINGECKO_IDS: Record<string, string> = {
  WLD: "worldcoin-wld",
  ETH: "ethereum",
  USDT: "tether",
  BTC: "bitcoin",
  XRP: "ripple",
  SOL: "solana",
  DOGE: "dogecoin",
  SHIB: "shiba-inu",
  PEPE: "pepe",
};

interface CacheEntry {
  priceUsd: number;
  at: number;
}
const CACHE_TTL_MS = 60_000;
const g = globalThis as unknown as { __priceCache?: Map<string, CacheEntry> };
const cache = (g.__priceCache ??= new Map());

export interface PriceResult {
  priceUsd: number;
  source: "live" | "fallback";
}

/** 코인 USD 시세. CoinGecko 실시간 → 실패 시 fallback. 60초 캐시. */
export async function getPriceUsd(coinSymbol: string): Promise<PriceResult> {
  const sym = coinSymbol.toUpperCase();
  const fallback = FALLBACK_PRICES_USD[sym] ?? 0;

  const cached = cache.get(sym);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { priceUsd: cached.priceUsd, source: "live" };
  }

  const id = COINGECKO_IDS[sym];
  if (!id) return { priceUsd: fallback, source: "fallback" };

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return { priceUsd: fallback, source: "fallback" };
    const data = await res.json();
    const priceUsd = data?.[id]?.usd;
    if (typeof priceUsd !== "number" || priceUsd <= 0) {
      return { priceUsd: fallback, source: "fallback" };
    }
    cache.set(sym, { priceUsd, at: Date.now() });
    return { priceUsd, source: "live" };
  } catch {
    return { priceUsd: fallback, source: "fallback" };
  }
}

export interface KrwConversion {
  fiatKrw: number;
  priceSource: "live" | "fallback";
}

export async function convertToKrw(
  coinSymbol: string,
  tokenAmount: number,
): Promise<KrwConversion> {
  const { priceUsd, source } = await getPriceUsd(coinSymbol);
  return {
    fiatKrw: Math.round(tokenAmount * priceUsd * FX_RATE),
    priceSource: source,
  };
}

/** 코인 1개의 현재가(원). */
export async function getCurrentPriceKrw(coinSymbol: string): Promise<number> {
  const { priceUsd } = await getPriceUsd(coinSymbol);
  return priceUsd * FX_RATE;
}
