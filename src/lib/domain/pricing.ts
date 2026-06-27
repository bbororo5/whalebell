/**
 * [B-2 환산] 코인 수량 → 원화 규모.
 * fiatKrw = tokenAmount × priceUsd × FX_RATE
 * 시세는 live(CoinGecko) 슬롯이 비어 있으면 코인별 fallback을 사용한다.
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

export interface KrwConversion {
  fiatKrw: number;
  priceSource: "live" | "fallback";
}

export function convertToKrw(
  coinSymbol: string,
  tokenAmount: number,
): KrwConversion {
  // 확장 슬롯: 여기서 live 시세를 조회하고, 실패 시 fallback으로 떨어진다.
  const priceUsd = FALLBACK_PRICES_USD[coinSymbol.toUpperCase()] ?? 0;
  const fiatKrw = Math.round(tokenAmount * priceUsd * FX_RATE);
  return { fiatKrw, priceSource: "fallback" };
}

/** 코인 1개의 현재가(원). live 슬롯 없으면 fallback 시세 사용. */
export function getCurrentPriceKrw(coinSymbol: string): number {
  const priceUsd = FALLBACK_PRICES_USD[coinSymbol.toUpperCase()] ?? 0;
  return priceUsd * FX_RATE;
}
