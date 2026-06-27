"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageShell, StepIndicator } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CoinAvatar } from "@/components/coin-avatar";
import { getCoin } from "@/lib/coins";
import { getThreshold } from "@/lib/thresholds";
import { formatKrwApprox } from "@/lib/utils";
import { useSetupStore } from "@/lib/store";

export default function SummaryPage() {
  const router = useRouter();
  const coinSymbol = useSetupStore((s) => s.coinSymbol);
  const thresholdId = useSetupStore((s) => s.thresholdId);

  useEffect(() => {
    if (!coinSymbol) router.replace("/setup/coin");
    else if (!thresholdId) router.replace("/setup/threshold");
  }, [coinSymbol, thresholdId, router]);

  const coin = coinSymbol ? getCoin(coinSymbol) : undefined;
  const threshold = thresholdId ? getThreshold(thresholdId) : undefined;
  if (!coin || !threshold) return null;

  return (
    <PageShell>
      <StepIndicator current={2} />

      <h1 className="text-3xl font-extrabold leading-snug">
        선택한 알림을
        <br />
        확인해주세요
      </h1>

      <Card className="mt-8">
        <SummaryRow label="선택한 코인">
          <div className="flex items-center gap-3">
            <CoinAvatar symbol={coin.symbol} />
            <span className="text-2xl font-extrabold">
              {coin.name} <span className="text-muted">{coin.symbol}</span>
            </span>
          </div>
        </SummaryRow>

        <SummaryRow label="알림 기준">
          <span className="text-xl font-bold">
            {formatKrwApprox(threshold.krw)} 이상 큰 이동
          </span>
        </SummaryRow>

        <SummaryRow label="알림 내용" last>
          <span className="text-lg leading-relaxed text-slate-600">
            큰손 계좌가 거래소로 큰 금액을 옮기면 문자로 알려드려요.
          </span>
        </SummaryRow>
      </Card>

      <div className="mt-8 flex flex-col gap-3">
        <Button block onClick={() => router.push("/setup/phone")}>
          맞아요, 계속할게요
        </Button>
        <Button
          variant="ghost"
          block
          onClick={() => router.push("/setup/coin")}
        >
          다시 선택하기
        </Button>
      </div>
    </PageShell>
  );
}

function SummaryRow({
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
