"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CoinAvatar } from "@/components/coin-avatar";
import { getCoin } from "@/lib/coins";
import { formatKrwApprox } from "@/lib/utils";
import type { WhaleAlert } from "@/lib/types";

export default function MessagePreviewPage() {
  return (
    <Suspense fallback={null}>
      <MessagePreviewInner />
    </Suspense>
  );
}

function MessagePreviewInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [alert, setAlert] = useState<WhaleAlert | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/alerts/${id}`)
      .then((r) => r.json())
      .then((d) => (d.ok ? setAlert(d.alert) : setError(true)))
      .catch(() => setError(true));
  }, [id]);

  if (!id || error) {
    return (
      <PageShell>
        <Card className="mt-8 text-center">
          <p className="text-lg text-slate-600">문자를 찾을 수 없어요.</p>
          <Button block className="mt-4" onClick={() => router.push("/dashboard")}>
            홈으로 가기
          </Button>
        </Card>
      </PageShell>
    );
  }

  if (!alert) {
    return (
      <PageShell>
        <p className="mt-8 text-lg text-muted">불러오는 중…</p>
      </PageShell>
    );
  }

  const coin = getCoin(alert.coinSymbol);

  return (
    <PageShell>
      <h1 className="text-3xl font-extrabold">실제로 받게 될 문자</h1>
      <p className="mt-3 text-lg text-slate-600">
        선택한 코인에서 큰 이동이 생기면 이 문자가 그대로 발송됩니다.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <CoinAvatar symbol={alert.coinSymbol} size="lg" />
        <div>
          <p className="text-xl font-extrabold">
            {coin?.name ?? alert.coinSymbol}{" "}
            <span className="text-muted">{alert.coinSymbol}</span>
          </p>
          <p className="text-base text-slate-600">
            {formatKrwApprox(alert.fiatKrw)} 규모 · 흔들림 가능성{" "}
            {alert.impactLevel}
          </p>
        </div>
      </div>

      <Card className="mt-6 border-orange-200 bg-orange-50">
        <pre className="whitespace-pre-wrap text-base leading-relaxed text-orange-900">
          {alert.message}
        </pre>
      </Card>

      {alert.delivery === "preview_only" && (
        <p className="mt-3 text-base text-slate-500">
          (데모: 실제 문자 발송 없이 미리보기로만 보여드려요)
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <Button block onClick={() => router.push(`/alerts/${alert.id}`)}>
          이 알림 자세히 보기
        </Button>
        <Button variant="secondary" block onClick={() => router.push("/dashboard")}>
          홈으로 돌아가기
        </Button>
      </div>
    </PageShell>
  );
}
