import type {
  AlertDelivery,
  ImpactLevel,
  Subscription,
  TransferDirection,
  WhaleAlert,
} from "../types";
import { prisma } from "./db";

/**
 * Postgres(Prisma) 영속 저장소.
 * 도메인 순수 함수(src/lib/domain/*)와 분리된, 비동기 CRUD 계층.
 */

const DEMO_CODE = "123456";

export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

/* ── 인증 (데모: 무상태 고정 코드) ─────────────────── */

export function createVerification(): string {
  // 서버리스 다중 인스턴스에서도 안전하도록 무상태로 처리.
  // 실서비스에서는 Redis/TTL 테이블로 교체.
  return DEMO_CODE;
}

export function confirmVerification(_phone: string, code: string): boolean {
  return code.trim() === DEMO_CODE;
}

/* ── 매퍼 ─────────────────────────────────────────── */

type SubRow = {
  id: string;
  phone: string;
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
  phone: string;
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
    phone: row.phone,
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
    phone: row.phone,
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
  const phone = normalizePhone(input.phone);
  const coinSymbol = input.coinSymbol.toUpperCase();

  const existing = await prisma.subscription.findUnique({
    where: { phone_coinSymbol: { phone, coinSymbol } },
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
      phone,
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
    where: { phone: normalizePhone(phone) },
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
        phone: input.phone,
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
    // 멱등키 충돌(이미 존재) 등은 무시
    return null;
  }
}

export async function getAlertsByPhone(phone: string): Promise<WhaleAlert[]> {
  const rows = await prisma.alert.findMany({
    where: { phone: normalizePhone(phone) },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toAlert);
}

export async function getAlertById(id: string): Promise<WhaleAlert | undefined> {
  const row = await prisma.alert.findUnique({ where: { id } });
  return row ? toAlert(row) : undefined;
}
