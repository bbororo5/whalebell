import crypto from "node:crypto";
import { NextResponse } from "next/server";
import type { Transfer } from "@/lib/types";
import {
  classifyDirection,
  exchangeNameForAddress,
  NATIVE_SYMBOL,
  symbolForContract,
} from "@/lib/domain/exchanges";
import { ingestTransfer } from "@/lib/server/ingest";

export const maxDuration = 60;

/**
 * Alchemy "Address Activity" 웹훅 수신.
 * 실제 온체인 이동이 발생하면 Alchemy가 이 엔드포인트로 푸시한다.
 * ALCHEMY_WEBHOOK_SIGNING_KEY 가 있으면 x-alchemy-signature(HMAC-SHA256)를 검증한다.
 */
export async function POST(request: Request) {
  const raw = await request.text();

  const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;
  if (signingKey) {
    const sig = request.headers.get("x-alchemy-signature") ?? "";
    const expected = crypto
      .createHmac("sha256", signingKey)
      .update(raw, "utf8")
      .digest("hex");
    if (sig !== expected) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let payload: AlchemyWebhook;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const transfers = parseAlchemyActivity(payload);
  const created = [];
  for (const t of transfers) {
    const c = await ingestTransfer(t);
    created.push(...c);
  }

  return NextResponse.json({
    ok: true,
    received: transfers.length,
    createdCount: created.length,
  });
}

/* ── Alchemy 페이로드 파싱 ─────────────────────────── */

interface AlchemyActivity {
  fromAddress?: string;
  toAddress?: string;
  value?: number;
  asset?: string;
  category?: string; // "external"(ETH) | "token" | "erc20" ...
  rawContract?: { address?: string; rawValue?: string; decimals?: number };
  hash?: string;
  log?: { transactionHash?: string };
}
interface AlchemyWebhook {
  event?: { activity?: AlchemyActivity[]; network?: string };
}

function parseAlchemyActivity(payload: AlchemyWebhook): Transfer[] {
  const activity = payload?.event?.activity ?? [];
  const out: Transfer[] = [];
  const now = new Date().toISOString();

  activity.forEach((a, i) => {
    const from = a.fromAddress ?? "";
    const to = a.toAddress ?? "";
    if (!from || !to) return;

    // 심볼 판정: ERC-20면 컨트랙트로, 아니면 네이티브(ETH)
    const symbol =
      symbolForContract(a.rawContract?.address) ??
      (a.category === "external" || a.asset === "ETH"
        ? NATIVE_SYMBOL
        : undefined);
    if (!symbol) return; // 추적 대상 토큰이 아니면 무시

    const tokenAmount = typeof a.value === "number" ? a.value : 0;
    if (tokenAmount <= 0) return;

    const direction = classifyDirection(from, to);
    const txHash = a.hash ?? a.log?.transactionHash ?? `${now}_${i}`;
    const exchangeName = exchangeNameForAddress(to);
    const toLabel =
      direction === "exchange_inflow"
        ? exchangeName
          ? `${exchangeName} 거래소`
          : "거래소"
        : "다른 계좌";

    out.push({
      id: `tx_${txHash}_${i}`,
      coinSymbol: symbol,
      tokenAmount,
      direction,
      fromLabel: "많은 양을 보유한 큰손 계좌",
      toLabel,
      detectedAt: now,
    });
  });

  return out;
}
