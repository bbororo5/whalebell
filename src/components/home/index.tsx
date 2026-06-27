import Link from "next/link";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CoinAvatar } from "@/components/coin-avatar";
import { getCoin } from "@/lib/coins";
import { cn, formatKrwApprox, formatPriceKrw, formatRelativeTime } from "@/lib/utils";
import type { ImpactLevel, WhaleAlert } from "@/lib/types";
import type { CoinCardData, HomeStatus } from "@/lib/home";

function impactTone(level: ImpactLevel): "warning" | "neutral" | "soon" {
  if (level === "높음") return "warning";
  if (level === "보통") return "neutral";
  return "soon";
}

function directionText(direction: WhaleAlert["direction"]): string {
  return direction === "exchange_inflow"
    ? "거래소로 옮겨졌습니다"
    : "다른 계좌로 옮겨졌습니다";
}

/* ── 1. 오늘의 상태 카드 ───────────────────────────── */

export function HomeStatusCard({
  status,
  todayCount,
  biggestKrw,
}: {
  status: HomeStatus;
  todayCount: number;
  biggestKrw: number | null;
}) {
  const warning = status.tone === "warning";
  return (
    <Card
      className={cn(
        "border-2",
        warning ? "border-orange-200 bg-orange-50" : "border-emerald-200 bg-emerald-50",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-3xl" aria-hidden>
          {warning ? "🔔" : "🌊"}
        </span>
        <h2
          className={cn(
            "text-2xl font-extrabold",
            warning ? "text-orange-800" : "text-emerald-800",
          )}
        >
          {status.title}
        </h2>
      </div>
      <p className="mt-4 text-xl leading-relaxed text-slate-700">
        {todayCount > 0
          ? `오늘 알림 받고 있는 코인에서 큰손 이동 ${todayCount}건이 감지되었습니다.`
          : "오늘은 알림 받는 코인에서 큰 이동이 감지되지 않았습니다."}
      </p>
      {biggestKrw !== null && (
        <p className="mt-2 text-xl leading-relaxed text-slate-700">
          가장 큰 이동은 <b>{formatKrwApprox(biggestKrw)}</b> 규모입니다. 실제로
          팔았다는 뜻은 아닙니다.
        </p>
      )}
    </Card>
  );
}

/* ── 2. 요약 숫자 카드 4개 ─────────────────────────── */

export function HomeSummaryCards({
  coinCount,
  todayCount,
  highCount,
  biggestKrw,
}: {
  coinCount: number;
  todayCount: number;
  highCount: number;
  biggestKrw: number | null;
}) {
  const items = [
    { label: "알림 받는 코인", value: `${coinCount}개`, highlight: false },
    { label: "오늘 큰 이동", value: `${todayCount}건`, highlight: false },
    { label: "주의 알림", value: `${highCount}건`, highlight: true },
    {
      label: "가장 큰 이동",
      value: biggestKrw !== null ? formatKrwApprox(biggestKrw) : "-",
      highlight: false,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className={cn(
            "rounded-2xl border-2 p-4 text-center",
            it.highlight
              ? "border-orange-200 bg-orange-50"
              : "border-border bg-white",
          )}
        >
          <p className="text-sm font-semibold text-muted">{it.label}</p>
          <p
            className={cn(
              "mt-1 text-2xl font-extrabold",
              it.highlight && "text-orange-700",
            )}
          >
            {it.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── 3. 내가 알림 받는 코인 카드 ───────────────────── */

export function SubscribedCoinCard({
  data,
  onDetail,
}: {
  data: CoinCardData;
  onDetail?: (symbol: string) => void;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <CoinAvatar symbol={data.coinSymbol} size="lg" />
        <div className="flex-1">
          <span className="text-2xl font-extrabold">{data.coinName}</span>{" "}
          <span className="text-lg font-bold text-muted">{data.coinSymbol}</span>
        </div>
        {data.topImpact ? (
          <Badge tone={impactTone(data.topImpact)}>{data.topImpact}</Badge>
        ) : (
          <Badge tone="soon">조용함</Badge>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-y-3 border-t-2 border-border pt-4 text-base">
        <Info label="현재가" value={formatPriceKrw(data.priceKrw)} />
        <Info label="알림 기준" value={`${formatKrwApprox(data.thresholdKrw)} 이상`} />
        <Info label="오늘 큰 이동" value={`${data.todayCount}건`} />
        <Info label="상태" value={data.topImpact ?? "조용함"} />
      </dl>

      <div className="mt-4 flex gap-3">
        <Button
          size="md"
          variant="outline"
          className="flex-1"
          onClick={() => onDetail?.(data.coinSymbol)}
        >
          자세히 보기
        </Button>
        <Link href="/manage" className="flex-1">
          <Button size="md" variant="ghost" block>
            알림 기준 바꾸기
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}

/* ── 4. 최근 큰손 이동 카드 ───────────────────────── */

export function RecentAlertCard({ alert }: { alert: WhaleAlert }) {
  return (
    <Link href={`/alerts/${alert.id}`}>
      <Card className="border-orange-200 transition-colors hover:border-orange-300">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xl font-extrabold text-orange-900">
            [주의] {coinNameOf(alert)} 큰손 이동
          </span>
          <span className="shrink-0 text-sm text-muted">
            {formatRelativeTime(alert.detectedAt)}
          </span>
        </div>
        <p className="mt-3 text-lg leading-relaxed text-slate-700">
          {formatKrwApprox(alert.fiatKrw)} 규모의 {coinNameOf(alert)}이{" "}
          {directionText(alert.direction)}.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-base font-bold text-muted">
            가격 흔들림 가능성
          </span>
          <Badge tone={impactTone(alert.impactLevel)}>{alert.impactLevel}</Badge>
        </div>
        <p className="mt-3 text-base text-slate-500">
          실제로 팔았다는 뜻은 아닙니다.
        </p>
        <span className="mt-4 inline-block text-base font-bold text-primary">
          자세히 보기 →
        </span>
      </Card>
    </Link>
  );
}

function coinNameOf(alert: WhaleAlert): string {
  return getCoin(alert.coinSymbol)?.name ?? alert.coinSymbol;
}

/* ── 5. 거래소로 들어간 이동 요약 카드 ─────────────── */

export function ExchangeInflowCard({ count }: { count: number }) {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <h3 className="text-xl font-extrabold text-orange-900">
        거래소로 들어간 큰 이동
      </h3>
      <p className="mt-2 text-lg font-bold text-slate-800">
        오늘 {count}건이 감지되었습니다.
      </p>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        거래소로 옮긴 코인은 팔기 위한 준비일 수 있습니다. 하지만 실제로 팔았다는
        뜻은 아닙니다.
      </p>
    </Card>
  );
}

/* ── 6. 문자 미리보기 ─────────────────────────────── */

export function HomeMessagePreview({ alert }: { alert: WhaleAlert }) {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <pre className="whitespace-pre-wrap text-base leading-relaxed text-orange-900">
        {alert.shortBody}
      </pre>
      <Link href={`/message-preview?id=${alert.id}`}>
        <Button variant="secondary" block className="mt-4" size="md">
          문자 전체 보기
        </Button>
      </Link>
    </Card>
  );
}

/* ── 7. 하단 안내 카드 ────────────────────────────── */

export function DisclaimerBox() {
  return (
    <Card className="border-border bg-slate-50">
      <p className="text-base leading-relaxed text-slate-600">
        고래벨은 투자 추천 서비스가 아닙니다. 큰손 계좌의 큰 이동을 쉬운 말로
        알려드리는 정보 알림 서비스입니다.
      </p>
      <p className="mt-2 text-base leading-relaxed text-slate-600">
        알림을 보고 바로 사고팔기보다 추가 움직임을 함께 확인하세요.
      </p>
      <p className="mt-3 text-base font-bold text-slate-500">
        이 알림은 투자 권유가 아닙니다.
      </p>
    </Card>
  );
}
