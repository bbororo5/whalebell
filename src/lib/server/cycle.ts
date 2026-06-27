import type { Subscription, Transfer, WhaleAlert } from "../types";
import { getCoin } from "../coins";
import { generateSeniorMessage, generateShortMessage } from "../sms";
import { getWhaleTransfers } from "../domain/transfers";
import { convertToKrw } from "../domain/pricing";
import { computeImpact } from "../domain/impact";
import { matchSubscriptions } from "../domain/matching";
import { dispatch } from "../domain/dispatch";
import {
  getActiveSubscriptions,
  hasAlert,
  insertAlert,
  type AlertInput,
} from "./store";

async function buildAlertInput(
  transfer: Transfer,
  sub: Subscription,
  fiatKrw: number,
): Promise<AlertInput | null> {
  const coin = getCoin(sub.coinSymbol);
  if (!coin) return null;
  const impactLevel = computeImpact(transfer, fiatKrw);
  const message = generateSeniorMessage({ coin, fiatKrw, impactLevel });
  const shortBody = generateShortMessage({ coin, fiatKrw, impactLevel });
  const delivery = await dispatch(sub.phone, message);
  return {
    subscriptionId: sub.id,
    transferId: transfer.id,
    phone: sub.phone,
    coinSymbol: sub.coinSymbol,
    fiatKrw,
    tokenAmount: transfer.tokenAmount,
    direction: transfer.direction,
    impactLevel,
    message,
    shortBody,
    delivery,
    detectedAt: transfer.detectedAt,
  };
}

/**
 * 루프 B 1회 실행.
 * 감지 → 환산 → 해석 → 매칭 → 생성 → 발송 을 순서대로 수행하고,
 * 멱등성(transferId+subscriptionId)을 지켜 Alert를 적재한다.
 */
export async function runDetectionCycle(): Promise<{
  scanned: number;
  created: WhaleAlert[];
}> {
  const transfers = getWhaleTransfers();
  const subs = await getActiveSubscriptions();
  const created: WhaleAlert[] = [];

  for (const transfer of transfers) {
    const { fiatKrw } = await convertToKrw(
      transfer.coinSymbol,
      transfer.tokenAmount,
    );
    const matched = matchSubscriptions(transfer, fiatKrw, subs);
    for (const sub of matched) {
      if (await hasAlert(transfer.id, sub.id)) continue;
      const input = await buildAlertInput(transfer, sub, fiatKrw);
      if (!input) continue;
      const alert = await insertAlert(input);
      if (alert) created.push(alert);
    }
  }

  return { scanned: transfers.length, created };
}

/**
 * 신청 직후 보여줄 첫 미리보기 Alert 1건.
 * 구독 기준 금액 규모로 대표 이동을 가정해 만든다(항상 preview_only 성격).
 */
export async function createIntroAlert(
  sub: Subscription,
): Promise<WhaleAlert | null> {
  const introTransferId = `intro_${sub.id}`;
  if (await hasAlert(introTransferId, sub.id)) return null;
  const introTransfer: Transfer = {
    id: introTransferId,
    coinSymbol: sub.coinSymbol,
    tokenAmount: 0,
    direction: "exchange_inflow",
    fromLabel: "상위권 큰손 계좌",
    toLabel: "거래소",
    detectedAt: new Date().toISOString(),
  };
  const input = await buildAlertInput(introTransfer, sub, sub.thresholdKrw);
  if (!input) return null;
  return insertAlert(input);
}
