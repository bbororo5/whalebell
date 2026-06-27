import { NextResponse } from "next/server";
import { getAlertsByPhone } from "@/lib/server/store";
import { clientAlert } from "@/lib/server/serialize";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  if (!phone) {
    return NextResponse.json(
      { ok: false, error: "phone 파라미터가 필요합니다." },
      { status: 400 },
    );
  }
  const alerts = await getAlertsByPhone(phone);
  return NextResponse.json({ ok: true, alerts: alerts.map(clientAlert) });
}
