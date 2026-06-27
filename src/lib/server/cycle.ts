import type { Subscription, Transfer, WhaleAlert } from "../types";
import { getCoin } from "../coins";
import { generateSeniorMessage, generateShortMessage } from "../sms";
import { getWhaleTransfers } from "../domain/transfers";
import { computeImpact } from "../domain/impact";
import { dispatch } from "../domain/dispatch";
import { hasAlert, insertAlert, type AlertInput } from "./store";
import { ingestTransfers } from "./ingest";

/**
 * 루프 B 1회 실행 (mock 감지 소스 기준).
 * 실제 감지는 Alchemy 웹훅 → ingestTransfer로 들어온다.
 * 이 함수는 데모/대시보드 진입용 mock 트리거다.
 */
export async function runDetectionCycle(): Promise<{
  scanned: number;
  created: WhaleAlert[];
}> {
  return ingestTransfers(await getWhaleTransfers());
}

/**
 * 신청 직후 보여줄 첫 미리보기 Alert 1건.
 * 구독 기준 금액 규모로 대표 이동을 가정해 만든다(항상 preview_only 성격).
 * 인트로는 빠르게 보여줘야 하므로 AI를 거치지 않고 템플릿을 쓴다.
 */
export async function createIntroAlert(
  sub: Subscription,
): Promise<WhaleAlert | null> {
  const introTransferId = `intro_${sub.id}`;
  if (await hasAlert(introTransferId, sub.id)) return null;
  const coin = getCoin(sub.coinSymbol);
  if (!coin) return null;

  const introTransfer: Transfer = {
    id: introTransferId,
    coinSymbol: sub.coinSymbol,
    tokenAmount: 0,
    direction: "exchange_inflow",
    fromLabel: "많은 양을 보유한 큰손 계좌",
    toLabel: "거래소",
    detectedAt: new Date().toISOString(),
  };
  const impactLevel = computeImpact(introTransfer, sub.thresholdKrw);
  const ctx = {
    coin,
    transfer: introTransfer,
    fiatKrw: sub.thresholdKrw,
    priceSource: "fallback" as const,
    marketCapPct: null,
    impactHint: impactLevel,
  };
  const message = generateSeniorMessage(ctx);
  const shortBody = generateShortMessage(ctx);
  const delivery = await dispatch(sub.phone, message);
  const input: AlertInput = {
    subscriptionId: sub.id,
    transferId: introTransferId,
    phone: sub.phone,
    coinSymbol: sub.coinSymbol,
    fiatKrw: sub.thresholdKrw,
    tokenAmount: 0,
    direction: "exchange_inflow",
    impactLevel,
    message,
    shortBody,
    delivery,
    detectedAt: introTransfer.detectedAt,
  };
  return insertAlert(input);
}
