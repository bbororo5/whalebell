"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/lib/utils";

const KEY = "whalebell-phone";

export function useStoredPhone() {
  const [phone, setPhoneState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 브라우저 스토리지는 마운트 후에만 읽을 수 있어 여기서 동기화한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhoneState(sessionStorage.getItem(KEY));
    setReady(true);
  }, []);

  function setPhone(p: string) {
    sessionStorage.setItem(KEY, p);
    setPhoneState(p);
  }
  function clearPhone() {
    sessionStorage.removeItem(KEY);
    setPhoneState(null);
  }
  return { phone, ready, setPhone, clearPhone };
}

/** 저장된 번호가 없을 때 보여주는 번호 입력 화면 */
export function PhonePrompt({ onSubmit }: { onSubmit: (phone: string) => void }) {
  const [value, setValue] = useState("");
  const valid = value.replace(/[^0-9]/g, "").length >= 10;
  return (
    <PageShell>
      <div className="pt-6">
        <h1 className="text-3xl font-extrabold leading-snug">
          내 알림을 보려면
          <br />
          번호를 입력해주세요
        </h1>
        <p className="mt-4 text-xl leading-relaxed text-slate-600">
          알림을 신청할 때 사용한 휴대폰 번호를 입력하면 내 알림을 볼 수 있어요.
        </p>
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(formatPhone(e.target.value))}
          placeholder="010-0000-0000"
          className="mt-8 h-16 w-full rounded-2xl border-2 border-border bg-white px-5 text-2xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
        />
        <Button
          block
          className="mt-4"
          disabled={!valid}
          onClick={() => onSubmit(value)}
        >
          내 알림 보기
        </Button>
      </div>
    </PageShell>
  );
}
