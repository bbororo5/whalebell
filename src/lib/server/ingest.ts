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

/** 코인별로 가장 큰(수량) 이동 1건만 남긴다. 문자 스팸 방지 + AI 호출 수 제한. */
function largestPerCoin(transfers: Transfer[]): Transfer[] {
  const best = new Map<string, Transfer>();
  for (const t of transfers) {
    const key = t.coinSymbol.toUpperCase();
    const cur = best.get(key);
    if (!cur || t.tokenAmount > cur.tokenAmount) best.set(key, t);
  }
  return [...best.values()];
}

/**
 * 여러 이동을 처리(활성 구독 1회만 조회).
 * 한 사이클에서 코인당 1건(최대 이동)만 처리해 발송 폭주와 AI 호출 누적을 막는다.
 * 서버리스 함수 시간 제한을 고려한 설계.
 */
export async function ingestTransfers(
  transfers: Transfer[],
): Promise<{ scanned: number; created: WhaleAlert[] }> {
  const subs = await getActiveSubscriptions();
  const picked = largestPerCoin(transfers);
  const created: WhaleAlert[] = [];
  for (const t of picked) {
    const c = await ingestTransfer(t, subs);
    created.push(...c);
  }
  return { scanned: transfers.length, created };
}
