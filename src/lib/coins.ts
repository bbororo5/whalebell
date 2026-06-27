import type { Coin } from "./types";

/**
 * 해커톤 MVP 코인 정책.
 * 알림 가능: WLD, ETH, USDT (이더리움 계열로 데모 구조를 맞추기 쉬움)
 * 준비 중: BTC, XRP, SOL, DOGE, SHIB, PEPE (체인이 달라 구현 복잡도 상승)
 * 화면에는 기술 얘기를 노출하지 않고 "현재 알림 가능 / 준비 중"만 보여준다.
 */
export const COINS: Coin[] = [
  {
    symbol: "WLD",
    name: "월드코인",
    status: "available",
    tagline: "큰손 이동 데모 가능",
    popular: true,
    approxPriceKrw: 3_000,
  },
  {
    symbol: "ETH",
    name: "이더리움",
    status: "available",
    tagline: "많은 사람이 보는 코인",
    popular: true,
    approxPriceKrw: 5_000_000,
  },
  {
    symbol: "USDT",
    name: "테더",
    status: "available",
    tagline: "가격이 잘 안 변하는 코인",
    popular: true,
    approxPriceKrw: 1_400,
  },
  {
    symbol: "BTC",
    name: "비트코인",
    status: "coming_soon",
    tagline: "가장 많이 알려진 코인",
    popular: true,
    approxPriceKrw: 130_000_000,
  },
  {
    symbol: "XRP",
    name: "리플",
    status: "coming_soon",
    tagline: "송금에 많이 쓰이는 코인",
    popular: true,
    approxPriceKrw: 3_000,
  },
  {
    symbol: "SOL",
    name: "솔라나",
    status: "coming_soon",
    tagline: "빠른 거래로 알려진 코인",
    popular: true,
    approxPriceKrw: 200_000,
  },
  {
    symbol: "DOGE",
    name: "도지코인",
    status: "coming_soon",
    tagline: "강아지로 유명한 코인",
    popular: false,
    approxPriceKrw: 300,
  },
  {
    symbol: "SHIB",
    name: "시바이누",
    status: "coming_soon",
    tagline: "강아지로 유명한 코인",
    popular: false,
    approxPriceKrw: 30,
  },
  {
    symbol: "PEPE",
    name: "페페",
    status: "coming_soon",
    tagline: "재미로 만들어진 코인",
    popular: false,
    approxPriceKrw: 20,
  },
];

export function getCoin(symbol: string): Coin | undefined {
  return COINS.find((c) => c.symbol.toUpperCase() === symbol.toUpperCase());
}

export function getPopularCoins(): Coin[] {
  return COINS.filter((c) => c.popular);
}

/** 이름/심볼로 코인 검색. 지원 안 되는 코인도 "준비 중"으로 함께 노출한다. */
export function searchCoins(query: string): Coin[] {
  const q = query.trim().toLowerCase();
  if (!q) return COINS;
  return COINS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q),
  );
}
