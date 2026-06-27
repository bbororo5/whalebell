import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border-2 border-border bg-card p-6 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "available" | "soon" | "neutral" | "warning";
}) {
  const tones: Record<string, string> = {
    available: "bg-green-100 text-green-800",
    soon: "bg-slate-100 text-slate-500",
    neutral: "bg-blue-100 text-blue-800",
    warning: "bg-orange-100 text-orange-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-bold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
