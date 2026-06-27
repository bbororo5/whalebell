"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell, StepIndicator } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCoin } from "@/lib/coins";
import { getThreshold } from "@/lib/thresholds";
import { generateSeniorMessage } from "@/lib/sms";
import { useSetupStore } from "@/lib/store";
import type { ImpactLevel } from "@/lib/types";

export default function PreviewPage() {
  const router = useRouter();
  const coinSymbol = useSetupStore((s) => s.coinSymbol);
  const thresholdId = useSetupStore((s) => s.thresholdId);
  const phone = useSetupStore((s) => s.phone);
  const verified = useSetupStore((s) => s.verified);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coinSymbol) router.replace("/setup/coin");
    else if (!thresholdId) router.replace("/setup/threshold");
    else if (!verified) router.replace("/setup/phone");
  }, [coinSymbol, thresholdId, verified, router]);

  const coin = coinSymbol ? getCoin(coinSymbol) : undefined;
  const threshold = thresholdId ? getThreshold(thresholdId) : undefined;

  const sms = useMemo(() => {
    if (!coin || !threshold) return "";
    const impactLevel: ImpactLevel =
      threshold.id === "basic" ? "보통" : "높음";
    return generateSeniorMessage({
      coin,
      fiatKrw: threshold.krw,
      impactLevel,
    });
  }, [coin, threshold]);

  if (!coin || !threshold) return null;

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          coinSymbol,
          thresholdId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "신청에 실패했어요. 다시 시도해주세요.");
        return;
      }
      router.push("/complete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <StepIndicator current={4} />

      <h1 className="text-3xl font-extrabold leading-snug">
        이런 문자를
        <br />
        받게 됩니다
      </h1>
      <p className="mt-4 text-xl leading-relaxed text-slate-600">
        {coin.name}에서 큰 이동이 생기면 아래와 같은 문자를 보내드려요.
      </p>

      <Card className="mt-6 border-orange-200 bg-orange-50">
        <pre className="whitespace-pre-wrap text-base leading-relaxed text-orange-900">
          {sms}
        </pre>
      </Card>

      {error && (
        <p className="mt-4 text-center text-lg font-semibold text-red-600">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <Button block disabled={loading} onClick={submit}>
          {loading ? "신청하는 중…" : "이 내용으로 신청하기"}
        </Button>
        <Button
          variant="ghost"
          block
          onClick={() => router.push("/setup/summary")}
        >
          다시 확인하기
        </Button>
      </div>
    </PageShell>
  );
}
