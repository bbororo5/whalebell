"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageShell, StepIndicator } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { THRESHOLDS } from "@/lib/thresholds";
import { useSetupStore } from "@/lib/store";

export default function ThresholdPage() {
  const router = useRouter();
  const coinSymbol = useSetupStore((s) => s.coinSymbol);
  const selected = useSetupStore((s) => s.thresholdId);
  const setThreshold = useSetupStore((s) => s.setThreshold);

  useEffect(() => {
    if (!coinSymbol) router.replace("/setup/coin");
  }, [coinSymbol, router]);

  function handleSelect(id: (typeof THRESHOLDS)[number]["id"]) {
    setThreshold(id);
    router.push("/setup/summary");
  }

  return (
    <PageShell>
      <StepIndicator current={2} />

      <h1 className="text-3xl font-extrabold leading-snug">
        얼마나 큰 이동이면
        <br />
        알려드릴까요?
      </h1>
      <p className="mt-4 text-xl leading-relaxed text-slate-600">
        코인마다 가격이 다르기 때문에 원화 금액 기준으로 알림을 정합니다.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {THRESHOLDS.map((t) => {
          const isSelected = selected === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className="text-left"
            >
              <Card
                className={
                  isSelected
                    ? "border-primary ring-4 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-extrabold">{t.title}</span>
                  {t.id === "basic" && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">
                      추천
                    </span>
                  )}
                </div>
                <p className="mt-3 text-lg leading-relaxed text-slate-600">
                  {t.description}
                </p>
              </Card>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
