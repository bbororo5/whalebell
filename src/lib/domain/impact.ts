import type { ImpactLevel, Transfer } from "../types";

const LEVELS: ImpactLevel[] = ["낮음", "보통", "높음"];

function downgrade(level: ImpactLevel): ImpactLevel {
  const i = LEVELS.indexOf(level);
  return LEVELS[Math.max(0, i - 1)];
}

/**
 * [B-3 해석] 가격 흔들림 가능성 계산.
 * 근거: 금액이 클수록, 거래소로 들어갈수록(팔기 준비 신호) 가능성이 높다.
 */
export function computeImpact(transfer: Transfer, fiatKrw: number): ImpactLevel {
  let level: ImpactLevel;
  if (fiatKrw >= 500_000_000) level = "높음";
  else if (fiatKrw >= 100_000_000) level = "보통";
  else level = "낮음";

  // 거래소로 들어간 게 아니면 한 단계 하향(팔기 준비 신호가 약함)
  if (transfer.direction !== "exchange_inflow") {
    level = downgrade(level);
  }
  return level;
}
