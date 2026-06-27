import { NextResponse } from "next/server";
import { runDetectionCycle } from "@/lib/server/cycle";

export const maxDuration = 60;

/**
 * Vercel Cron 진입점. 주기적으로 루프 B(감지→발송)를 실행한다.
 * Vercel Cron은 GET 요청에 `Authorization: Bearer <CRON_SECRET>`를 붙인다.
 * CRON_SECRET이 설정돼 있으면 검증한다.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  const result = await runDetectionCycle();
  return NextResponse.json({
    ok: true,
    scanned: result.scanned,
    createdCount: result.created.length,
  });
}
