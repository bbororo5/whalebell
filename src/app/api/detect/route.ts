import { NextResponse } from "next/server";
import { runDetectionCycle } from "@/lib/server/cycle";

/**
 * 루프 B(큰손 이동 감지 → 문자 발송)를 1회 실행한다.
 * 데모에서는 대시보드 버튼/스크립트로 수동 트리거.
 * 실서비스에서는 cron/worker가 주기적으로 호출.
 */
export async function POST() {
  const result = await runDetectionCycle();
  return NextResponse.json({
    ok: true,
    scanned: result.scanned,
    createdCount: result.created.length,
    created: result.created,
  });
}
