import { NextResponse } from "next/server";
import { getCoin } from "@/lib/coins";
import { getThreshold } from "@/lib/thresholds";
import {
  createOrUpdateSubscription,
  getSubscriptionsByPhone,
} from "@/lib/server/store";
import { createIntroAlert } from "@/lib/server/cycle";
import { clientSubscription } from "@/lib/server/serialize";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  if (!phone) {
    return NextResponse.json(
      { ok: false, error: "phone 파라미터가 필요합니다." },
      { status: 400 },
    );
  }
  const subscriptions = await getSubscriptionsByPhone(phone);
  return NextResponse.json({
    ok: true,
    subscriptions: subscriptions.map(clientSubscription),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const phone = body?.phone as string | undefined;
  const coinSymbol = body?.coinSymbol as string | undefined;
  const thresholdId = body?.thresholdId as string | undefined;

  if (!phone || !coinSymbol || !thresholdId) {
    return NextResponse.json(
      { ok: false, error: "필수 정보가 빠졌습니다." },
      { status: 400 },
    );
  }
  const coin = getCoin(coinSymbol);
  if (!coin || coin.status !== "available") {
    return NextResponse.json(
      { ok: false, error: "아직 알림을 받을 수 없는 코인입니다." },
      { status: 400 },
    );
  }
  const threshold = getThreshold(thresholdId);
  if (!threshold) {
    return NextResponse.json(
      { ok: false, error: "알림 기준이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const { subscription, created } = await createOrUpdateSubscription({
    phone,
    coinSymbol,
    thresholdId: threshold.id,
    thresholdKrw: threshold.krw,
  });

  // 신청 직후 대시보드가 비어 보이지 않도록 첫 미리보기 알림 1건 적재
  await createIntroAlert(subscription);

  return NextResponse.json(
    { ok: true, subscription: clientSubscription(subscription), created },
    { status: created ? 201 : 200 },
  );
}
