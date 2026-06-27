import type { Coin, ImpactLevel, Transfer, TransferDirection } from "../types";
import { formatKrwApprox, formatRelativeTime } from "../utils";

/** 시니어 해설 3축: 규모 → 방향 → 의미. LLM·템플릿 공통 컨텍스트. */
export interface AlertExplainContext {
  coin: Pick<Coin, "name" | "symbol">;
  transfer: Pick<
    Transfer,
    "tokenAmount" | "direction" | "fromLabel" | "toLabel" | "detectedAt"
  >;
  fiatKrw: number;
  priceSource: "live" | "fallback";
  /** 시총 대비 % (미확인이면 null) */
  marketCapPct: number | null;
  /** 코드가 계산한 참고 신호. LLM이 그대로 복붙하지 말고 맥락으로 활용 */
  impactHint: ImpactLevel;
}

export function directionSeniorLabel(direction: TransferDirection): string {
  switch (direction) {
    case "exchange_inflow":
      return "거래소로 들어감";
    case "exchange_outflow":
      return "거래소에서 나감";
    default:
      return "계좌 간 이동";
  }
}

export function directionMeaningHint(direction: TransferDirection): string {
  switch (direction) {
    case "exchange_inflow":
      return "거래소로 옮긴 코인은 팔 준비일 수 있지만, 아직 판 것은 아닙니다.";
    case "exchange_outflow":
      return "거래소 밖으로 옮긴 것은 당장 팔 신호로 보기 어렵습니다.";
    default:
      return "계좌만 옮긴 경우, 가격에 바로 영향이 없을 수 있습니다.";
  }
}

export function formatMarketCapPct(pct: number | null): string {
  if (pct === null || pct <= 0) return "확인되지 않음";
  if (pct >= 1) return `약 ${pct.toFixed(1)}%`;
  if (pct >= 0.01) return `약 ${pct.toFixed(2)}%`;
  return `약 ${pct.toFixed(3)}%`;
}

function formatTokenAmount(amount: number, symbol: string): string {
  if (amount >= 1_000_000) {
    return `${Math.round(amount).toLocaleString("ko-KR")} ${symbol}`;
  }
  if (amount >= 1) {
    const rounded = Math.round(amount * 100) / 100;
    return `${rounded.toLocaleString("ko-KR")} ${symbol}`;
  }
  return `${amount} ${symbol}`;
}

/** Agent Platform에 넘길 structured input JSON */
export function buildAgentPayload(ctx: AlertExplainContext): string {
  const { coin, transfer, fiatKrw, priceSource, marketCapPct, impactHint } =
    ctx;

  return JSON.stringify(
    {
      task: "큰손 코인 이동을 시니어 친화 문자로 해설",
      axes: [
        "규모: 원화 금액 + (가능하면) 시총 대비 %",
        "방향: 어디로 옮겨졌는지",
        "의미: 무엇을 의미할 수 있는지(단정 금지)",
      ],
      facts: {
        coinName: coin.name,
        symbol: coin.symbol,
        tokenAmount: formatTokenAmount(transfer.tokenAmount, coin.symbol),
        fiatKrwApprox: formatKrwApprox(fiatKrw),
        detectedAtRelative: formatRelativeTime(transfer.detectedAt),
        fromLabel: transfer.fromLabel,
        toLabel: transfer.toLabel,
        priceSource,
      },
      scale: {
        marketCapPctApprox: formatMarketCapPct(marketCapPct),
        impactHint,
      },
      direction: {
        code: transfer.direction,
        seniorLabel: directionSeniorLabel(transfer.direction),
        meaningHint: directionMeaningHint(transfer.direction),
      },
    },
    null,
    0,
  );
}
