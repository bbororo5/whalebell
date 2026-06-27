import type { Transfer } from "../types";
import {
  TRACKED_TOKENS,
  NATIVE_SYMBOL,
  exchangeAddressList,
  exchangeNameForAddress,
} from "./exchanges";

/**
 * [B-1 감지: 실데이터] Alchemy로 거래소 핫월렛으로 "실제로 들어온" 최근 대형 이동을 조회한다.
 * = 큰손이 거래소로 코인을 옮긴 실제 온체인 사건(exchange_inflow).
 *
 * alchemy_getAssetTransfers (toAddress=거래소) 사용.
 * ALCHEMY_API_KEY 가 없거나 실패하면 null을 돌려준다(상위에서 mock fallback).
 */

const TRACKED_CONTRACTS = Object.keys(TRACKED_TOKENS); // 소문자 컨트랙트들

interface AlchemyTransfer {
  asset?: string;
  value?: number;
  from?: string;
  to?: string;
  hash?: string;
  category?: string;
  rawContract?: { address?: string };
  metadata?: { blockTimestamp?: string };
}

function symbolOf(t: AlchemyTransfer): string | undefined {
  if (t.category === "external") return NATIVE_SYMBOL; // ETH 네이티브
  const c = t.rawContract?.address?.toLowerCase();
  if (c && TRACKED_TOKENS[c]) return TRACKED_TOKENS[c];
  return undefined;
}

async function transfersToExchange(
  apiKey: string,
  exchange: string,
  maxCount: number,
): Promise<Transfer[]> {
  const res = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [
        {
          toAddress: exchange,
          category: ["external", "erc20"],
          contractAddresses: TRACKED_CONTRACTS,
          order: "desc",
          maxCount: `0x${maxCount.toString(16)}`,
          withMetadata: true,
          excludeZeroValue: true,
        },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const raw: AlchemyTransfer[] = data?.result?.transfers ?? [];

  const out: Transfer[] = [];
  for (const t of raw) {
    const symbol = symbolOf(t);
    if (!symbol) continue;
    const amount = typeof t.value === "number" ? t.value : 0;
    if (amount <= 0) continue;
    const exchangeName = exchangeNameForAddress(exchange);
    const toLabel = exchangeName ? `${exchangeName} 거래소` : "거래소";
    out.push({
      id: `tx_${t.hash}`,
      coinSymbol: symbol,
      tokenAmount: amount,
      direction: "exchange_inflow",
      fromLabel: "많은 양을 보유한 큰손 계좌",
      toLabel,
      detectedAt: t.metadata?.blockTimestamp ?? new Date().toISOString(),
    });
  }
  return out;
}

/**
 * 여러 거래소 주소로 들어온 최근 추적-토큰 이동을 모아 반환.
 * 키 없으면 null. (상위 getWhaleTransfers가 mock으로 폴백)
 */
export async function fetchRecentWhaleTransfers(): Promise<Transfer[] | null> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) return null;
  try {
    const exchanges = exchangeAddressList().slice(0, 4); // rate 보호: 상위 몇 개만
    const results = await Promise.all(
      exchanges.map((ex) => transfersToExchange(apiKey, ex, 8).catch(() => [])),
    );
    const all = results.flat();
    // 최신순 정렬, 중복 tx 제거
    const seen = new Set<string>();
    const deduped = all.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    deduped.sort(
      (a, b) =>
        new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
    );
    // 사이클당 처리량을 제한(서버리스 시간/스팸 보호). 코인별 축약은 ingest에서 한 번 더.
    return deduped.slice(0, 12);
  } catch {
    return null;
  }
}
