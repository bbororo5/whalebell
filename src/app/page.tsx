"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/page-shell";
import { SAMPLE_SMS } from "@/lib/sms";

export default function LandingPage() {
  const [showSample, setShowSample] = useState(false);

  return (
    <PageShell>
      <section className="flex flex-1 flex-col justify-center py-6">
        <div className="mb-2 text-5xl" aria-hidden>
          🐋
        </div>
        <h1 className="text-3xl font-extrabold leading-tight">고래벨</h1>

        <h2 className="mt-6 text-3xl font-extrabold leading-snug">
          내가 가진 코인,
          <br />
          큰손 움직임을 쉬운 문자로
          <br />
          받아보세요.
        </h2>

        <p className="mt-5 text-xl leading-relaxed text-slate-600">
          비트코인, 이더리움, 월드코인처럼 내가 관심 있는 코인에서 큰 금액이
          움직이면 어려운 말 없이 문자로 알려드립니다.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link href="/setup/coin">
            <Button block size="lg">
              알림 문자 신청하기
            </Button>
          </Link>
          <Button
            variant="secondary"
            block
            size="lg"
            onClick={() => setShowSample(true)}
          >
            문자 예시 보기
          </Button>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="text-lg font-semibold text-muted underline underline-offset-4"
          >
            이미 신청했어요 · 내 알림 보기
          </Link>
        </div>
      </section>

      {showSample && (
        <SampleModal onClose={() => setShowSample(false)} />
      )}
    </PageShell>
  );
}

function SampleModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-extrabold">받게 될 문자 예시</h3>
        <p className="mt-1 text-base text-muted">
          실제로 이렇게 생긴 문자를 받게 돼요.
        </p>
        <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-orange-50 p-4 text-base leading-relaxed text-orange-900">
          {SAMPLE_SMS}
        </pre>
        <Button block className="mt-5" onClick={onClose}>
          닫기
        </Button>
      </Card>
    </div>
  );
}
