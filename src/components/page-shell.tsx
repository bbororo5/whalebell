import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
  showHeader = true,
}: {
  children: React.ReactNode;
  className?: string;
  showHeader?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-16">
      {showHeader && (
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              🐋
            </span>
            <span className="text-xl font-extrabold tracking-tight">고래벨</span>
          </Link>
        </header>
      )}
      <main className={cn("flex flex-1 flex-col", className)}>{children}</main>
    </div>
  );
}

/** 셋업 단계 진행 표시 (4단계: 코인 → 기준 → 번호 → 확인) */
export function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  const steps = ["코인", "기준", "번호", "확인"];
  return (
    <div className="mb-6 flex items-center gap-2">
      {steps.map((label, i) => {
        const step = i + 1;
        const active = step === current;
        const done = step < current;
        return (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
                active && "bg-primary text-white",
                done && "bg-green-500 text-white",
                !active && !done && "bg-slate-200 text-slate-500",
              )}
            >
              {step}
            </div>
            <span
              className={cn(
                "text-xs font-semibold",
                active ? "text-primary" : "text-muted",
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
