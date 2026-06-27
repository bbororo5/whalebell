import type { Subscription, Transfer } from "../types";

/**
 * [B-4 매칭] 이동 한 건을 활성 구독들과 대조한다.
 * 조건: 같은 코인 AND 환산 원화 규모 >= 구독 기준 AND 활성 상태.
 */
export function matchSubscriptions(
  transfer: Transfer,
  fiatKrw: number,
  subs: Subscription[],
): Subscription[] {
  return subs.filter(
    (s) =>
      s.active &&
      s.coinSymbol.toUpperCase() === transfer.coinSymbol.toUpperCase() &&
      fiatKrw >= s.thresholdKrw,
  );
}
