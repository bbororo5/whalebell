import { NextResponse } from "next/server";
import { getThreshold } from "@/lib/thresholds";
import { updateSubscription } from "@/lib/server/store";
import { clientSubscription } from "@/lib/server/serialize";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const patch: {
    thresholdId?: "basic" | "important" | "huge";
    thresholdKrw?: number;
    active?: boolean;
  } = {};

  if (body?.thresholdId) {
    const t = getThreshold(body.thresholdId);
    if (!t) {
      return NextResponse.json(
        { ok: false, error: "알림 기준이 올바르지 않습니다." },
        { status: 400 },
      );
    }
    patch.thresholdId = t.id;
    patch.thresholdKrw = t.krw;
  }
  if (typeof body?.active === "boolean") {
    patch.active = body.active;
  }

  const updated = await updateSubscription(id, patch);
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "알림을 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  return NextResponse.json({
    ok: true,
    subscription: clientSubscription(updated),
  });
}
