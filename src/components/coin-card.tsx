import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CoinAvatar } from "@/components/coin-avatar";
import type { Coin } from "@/lib/types";
import type { CoinSubscriptionState } from "@/lib/subscriptions-client";

export function CoinCard({
  coin,
  subscriptionState = "none",
  onSelect,
  onEnable,
  onDisable,
  selected,
}: {
  coin: Coin;
  /** none=미구독, active=알림 받는 중, paused=꺼둔 구독 있음 */
  subscriptionState?: CoinSubscriptionState;
  onSelect?: (symbol: string) => void;
  /** paused → active (기존 기준 유지) */
  onEnable?: (symbol: string) => void;
  /** active → paused */
  onDisable?: (symbol: string) => void;
  selected?: boolean;
}) {
  const available = coin.status === "available";

  const cardClass =
    subscriptionState === "active"
      ? "border-emerald-300 bg-emerald-50/40 ring-2 ring-emerald-200"
      : subscriptionState === "paused"
        ? "border-slate-300 bg-slate-50 ring-2 ring-slate-200"
        : selected
          ? "border-primary ring-4 ring-primary/20"
          : available
            ? "border-border"
            : "border-border bg-slate-50";

  const badge =
    subscriptionState === "active" ? (
      <Badge tone="available">알림 받는 중</Badge>
    ) : subscriptionState === "paused" ? (
      <Badge tone="soon">알림 꺼짐</Badge>
    ) : available ? (
      <Badge tone="available">알림 가능</Badge>
    ) : (
      <Badge tone="soon">준비 중</Badge>
    );

  return (
    <Card className={cardClass}>
      <div className="flex items-center gap-4">
        <CoinAvatar symbol={coin.symbol} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{coin.name}</span>
            <span className="text-lg font-bold text-muted">{coin.symbol}</span>
          </div>
          <p className="mt-1 text-base text-slate-600">{coin.tagline}</p>
        </div>
        {badge}
      </div>

      {available ? (
        subscriptionState === "active" ? (
          <Button
            block
            className="mt-4"
            variant="outline"
            onClick={() => onDisable?.(coin.symbol)}
          >
            알림 끄기
          </Button>
        ) : subscriptionState === "paused" ? (
          <div className="mt-4 flex flex-col gap-2">
            <Button block onClick={() => onEnable?.(coin.symbol)}>
              다시 알림 받기
            </Button>
            <Button
              block
              variant="secondary"
              onClick={() => onSelect?.(coin.symbol)}
            >
              기준 바꿔서 다시 받기
            </Button>
          </div>
        ) : (
          <Button
            block
            className="mt-4"
            variant={selected ? "primary" : "secondary"}
            onClick={() => onSelect?.(coin.symbol)}
          >
            {selected ? "선택됨" : "선택하기"}
          </Button>
        )
      ) : (
        <div className="mt-4 rounded-2xl bg-slate-100 py-3 text-center text-base font-semibold text-slate-500">
          준비 중이에요
        </div>
      )}
    </Card>
  );
}
