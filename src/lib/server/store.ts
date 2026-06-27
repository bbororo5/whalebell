import type {
  AlertDelivery,
  ImpactLevel,
  Subscription,
  TransferDirection,
  WhaleAlert,
} from "../types";
import { prisma } from "./db";
import {
  decryptPhone,
  encryptPhone,
  hashPhone,
  normalizePhone,
} from "./crypto";

/**
 * Postgres(Prisma) 영속 저장소.
 * 휴대폰 번호는 phoneHash(조회) + phoneEnc(암호문)로 저장하고,
 * 읽을 때 복호화해 도메인 객체의 plaintext `phone`으로 돌려준다(내부 발송용).
 * 클라이언트 응답에서는 API 라우트가 maskPhone으로 가린다.
 */

const DEMO_CODE = "123456";

export { normalizePhone };

/* ── 인증 (데모: 무상태 고정 코드) ─────────────────── */

export function createVerification(): string {
  return DEMO_CODE;
}

export function confirmVerification(_phone: string, code: string): boolean {
  return code.trim() === DEMO_CODE;
}

/* ── 매퍼 ─────────────────────────────────────────── */

type SubRow = {
  id: string;
  phoneEnc: string;
  coinSymbol: string;
  thresholdId: string;
  thresholdKrw: number;
  active: boolean;
  createdAt: Date;
};

type AlertRow = {
  id: string;
  subscriptionId: string;
  transferId: string;
  phoneEnc: string;
  coinSymbol: string;
  fiatKrw: number;
  tokenAmount: number;
  direction: string;
  impactLevel: string;
  message: string;
  shortBody: string;
  delivery: string;
  detectedAt: Date;
  createdAt: Date;
};

function toSub(row: SubRow): Subscription {
  return {
    id: row.id,
    phone: decryptPhone(row.phoneEnc),
    coinSymbol: row.coinSymbol,
    thresholdId: row.thresholdId as Subscription["thresholdId"],
    thresholdKrw: row.thresholdKrw,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

function toAlert(row: AlertRow): WhaleAlert {
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    transferId: row.transferId,
    phone: decryptPhone(row.phoneEnc),
    coinSymbol: row.coinSymbol,
    fiatKrw: row.fiatKrw,
    tokenAmount: row.tokenAmount,
    direction: row.direction as TransferDirection,
    impactLevel: row.impactLevel as ImpactLevel,
    message: row.message,
    shortBody: row.shortBody,
    delivery: row.delivery as AlertDelivery,
    detectedAt: row.detectedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/* ── 구독 (1코인 1구독) ───────────────────────────── */

export async function createOrUpdateSubscription(input: {
  phone: string;
  coinSymbol: string;
  thresholdId: Subscription["thresholdId"];
  thresholdKrw: number;
}): Promise<{ subscription: Subscription; created: boolean }> {
  const phoneHash = hashPhone(input.phone);
  const coinSymbol = input.coinSymbol.toUpperCase();

  const existing = await prisma.subscription.findUnique({
    where: { phoneHash_coinSymbol: { phoneHash, coinSymbol } },
  });

  if (existing) {
    const updated = await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        thresholdId: input.thresholdId,
        thresholdKrw: input.thresholdKrw,
        active: true,
      },
    });
    return { subscription: toSub(updated), created: false };
  }

  const created = await prisma.subscription.create({
    data: {
      phoneHash,
      phoneEnc: encryptPhone(input.phone),
      coinSymbol,
      thresholdId: input.thresholdId,
      thresholdKrw: input.thresholdKrw,
      active: true,
    },
  });
  return { subscription: toSub(created), created: true };
}

export async function getSubscriptionsByPhone(
  phone: string,
): Promise<Subscription[]> {
  const rows = await prisma.subscription.findMany({
    where: { phoneHash: hashPhone(phone) },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toSub);
}

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  const rows = await prisma.subscription.findMany({ where: { active: true } });
  return rows.map(toSub);
}

export async function updateSubscription(
  id: string,
  patch: Partial<Pick<Subscription, "thresholdId" | "thresholdKrw" | "active">>,
): Promise<Subscription | undefined> {
  try {
    const updated = await prisma.subscription.update({
      where: { id },
      data: patch,
    });
    return toSub(updated);
  } catch {
    return undefined;
  }
}

/* ── 알림 ─────────────────────────────────────────── */

export type AlertInput = Omit<WhaleAlert, "id" | "createdAt">;

export async function hasAlert(
  transferId: string,
  subscriptionId: string,
): Promise<boolean> {
  const found = await prisma.alert.findUnique({
    where: { transferId_subscriptionId: { transferId, subscriptionId } },
  });
  return found !== null;
}

export async function insertAlert(input: AlertInput): Promise<WhaleAlert | null> {
  try {
    const row = await prisma.alert.create({
      data: {
        subscriptionId: input.subscriptionId,
        transferId: input.transferId,
        phoneHash: hashPhone(input.phone),
        phoneEnc: encryptPhone(input.phone),
        coinSymbol: input.coinSymbol,
        fiatKrw: input.fiatKrw,
        tokenAmount: input.tokenAmount,
        direction: input.direction,
        impactLevel: input.impactLevel,
        message: input.message,
        shortBody: input.shortBody,
        delivery: input.delivery,
        detectedAt: new Date(input.detectedAt),
      },
    });
    return toAlert(row);
  } catch {
    return null;
  }
}

export async function getAlertsByPhone(phone: string): Promise<WhaleAlert[]> {
  const rows = await prisma.alert.findMany({
    where: { phoneHash: hashPhone(phone) },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toAlert);
}

export async function getAlertById(id: string): Promise<WhaleAlert | undefined> {
  const row = await prisma.alert.findUnique({ where: { id } });
  return row ? toAlert(row) : undefined;
}
