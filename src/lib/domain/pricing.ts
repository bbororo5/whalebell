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
  marketCapUsd: number;
  at: number;
}
const CACHE_TTL_MS = 60_000;
const g = globalThis as unknown as { __priceCache?: Map<string, CacheEntry> };
const cache = (g.__priceCache ??= new Map());

export interface PriceResult {
  priceUsd: number;
  source: "live" | "fallback";
}

export interface MarketData {
  priceUsd: number;
  marketCapUsd: number;
  source: "live" | "fallback";
}

/** 코인 시세 + 시가총액(USD). CoinGecko 실시간 → 실패 시 fallback. 60초 캐시. */
export async function getMarketData(coinSymbol: string): Promise<MarketData> {
  const sym = coinSymbol.toUpperCase();
  const fallbackPrice = FALLBACK_PRICES_USD[sym] ?? 0;

  const cached = cache.get(sym);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return {
      priceUsd: cached.priceUsd,
      marketCapUsd: cached.marketCapUsd,
      source: "live",
    };
  }

  const id = COINGECKO_IDS[sym];
  if (!id) return { priceUsd: fallbackPrice, marketCapUsd: 0, source: "fallback" };

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_market_cap=true`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok)
      return { priceUsd: fallbackPrice, marketCapUsd: 0, source: "fallback" };
    const data = await res.json();
    const priceUsd = data?.[id]?.usd;
    const marketCapUsd = data?.[id]?.usd_market_cap ?? 0;
    if (typeof priceUsd !== "number" || priceUsd <= 0) {
      return { priceUsd: fallbackPrice, marketCapUsd: 0, source: "fallback" };
    }
    cache.set(sym, { priceUsd, marketCapUsd, at: Date.now() });
    return { priceUsd, marketCapUsd, source: "live" };
  } catch {
    return { priceUsd: fallbackPrice, marketCapUsd: 0, source: "fallback" };
  }
}

/** 코인 USD 시세. */
export async function getPriceUsd(coinSymbol: string): Promise<PriceResult> {
  const { priceUsd, source } = await getMarketData(coinSymbol);
  return { priceUsd, source };
}

/**
 * 이동 규모가 코인 시가총액의 최소 몇 %인지 게이트.
 * WHALE_MIN_MCAP_PCT(기본 5%) 이상일 때만 통과.
 * 시총을 못 구하면(0) 게이트를 통과시킨다(시총 미확인 시 막지 않음).
 */
export const WHALE_MIN_MCAP_PCT = Number(
  process.env.WHALE_MIN_MCAP_PCT ?? "5",
);

export async function passesMarketCapGate(
  coinSymbol: string,
  tokenAmount: number,
): Promise<{ pass: boolean; pct: number; marketCapUsd: number }> {
  const { priceUsd, marketCapUsd } = await getMarketData(coinSymbol);
  if (!marketCapUsd || marketCapUsd <= 0) {
    return { pass: true, pct: 0, marketCapUsd: 0 };
  }
  const moveUsd = tokenAmount * priceUsd;
  const pct = (moveUsd / marketCapUsd) * 100;
  return { pass: pct >= WHALE_MIN_MCAP_PCT, pct, marketCapUsd };
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
