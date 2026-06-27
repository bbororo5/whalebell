import type { Subscription } from "./types";

export async function fetchSubscriptions(
  phone: string,
): Promise<Subscription[]> {
  const res = await fetch(
    `/api/subscriptions?phone=${encodeURIComponent(phone)}`,
  );
  const data = await res.json();
  return data.subscriptions ?? [];
}

export async function patchSubscription(
  id: string,
  body: { active?: boolean; thresholdId?: string },
): Promise<boolean> {
  const res = await fetch(`/api/subscriptions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

/** 코인 심볼 → 구독 (없으면 undefined) */
export function subscriptionsBySymbol(
  subs: Subscription[],
): Map<string, Subscription> {
  const map = new Map<string, Subscription>();
  for (const s of subs) map.set(s.coinSymbol.toUpperCase(), s);
  return map;
}

export type CoinSubscriptionState = "none" | "active" | "paused";

export function coinSubscriptionState(
  subs: Subscription[],
  symbol: string,
): CoinSubscriptionState {
  const sub = subscriptionsBySymbol(subs).get(symbol.toUpperCase());
  if (!sub) return "none";
  return sub.active ? "active" : "paused";
}
