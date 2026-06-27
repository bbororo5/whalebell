import { NextResponse } from "next/server";
import type { Transfer, TransferDirection } from "@/lib/types";
import { getCoin } from "@/lib/coins";
import { getCurrentPriceKrw } from "@/lib/domain/pricing";
import { ingestTransfer } from "@/lib/server/ingest";
import { clientAlert } from "@/lib/server/serialize";

/**
 * 해커톤용 모의 트리거.
 * 가짜 이동 1건을 만들어 실제와 동일한 파이프라인(환산→AI멘트→매칭→발송→적재)에 흘려보낸다.
 * 이걸로 "실제 이동 → AI 멘트 → 구독자 문자 발송" 전체 흐름을 시연한다.
 *
 * body 예: { "coinSymbol": "ETH", "krw": 600000000, "direction": "exchange_inflow" }
 * 미지정 시 기본값(ETH, 6억, exchange_inflow)으로 동작.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const coinSymbol = (body?.coinSymbol as string | undefined)?.toUpperCase() ?? "ETH";
  const direction = (body?.direction as TransferDirection | undefined) ??
    "exchange_inflow";

  const coin = getCoin(coinSymbol);
  if (!coin || coin.status !== "available") {
    return NextResponse.json(
      { ok: false, error: "지원하지 않는 코인입니다." },
      { status: 400 },
    );
  }

  // 원하는 원화 규모(krw)를 코인 수량으로 역산. 파이프라인과 동일한 live 시세 사용.
  const targetKrw = typeof body?.krw === "number" ? body.krw : 600_000_000;
  const priceKrw = await getCurrentPriceKrw(coinSymbol);
  const tokenAmount = priceKrw > 0 ? targetKrw / priceKrw : 0;

  const transfer: Transfer = {
    id: `sim_${Date.now()}`,
    coinSymbol,
    tokenAmount,
    direction,
    fromLabel: "상위권 큰손 계좌",
    toLabel: direction === "exchange_inflow" ? "거래소" : "다른 계좌",
    detectedAt: new Date().toISOString(),
  };

  const created = await ingestTransfer(transfer);
  return NextResponse.json({
    ok: true,
    transfer,
    createdCount: created.length,
    created: created.map(clientAlert),
    aiSource: created[0]?.message ? "see logs" : undefined,
  });
}
