import { NextResponse } from "next/server";
import { confirmVerification } from "@/lib/server/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const phone = body?.phone as string | undefined;
  const code = body?.code as string | undefined;
  if (!phone || !code) {
    return NextResponse.json(
      { ok: false, error: "번호와 인증번호를 입력해주세요." },
      { status: 400 },
    );
  }
  const ok = confirmVerification(phone, code);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "인증번호가 맞지 않습니다." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
