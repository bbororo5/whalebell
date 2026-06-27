/**
 * 거래소 입금 주소 라벨링 + 추적 토큰 설정 (이더리움 메인넷).
 *
 * 무료로 완벽한 거래소 라벨 소스가 없어 주요 거래소 핫월렛을 수동 큐레이션한다.
 * (커버리지 한계가 있으나 데모/MVP에는 충분. 추후 Arkham/Nansen 등으로 확장.)
 * 모든 주소는 소문자로 비교한다.
 */

/** 추적 토큰: ERC-20 컨트랙트 주소 → 심볼. "native"는 ETH. */
export const TRACKED_TOKENS: Record<string, string> = {
  // 컨트랙트 주소(소문자) → 심볼
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
  "0x163f8c2467924be0ae7b5347228cabf260318753": "WLD",
};

/** ETH 네이티브 전송은 컨트랙트가 없으므로 별도 식별 */
export const NATIVE_SYMBOL = "ETH";

/** 주요 거래소 핫월렛/입금 주소 (소문자). 일부 대표 주소만 큐레이션. */
const EXCHANGE_ADDRESSES = new Set<string>(
  [
    // Binance
    "0x28c6c06298d514db089934071355e5743bf21d60",
    "0x21a31ee1afc51d94c2efccaa2092ad1028285549",
    "0xdfd5293d8e347dfe59e90efd55b2956a1343963d",
    "0x56eddb7aa87536c09ccc2793473599fd21a8b17f",
    // Coinbase
    "0x71660c4005ba85c37ccec55d0c4493e66fe775d3",
    "0x503828976d22510aad0201ac7ec88293211d23da",
    "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740",
    // Upbit
    "0x390de26d772d2e2005c6d1d24afc902bae37a4bb",
    // Bithumb
    "0x88d34944cf554e9cccf4a24292d891f620e9c94f",
    // OKX
    "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b",
    // Kraken
    "0x2910543af39aba0cd09dbb2d50200b3e800a63d2",
  ].map((a) => a.toLowerCase()),
);

export function isExchangeAddress(address: string): boolean {
  return EXCHANGE_ADDRESSES.has(address.toLowerCase());
}

export type Direction =
  | "exchange_inflow"
  | "exchange_outflow"
  | "wallet_to_wallet";

export function classifyDirection(from: string, to: string): Direction {
  const fromEx = isExchangeAddress(from);
  const toEx = isExchangeAddress(to);
  if (toEx && !fromEx) return "exchange_inflow";
  if (fromEx && !toEx) return "exchange_outflow";
  return "wallet_to_wallet";
}

/** 컨트랙트 주소로 심볼 찾기 (추적 대상이 아니면 undefined) */
export function symbolForContract(contract?: string | null): string | undefined {
  if (!contract) return undefined;
  return TRACKED_TOKENS[contract.toLowerCase()];
}
