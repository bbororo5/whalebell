"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PhonePrompt, useStoredPhone } from "@/components/phone-gate";
import {
  DisclaimerBox,
  ExchangeInflowCard,
  HomeMessagePreview,
  HomeStatusCard,
  HomeSummaryCards,
  RecentAlertCard,
  SubscribedCoinCard,
} from "@/components/home";
import {
  biggestTransfer,
  coinCards,
  exchangeInflowCount,
  highImpactCount,
  homeStatus,
  previewAlert,
  realAlerts,
  recentAlerts,
  subscribedAlerts,
  todayAlerts,
} from "@/lib/home";
import { formatRelativeTime } from "@/lib/utils";
import type { Subscription, WhaleAlert } from "@/lib/types";

export default function HomePage() {
  const { phone, ready, setPhone } = useStoredPhone();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [alerts, setAlerts] = useState<WhaleAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [detailCoin, setDetailCoin] = useState<string | null>(null);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      // HOME 진입 시 루프 B를 1회 돌려 항상 최신 상태로 보이게 한다(멱등).
      await fetch("/api/detect", { method: "POST" }).catch(() => {});
      const [subRes, alertRes] = await Promise.all([
        fetch(`/api/subscriptions?phone=${encodeURIComponent(p)}`),
        fetch(`/api/alerts?phone=${encodeURIComponent(p)}`),
      ]);
      const subData = await subRes.json();
      const alertData = await alertRes.json();
      const loadedSubs: Subscription[] = subData.subscriptions ?? [];
      setSubs(loadedSubs);
      setAlerts(alertData.alerts ?? []);
      setCheckedAt(new Date().toISOString());

      // 실시간 시세(CoinGecko, 실패 시 fallback) 조회
      const symbols = [...new Set(loadedSubs.map((s) => s.coinSymbol))];
      if (symbols.length > 0) {
        fetch(`/api/prices?symbols=${symbols.join(",")}`)
          .then((r) => r.json())
          .then((d) => setPriceMap(d.prices ?? {}))
          .catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 저장된 번호가 확인되면 그 번호의 알림/구독을 불러온다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (phone) load(phone);
  }, [phone, load]);

  const activeSubs = useMemo(() => subs.filter((s) => s.active), [subs]);
  // 첫 미리보기(합성) 알림은 통계에서 제외하고, 실제 감지분만 센다.
  const real = useMemo(
    () => realAlerts(subscribedAlerts(alerts, activeSubs)),
    [alerts, activeSubs],
  );
  const today = useMemo(() => todayAlerts(real), [real]);
  const status = useMemo(() => homeStatus(today), [today]);
  const biggest = useMemo(() => biggestTransfer(today), [today]);
  const cards = useMemo(
    () => coinCards(activeSubs, real, priceMap),
    [activeSubs, real, priceMap],
  );
  const recent = useMemo(() => {
    const base = detailCoin
      ? today.filter((a) => a.coinSymbol === detailCoin)
      : today;
    return recentAlerts(base, detailCoin ? 10 : 3);
  }, [today, detailCoin]);
  // 미리보기는 실제 알림 우선, 없으면 첫 미리보기 알림으로 폴백.
  const preview = useMemo(() => {
    if (today.length > 0) return previewAlert(today);
    return previewAlert(subscribedAlerts(alerts, activeSubs));
  }, [today, alerts, activeSubs]);

  if (!ready) return null;
  if (!phone) return <PhonePrompt onSubmit={setPhone} />;

  return (
    <PageShell>
      {/* 1. 인사 영역 */}
      <header className="pb-2">
        <h1 className="text-3xl font-extrabold">내 코인 큰손 알림</h1>
        <p className="mt-2 text-lg text-slate-600">
          알림 받고 있는 코인의 큰손 이동을 쉽게 확인해보세요.
        </p>
        <p className="mt-1 text-sm text-muted">
          마지막 확인: {checkedAt ? formatRelativeTime(checkedAt) : "확인 중…"}
        </p>
      </header>

      {activeSubs.length === 0 ? (
        <Card className="mt-6 text-center">
          <p className="text-lg text-slate-600">
            아직 신청한 코인이 없어요. 코인을 선택하면 오늘의 큰손 이동을
            보여드려요.
          </p>
          <Link href="/setup/coin">
            <Button block className="mt-4">
              코인 알림 신청하기
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          {/* 2. 오늘의 상태 */}
          <HomeStatusCard
            status={status}
            todayCount={today.length}
            biggestKrw={biggest?.fiatKrw ?? null}
          />

          {/* 3. 요약 숫자 4개 */}
          <HomeSummaryCards
            coinCount={activeSubs.length}
            todayCount={today.length}
            highCount={highImpactCount(today)}
            biggestKrw={biggest?.fiatKrw ?? null}
          />

          {/* 4. 내가 알림 받는 코인 */}
          <section>
            <h2 className="mb-3 text-2xl font-extrabold">내가 알림 받는 코인</h2>
            <div className="flex flex-col gap-4">
              {cards.map((c) => (
                <SubscribedCoinCard
                  key={c.coinSymbol}
                  data={c}
                  onDetail={setDetailCoin}
                />
              ))}
            </div>
          </section>

          {/* 5. 오늘 감지된 큰손 이동 */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold">
                오늘 감지된 큰손 이동
              </h2>
              {detailCoin && (
                <button
                  onClick={() => setDetailCoin(null)}
                  className="text-base font-bold text-primary underline underline-offset-4"
                >
                  전체 보기
                </button>
              )}
            </div>
            {recent.length === 0 ? (
              <Card className="text-center text-lg text-slate-600">
                {loading
                  ? "불러오는 중…"
                  : "오늘은 큰 이동이 없어요. 큰손이 움직이면 문자로 알려드릴게요."}
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {recent.map((a) => (
                  <RecentAlertCard key={a.id} alert={a} />
                ))}
              </div>
            )}
          </section>

          {/* 6. 거래소로 들어간 이동 요약 */}
          {today.length > 0 && (
            <ExchangeInflowCard count={exchangeInflowCount(today)} />
          )}

          {/* 7. 문자 미리보기 */}
          {preview && (
            <section>
              <h2 className="mb-3 text-2xl font-extrabold">
                실제로 받게 될 문자
              </h2>
              <HomeMessagePreview alert={preview} />
            </section>
          )}

          <Link href="/manage">
            <Button variant="secondary" block>
              내 알림 관리하기
            </Button>
          </Link>

          {/* 8. 하단 안내 */}
          <DisclaimerBox />
        </div>
      )}
    </PageShell>
  );
}
