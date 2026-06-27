import { NextResponse } from "next/server";
import { createVerification, normalizePhone } from "@/lib/server/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const phone = body?.phone as string | undefined;
  if (!phone || normalizePhone(phone).length < 10) {
    return NextResponse.json(
      { ok: false, error: "휴대폰 번호를 정확히 입력해주세요." },
      { status: 400 },
    );
  }
  const code = createVerification();
  // 데모이므로 코드도 함께 반환(실서비스에서는 절대 반환하지 않음).
  return NextResponse.json({ ok: true, demoCode: code });
}
