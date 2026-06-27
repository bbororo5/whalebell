import type { ImpactLevel, Subscription, WhaleAlert } from "./types";
import { getCoin } from "./coins";
import { FALLBACK_PRICES_USD, FX_RATE } from "./domain/pricing";

/** HOME 계산에 쓰는 보조값들. 모두 순수 함수(클라이언트에서 사용 가능). */

const IMPACT_RANK: Record<ImpactLevel, number> = { 낮음: 0, 보통: 1, 높음: 2 };

/** 신청 직후 만든 첫 미리보기 알림의 transferId 접두사 */
const INTRO_PREFIX = "intro_";

/** 실제 감지된 알림만(첫 미리보기 합성 알림 제외) */
export function realAlerts(alerts: WhaleAlert[]): WhaleAlert[] {
  return alerts.filter((a) => !a.transferId.startsWith(INTRO_PREFIX));
}

function isSameDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

/** 오늘(로컬 기준) 감지된 알림만 */
export function todayAlerts(alerts: WhaleAlert[], now = new Date()): WhaleAlert[] {
  return alerts.filter((a) => isSameDay(a.detectedAt, now));
}

/** 구독 중인 코인의 알림만 */
export function subscribedAlerts(
  alerts: WhaleAlert[],
  subs: Subscription[],
): WhaleAlert[] {
  const set = new Set(subs.map((s) => s.coinSymbol.toUpperCase()));
  return alerts.filter((a) => set.has(a.coinSymbol.toUpperCase()));
}

export function highImpactCount(alerts: WhaleAlert[]): number {
  return alerts.filter((a) => a.impactLevel === "높음").length;
}

export function biggestTransfer(alerts: WhaleAlert[]): WhaleAlert | null {
  if (alerts.length === 0) return null;
  return alerts.reduce((max, a) => (a.fiatKrw > max.fiatKrw ? a : max));
}

export function exchangeInflowCount(alerts: WhaleAlert[]): number {
  return alerts.filter((a) => a.direction === "exchange_inflow").length;
}

/** 최신순 상위 n개 */
export function recentAlerts(alerts: WhaleAlert[], n = 3): WhaleAlert[] {
  return [...alerts]
    .sort(
      (a, b) =>
        new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
    )
    .slice(0, n);
}

export type HomeStatusKey = "calm" | "warning" | "watch" | "mild";

export interface HomeStatus {
  key: HomeStatusKey;
  title: string;
  tone: "calm" | "warning";
}

/** 오늘 상태 한 줄 요약. "위험/폭락/매도/세력" 같은 단어는 쓰지 않는다. */
export function homeStatus(alerts: WhaleAlert[]): HomeStatus {
  if (alerts.length === 0) {
    return { key: "calm", title: "오늘은 조용합니다", tone: "calm" };
  }
  if (highImpactCount(alerts) > 0) {
    return { key: "warning", title: "주의가 필요합니다", tone: "warning" };
  }
  if (alerts.some((a) => a.impactLevel === "보통")) {
    return { key: "watch", title: "살펴볼 움직임이 있습니다", tone: "warning" };
  }
  return { key: "mild", title: "큰 변화는 적습니다", tone: "calm" };
}

export interface CoinCardData {
  coinSymbol: string;
  coinName: string;
  priceKrw: number;
  thresholdKrw: number;
  todayCount: number;
  topImpact: ImpactLevel | null;
}

/** 구독 코인별 카드 데이터(현재가·기준·오늘 알림 수·최고 흔들림 가능성) */
/** 시세 맵이 없을 때 쓰는 fallback 원화 시세 */
function fallbackPriceKrw(symbol: string): number {
  return (FALLBACK_PRICES_USD[symbol.toUpperCase()] ?? 0) * FX_RATE;
}

export function coinCards(
  subs: Subscription[],
  alerts: WhaleAlert[],
  priceMap: Record<string, number> = {},
  now = new Date(),
): CoinCardData[] {
  const today = todayAlerts(alerts, now);
  return subs.map((sub) => {
    const coin = getCoin(sub.coinSymbol);
    const coinAlerts = today.filter(
      (a) => a.coinSymbol.toUpperCase() === sub.coinSymbol.toUpperCase(),
    );
    const topImpact = coinAlerts.reduce<ImpactLevel | null>((top, a) => {
      if (!top) return a.impactLevel;
      return IMPACT_RANK[a.impactLevel] > IMPACT_RANK[top]
        ? a.impactLevel
        : top;
    }, null);
    const sym = sub.coinSymbol.toUpperCase();
    return {
      coinSymbol: sub.coinSymbol,
      coinName: coin?.name ?? sub.coinSymbol,
      priceKrw: priceMap[sym] ?? fallbackPriceKrw(sym),
      thresholdKrw: sub.thresholdKrw,
      todayCount: coinAlerts.length,
      topImpact,
    };
  });
}

/** 미리보기 기준 알림: 가장 높은 흔들림 가능성 → 그중 최신 */
export function previewAlert(alerts: WhaleAlert[]): WhaleAlert | null {
  if (alerts.length === 0) return null;
  return [...alerts].sort((a, b) => {
    const r = IMPACT_RANK[b.impactLevel] - IMPACT_RANK[a.impactLevel];
    if (r !== 0) return r;
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  })[0];
}
