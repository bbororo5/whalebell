"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell, StepIndicator } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/lib/utils";
import { useSetupStore } from "@/lib/store";

export default function PhonePage() {
  const router = useRouter();
  const coinSymbol = useSetupStore((s) => s.coinSymbol);
  const thresholdId = useSetupStore((s) => s.thresholdId);
  const phone = useSetupStore((s) => s.phone);
  const setPhone = useSetupStore((s) => s.setPhone);
  const setVerified = useSetupStore((s) => s.setVerified);

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!coinSymbol) router.replace("/setup/coin");
    else if (!thresholdId) router.replace("/setup/threshold");
  }, [coinSymbol, thresholdId, router]);

  async function requestCode() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/verify/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "잠시 후 다시 시도해주세요.");
        return;
      }
      setDemoCode(data.demoCode ?? null);
      setStep("code");
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "인증번호가 맞지 않습니다.");
        return;
      }
      setVerified(true);
      router.push("/setup/preview");
    } finally {
      setLoading(false);
    }
  }

  const phoneValid = phone.replace(/[^0-9]/g, "").length >= 10;

  return (
    <PageShell>
      <StepIndicator current={3} />

      <h1 className="text-3xl font-extrabold leading-snug">
        문자를 받을 휴대폰
        <br />
        번호를 입력해주세요
      </h1>
      <p className="mt-4 text-xl leading-relaxed text-slate-600">
        선택한 코인에서 큰 이동이 감지되면 이 번호로 문자를 보내드립니다.
      </p>

      <div className="mt-8">
        <input
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="010-0000-0000"
          disabled={step === "code"}
          className="h-16 w-full rounded-2xl border-2 border-border bg-white px-5 text-2xl tracking-wide outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:bg-slate-100"
        />

        {step === "phone" && (
          <Button
            block
            className="mt-4"
            disabled={!phoneValid || loading}
            onClick={requestCode}
          >
            {loading ? "보내는 중…" : "인증번호 받기"}
          </Button>
        )}

        {step === "code" && (
          <div className="mt-6">
            {demoCode && (
              <p className="mb-3 rounded-2xl bg-blue-50 p-4 text-base text-blue-800">
                데모용 인증번호는 <b>{demoCode}</b> 입니다.
              </p>
            )}
            <label className="text-lg font-bold">인증번호 6자리</label>
            <input
              inputMode="numeric"
              autoFocus
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
              }
              placeholder="000000"
              className="mt-2 h-16 w-full rounded-2xl border-2 border-border bg-white px-5 text-2xl tracking-[0.4em] outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
            />
            <Button
              block
              className="mt-4"
              disabled={code.length < 6 || loading}
              onClick={confirmCode}
            >
              {loading ? "확인 중…" : "인증하고 계속하기"}
            </Button>
            <Button
              variant="ghost"
              block
              className="mt-2"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
            >
              번호 다시 입력하기
            </Button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-center text-lg font-semibold text-red-600">
            {error}
          </p>
        )}
      </div>
    </PageShell>
  );
}
