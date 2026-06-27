"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CoinAvatar } from "@/components/coin-avatar";
import { getCoin } from "@/lib/coins";
import { getThreshold } from "@/lib/thresholds";
import { formatKrwApprox, formatPhone } from "@/lib/utils";
import { useSetupStore } from "@/lib/store";

export default function CompletePage() {
  const router = useRouter();
  const coinSymbol = useSetupStore((s) => s.coinSymbol);
  const thresholdId = useSetupStore((s) => s.thresholdId);
  const phone = useSetupStore((s) => s.phone);
  const reset = useSetupStore((s) => s.reset);

  useEffect(() => {
    if (!coinSymbol || !thresholdId) router.replace("/setup/coin");
  }, [coinSymbol, thresholdId, router]);

  const coin = coinSymbol ? getCoin(coinSymbol) : undefined;
  const threshold = thresholdId ? getThreshold(thresholdId) : undefined;
  if (!coin || !threshold) return null;

  function addAnother() {
    // 번호는 유지하고 코인/기준만 비운다. 코인 선택 화면에서 기존 구독을 보여주려면 번호도 저장.
    sessionStorage.setItem("whalebell-phone", phone);
    useSetupStore.setState({ coinSymbol: null, thresholdId: null });
    router.push("/setup/coin");
  }

  function goMyAlerts() {
    sessionStorage.setItem("whalebell-phone", phone);
    reset();
    router.push("/manage");
  }

  return (
    <PageShell>
      <section className="flex flex-col items-center pt-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
          ✓
        </div>
        <h1 className="mt-5 text-3xl font-extrabold">
          알림 신청이
          <br />
          완료되었습니다
        </h1>
      </section>

      <Card className="mt-8">
        <Row label="받을 코인">
          <div className="flex items-center gap-3">
            <CoinAvatar symbol={coin.symbol} />
            <span className="text-2xl font-extrabold">
              {coin.name} <span className="text-muted">{coin.symbol}</span>
            </span>
          </div>
        </Row>
        <Row label="알림 기준">
          <span className="text-xl font-bold">
            {formatKrwApprox(threshold.krw)} 이상 큰 이동
          </span>
        </Row>
        <Row label="받을 번호">
          <span className="text-xl font-bold">{formatPhone(phone)}</span>
        </Row>
        <Row label="알림 방식" last>
          <span className="text-xl font-bold">문자</span>
        </Row>
      </Card>

      <div className="mt-8 flex flex-col gap-3">
        <Button block onClick={goMyAlerts}>
          내 알림 확인하기
        </Button>
        <Button variant="secondary" block onClick={addAnother}>
          다른 코인도 추가하기
        </Button>
      </div>
    </PageShell>
  );
}

function Row({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "mb-5 border-b-2 border-border pb-5"}>
      <p className="mb-2 text-base font-bold text-muted">{label}</p>
      {children}
    </div>
  );
}
