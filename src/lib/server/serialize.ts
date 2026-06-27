import type { Subscription, WhaleAlert } from "../types";
import { maskPhone } from "./crypto";

/** 클라이언트로 내보낼 때 번호를 마스킹한다(평문 노출 금지). */
export function clientSubscription(sub: Subscription): Subscription {
  return { ...sub, phone: maskPhone(sub.phone) };
}

export function clientAlert(alert: WhaleAlert): WhaleAlert {
  return { ...alert, phone: maskPhone(alert.phone) };
}
