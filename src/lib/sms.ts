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

${when}, ${transfer.fromLabel}에서
${coin.name} ${qty}(현재 시세로 ${krw})이
${transfer.toLabel}로 옮겨졌습니다.${scaleExtra}

이동 방향: ${dirLabel}
${meaning}

가격 흔들림 가능성 참고: ${impactHint}
(금액 크기와 이동 방향을 함께 본 참고 수준입니다.)

이 계좌의 주인이 누구인지는 확인되지 않았습니다.

놀라서 바로 팔거나 사지 마세요. 추가 움직임을 함께 확인하세요.

이 알림은 투자 권유가 아닙니다.`;
}

/** HOME·미리보기용 짧은 본문 — 요약이어도 3축은 유지 */
export function generateShortMessage(ctx: SmsParams): string {
  const { coin, transfer, fiatKrw, marketCapPct } = ctx;
  const krw = formatKrwApprox(fiatKrw);
  const when = formatRelativeTime(transfer.detectedAt);
  const scalePct = formatMarketCapPct(marketCapPct);
  const qty = formatTokenLine(transfer.tokenAmount, coin.symbol);
  const scaleLine =
    scalePct !== "확인되지 않음"
      ? `\n\n${coin.name} 전체 가치의 ${scalePct} 규모입니다.`
      : "";

  return `[주의] ${coin.name} 큰손 이동

${krw}(${qty})이 ${transfer.toLabel}로 옮겨졌습니다(${when}).${scaleLine}

${directionMeaningHint(transfer.direction)}

바로 사고팔지 말고 추가 움직임을 함께 확인하세요.`;
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

/** setup/preview 등 간단 호출용(풀 컨텍스트 없을 때) */
export function generateSeniorMessageSimple(p: {
  coin: SmsParams["coin"];
  fiatKrw: number;
  impactLevel: SmsParams["impactHint"];
}): string {
  return generateSeniorMessage({
    coin: p.coin,
    transfer: {
      tokenAmount: 0,
      direction: "exchange_inflow",
      fromLabel: "많은 양을 보유한 큰손 계좌",
      toLabel: "거래소",
      detectedAt: new Date().toISOString(),
    },
    fiatKrw: p.fiatKrw,
    priceSource: "fallback",
    marketCapPct: null,
    impactHint: p.impactLevel,
  });
}
