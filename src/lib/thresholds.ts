import type { Threshold } from "./types";

/** 코인마다 단가가 다르므로 알림 기준은 코인 수량이 아니라 원화 금액으로 정한다. */
export const THRESHOLDS: Threshold[] = [
  {
    id: "basic",
    title: "기본 알림 추천",
    krw: 100_000_000,
    description: "약 1억 원 이상 움직이면 알려드려요. 큰 움직임을 놓치지 않고 받고 싶을 때 좋아요.",
  },
  {
    id: "important",
    title: "중요한 알림만",
    krw: 500_000_000,
    description: "약 5억 원 이상 움직이면 알려드려요. 문자를 너무 자주 받고 싶지 않을 때 좋아요.",
  },
  {
    id: "huge",
    title: "아주 큰 움직임만",
    krw: 1_000_000_000,
    description: "약 10억 원 이상 움직이면 알려드려요. 정말 큰 이동만 보고 싶을 때 좋아요.",
  },
];

export function getThreshold(id: string): Threshold | undefined {
  return THRESHOLDS.find((t) => t.id === id);
}
