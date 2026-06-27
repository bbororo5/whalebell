"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CoinAvatar } from "@/components/coin-avatar";
import { getCoin } from "@/lib/coins";
import { formatKrwApprox } from "@/lib/utils";
import type { WhaleAlert } from "@/lib/types";

export default function AlertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [alert, setAlert] = useState<WhaleAlert | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/alerts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setAlert(data.alert);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <PageShell>
        <Card className="mt-8 text-center">
          <p className="text-lg text-slate-600">알림을 찾을 수 없어요.</p>
          <Button block className="mt-4" onClick={() => router.push("/dashboard")}>
            대시보드로 가기
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
  const name = coin?.name ?? alert.coinSymbol;
  const sms = alert.message;

  return (
    <PageShell>
      <div className="flex items-center gap-3">
        <CoinAvatar symbol={alert.coinSymbol} size="lg" />
        <div>
          <h1 className="text-2xl font-extrabold text-orange-900">
            [주의] {name} 큰손 이동
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-base font-bold text-muted">
              가격 흔들림 가능성
            </span>
            <Badge
              tone={alert.impactLevel === "높음" ? "warning" : "neutral"}
            >
              {alert.impactLevel}
            </Badge>
          </div>
        </div>
      </div>

      <Card className="mt-6">
        <p className="text-base font-bold text-muted">이동 규모</p>
        <p className="text-3xl font-extrabold">
          {formatKrwApprox(alert.fiatKrw)}
        </p>
        {alert.delivery === "preview_only" && (
          <p className="mt-2 text-base text-slate-500">
            (데모: 실제 문자 발송 없이 미리보기로만 보여드려요)
          </p>
        )}
      </Card>

      <h2 className="mt-8 mb-3 text-xl font-extrabold">받은 문자 내용</h2>
      <Card className="border-orange-200 bg-orange-50">
        <pre className="whitespace-pre-wrap text-base leading-relaxed text-orange-900">
          {sms}
        </pre>
      </Card>

      <Button
        variant="secondary"
        block
        className="mt-8"
        onClick={() => router.push("/dashboard")}
      >
        대시보드로 돌아가기
      </Button>
    </PageShell>
  );
}
