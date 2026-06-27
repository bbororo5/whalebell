import type { Subscription, Transfer, WhaleAlert } from "../types";
import { getCoin } from "../coins";
import { convertToKrw } from "../domain/pricing";
import { computeImpact } from "../domain/impact";
import { matchSubscriptions } from "../domain/matching";
import { dispatch } from "../domain/dispatch";
import { generateAlertCopy } from "./ai";
import {
  getActiveSubscriptions,
  hasAlert,
  insertAlert,
  type AlertInput,
} from "./store";

/**
 * 단일 이동(Transfer)을 받아 전체 파이프라인을 실행한다.
 * 환산 → 해석 → 매칭 → (AI 멘트 생성) → 발송 → 적재.
 * 실제 웹훅·모의 트리거·mock 감지가 모두 이 함수를 공유한다.
 */
export async function ingestTransfer(
  transfer: Transfer,
  activeSubs?: Subscription[],
): Promise<WhaleAlert[]> {
  const subs = activeSubs ?? (await getActiveSubscriptions());
  const { fiatKrw } = await convertToKrw(
    transfer.coinSymbol,
    transfer.tokenAmount,
  );
  const matched = matchSubscriptions(transfer, fiatKrw, subs);
  if (matched.length === 0) return [];

  const coin = getCoin(transfer.coinSymbol);
  if (!coin) return [];
  const impactLevel = computeImpact(transfer, fiatKrw);

  // AI 멘트 생성(에이전트 → 모델 → 템플릿 폴백). 매칭된 구독이 있을 때만 호출.
  const copy = await generateAlertCopy({
    coin,
    fiatKrw,
    impactLevel,
    direction: transfer.direction,
  });

  const created: WhaleAlert[] = [];
  for (const sub of matched) {
    if (await hasAlert(transfer.id, sub.id)) continue;
    const delivery = await dispatch(sub.phone, copy.message);
    const input: AlertInput = {
      subscriptionId: sub.id,
      transferId: transfer.id,
      phone: sub.phone,
      coinSymbol: sub.coinSymbol,
      fiatKrw,
      tokenAmount: transfer.tokenAmount,
      direction: transfer.direction,
      impactLevel,
      message: copy.message,
      shortBody: copy.shortBody,
      delivery,
      detectedAt: transfer.detectedAt,
    };
    const alert = await insertAlert(input);
    if (alert) created.push(alert);
  }
  return created;
}

/** 여러 이동을 순차 처리(활성 구독 1회만 조회). */
export async function ingestTransfers(
  transfers: Transfer[],
): Promise<{ scanned: number; created: WhaleAlert[] }> {
  const subs = await getActiveSubscriptions();
  const created: WhaleAlert[] = [];
  for (const t of transfers) {
    const c = await ingestTransfer(t, subs);
    created.push(...c);
  }
  return { scanned: transfers.length, created };
}
