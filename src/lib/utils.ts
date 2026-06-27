import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 원화 금액을 시니어가 읽기 쉬운 "약 N억 원" 형태로 변환 */
export function formatKrwApprox(krw: number): string {
  const eok = krw / 100_000_000;
  if (eok >= 1) {
    const rounded = Math.round(eok * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `약 ${text}억 원`;
  }
  const man = Math.round(krw / 10_000);
  return `약 ${man.toLocaleString("ko-KR")}만 원`;
}

/** 현재가처럼 작은 금액도 자연스럽게: "약 3,036원" / "약 497만 원" / "약 1.3억 원" */
export function formatPriceKrw(krw: number): string {
  if (krw >= 100_000_000) return formatKrwApprox(krw);
  if (krw >= 10_000) {
    const man = Math.round(krw / 10_000);
    return `약 ${man.toLocaleString("ko-KR")}만 원`;
  }
  return `약 ${Math.round(krw).toLocaleString("ko-KR")}원`;
}

/** "방금 전" / "N분 전" / "N시간 전" / "어제" 형태의 쉬운 시간 표시 */
export function formatRelativeTime(iso: string, now = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "어제";
  return `${day}일 전`;
}

/** 숫자만 입력받아 010-1234-5678 형태로 표시 */
export function formatPhone(value: string): string {
  const d = value.replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

