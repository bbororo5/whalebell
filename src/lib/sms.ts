import type { AlertExplainContext } from "./domain/alert-context";
import {
  directionMeaningHint,
  directionSeniorLabel,
  formatMarketCapPct,
} from "./domain/alert-context";
import { formatKrwApprox, formatRelativeTime } from "./utils";

export type SmsParams = AlertExplainContext;

function formatTokenLine(amount: number, symbol: string): string {
  const qty =
    amount >= 1
      ? `${Math.round(amount * 100) / 100}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      : String(amount);
  return `${qty} ${symbol}`;
}

/**
 * 큰손 이동 알림 문자 생성(템플릿 폴백).
 * 시니어 해설 3축: 규모 → 방향 → 의미.
 */
export function generateSeniorMessage(ctx: SmsParams): string {
  const { coin, transfer, fiatKrw, marketCapPct, impactHint } = ctx;
  const krw = formatKrwApprox(fiatKrw);
  const when = formatRelativeTime(transfer.detectedAt);
  const scalePct = formatMarketCapPct(marketCapPct);
  const dirLabel = directionSeniorLabel(transfer.direction);
  const meaning = directionMeaningHint(transfer.direction);
  const qty = formatTokenLine(transfer.tokenAmount, coin.symbol);

  const scaleExtra =
    scalePct !== "확인되지 않음"
      ? `\n\n이번 이동은 ${coin.name} 전체 가치의 ${scalePct}에 해당하는 규모로 보입니다.`
      : "";

  return `[주의] ${coin.name}(${coin.symbol}) 큰손 이동 알림

이 계좌는 ${coin.name}을 많이 보유한 상위권 큰손 계좌로 분류됩니다.
다만 실제 주인이 누구인지는 확인되지 않았습니다.

이번 이동은 가격 흔들림 가능성이 "${impactLevel}"으로 보입니다.

이유는 다음과 같습니다.

1. 이동한 금액이 큽니다.
2. 코인이 거래소로 들어갔습니다.
3. 거래소로 옮긴 코인은 팔기 위한 준비일 수 있습니다.

하지만 아직 실제로 팔았다는 뜻은 아닙니다.
놀라서 바로 팔거나 사지 마세요.

이 알림은 투자 권유가 아닙니다.`;
}

/**
 * HOME·미리보기용 짧은 본문.
 * 안전 문구는 유지하되, 시니어가 한눈에 보도록 핵심만 줄인다.
 * (UI 원칙: "매도" 대신 "팔다", "위험" 대신 "주의")
 */
export function generateShortMessage({
  coin,
  fiatKrw,
  impactLevel,
}: SmsParams): string {
  const krw = formatKrwApprox(fiatKrw);
  return `[주의] ${coin.name} 큰손 이동

${krw} 규모의 ${coin.name}(${coin.symbol})이 거래소로 옮겨졌습니다.

가격 흔들림 가능성: ${impactLevel}

실제로 팔았다는 뜻은 아닙니다. 바로 사고팔지 말고 추가 움직임을 함께 확인하세요.`;
}

/** 랜딩 페이지에 보여줄 범용 문자 예시 */
export const SAMPLE_SMS = `[주의] 선택한 코인 큰손 이동 알림

회원님이 선택한 코인에서
큰손 계좌의 큰 이동이 감지되었습니다.

큰 금액의 코인이 거래소로 옮겨졌습니다.
팔기 위한 준비일 수 있지만,
실제로 팔았다는 뜻은 아닙니다.

놀라서 바로 사고팔지 마세요.
이 알림은 투자 권유가 아닙니다.`;
