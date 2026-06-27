import { NextResponse } from "next/server";
import { getAlertById } from "@/lib/server/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const alert = await getAlertById(id);
  if (!alert) {
    return NextResponse.json(
      { ok: false, error: "알림을 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, alert });
}
