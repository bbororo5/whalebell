"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CoinAvatar } from "@/components/coin-avatar";
import { PhonePrompt, useStoredPhone } from "@/components/phone-gate";
import { getCoin } from "@/lib/coins";
import { getThreshold, THRESHOLDS } from "@/lib/thresholds";
import { formatKrwApprox } from "@/lib/utils";
import { fetchSubscriptions, patchSubscription } from "@/lib/subscriptions-client";
import type { Subscription } from "@/lib/types";

export default function ManagePage() {
  const { phone, ready, setPhone } = useStoredPhone();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      setSubs(await fetchSubscriptions(p));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (phone) load(phone);
  }, [phone, load]);

  async function patch(
    id: string,
    body: { active?: boolean; thresholdId?: string },
  ) {
    await patchSubscription(id, body);
    if (phone) load(phone);
  }

  if (!ready) return null;
  if (!phone) return <PhonePrompt onSubmit={setPhone} />;

  return (
    <PageShell>
      <h1 className="text-3xl font-extrabold">내가 받고 있는 알림</h1>

      {loading && subs.length === 0 ? (
        <p className="mt-8 text-lg text-muted">불러오는 중…</p>
      ) : subs.length === 0 ? (
        <Card className="mt-8 text-center">
          <p className="text-lg text-slate-600">아직 신청한 알림이 없어요.</p>
          <Link href="/setup/coin">
            <Button block className="mt-4">
              코인 알림 신청하기
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {subs.map((sub) => {
            const coin = getCoin(sub.coinSymbol);
            const threshold = getThreshold(sub.thresholdId);
            if (!coin || !threshold) return null;
            return (
              <Card key={sub.id}>
                <div className="flex items-center gap-3">
                  <CoinAvatar symbol={coin.symbol} size="lg" />
                  <div className="flex-1">
                    <span className="text-2xl font-extrabold">{coin.name}</span>{" "}
                    <span className="text-lg font-bold text-muted">
                      {coin.symbol}
                    </span>
                  </div>
                  <Badge tone={sub.active ? "available" : "soon"}>
                    {sub.active ? "알림 받는 중" : "알림 꺼짐"}
                  </Badge>
                </div>

                <div className="mt-4 border-t-2 border-border pt-4">
                  <p className="text-base font-bold text-muted">알림 기준</p>
                  <p className="text-xl font-bold">
                    {formatKrwApprox(threshold.krw)} 이상 큰 이동
                  </p>
                </div>

                {editing === sub.id ? (
                  <div className="mt-4 flex flex-col gap-2">
                    {THRESHOLDS.map((t) => (
                      <Button
                        key={t.id}
                        size="md"
                        variant={
                          t.id === sub.thresholdId ? "primary" : "outline"
                        }
                        block
                        onClick={async () => {
                          await patch(sub.id, { thresholdId: t.id });
                          setEditing(null);
                        }}
                      >
                        {formatKrwApprox(t.krw)} 이상
                      </Button>
                    ))}
                    <Button
                      size="md"
                      variant="ghost"
                      block
                      onClick={() => setEditing(null)}
                    >
                      닫기
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-3">
                    <Button
                      size="md"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditing(sub.id)}
                    >
                      기준 바꾸기
                    </Button>
                    <Button
                      size="md"
                      variant={sub.active ? "outline" : "primary"}
                      className="flex-1"
                      onClick={() =>
                        patch(sub.id, { active: sub.active ? false : true })
                      }
                    >
                      {sub.active ? "알림 끄기" : "다시 알림 받기"}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Link href="/setup/coin">
        <Button variant="secondary" block className="mt-6">
          코인 추가하기
        </Button>
      </Link>
    </PageShell>
  );
}
