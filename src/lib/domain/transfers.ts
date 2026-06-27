import type { Transfer } from "../types";

/**
 * [B-1 감지] 큰손 계좌의 코인 이동 수집.
 * MVP: 항상 성공하는 mock. 확장 슬롯에서 live scan → 실패 시 이 mock으로 fallback.
 *
 * 금액 분포를 의도적으로 넓게 둬서 원화 기준(1억/5억/10억) 매칭이 의미 있게 갈리도록 했다.
 * direction은 대부분 exchange_inflow(거래소로 옮김 = 팔기 준비 신호).
 */
export function mockWhaleTransfers(): Transfer[] {
  const now = Date.now();
  const mk = (
    n: number,
    coinSymbol: string,
    tokenAmount: number,
    direction: Transfer["direction"],
    minutesAgo: number,
  ): Transfer => ({
    id: `tf_${n}`,
    coinSymbol,
    tokenAmount,
    direction,
    fromLabel: "상위권 큰손 계좌",
    toLabel: direction === "exchange_inflow" ? "거래소" : "다른 계좌",
    detectedAt: new Date(now - minutesAgo * 60_000).toISOString(),
  });

  return [
    // ETH (1 ETH ≈ 497만원): 약 1.5억 / 7.5억 / 12.4억 / 0.5억(미달)
    mk(1, "ETH", 30, "exchange_inflow", 12),
    mk(2, "ETH", 150, "exchange_inflow", 48),
    mk(3, "ETH", 250, "exchange_inflow", 95),
    mk(4, "ETH", 10, "exchange_inflow", 130),
    // WLD (1 WLD ≈ 3,036원): 약 1.5억 / 12.1억
    mk(5, "WLD", 50_000, "exchange_inflow", 33),
    mk(6, "WLD", 400_000, "exchange_inflow", 150),
    // USDT (1 USDT ≈ 1,380원): 약 2.8억 / 13.8억
    mk(7, "USDT", 200_000, "exchange_inflow", 70),
    mk(8, "USDT", 1_000_000, "exchange_inflow", 200),
    // 방향이 다른 케이스(거래소 inflow 아님 → impact 한 단계 하향)
    mk(9, "ETH", 150, "wallet_to_wallet", 210),
    // 준비 중 코인(구독 불가 → 매칭 0건이지만 스캔에는 잡힘)
    mk(10, "BTC", 20, "exchange_inflow", 60),
  ];
}

/** 확장 슬롯: live scan이 있으면 사용하고 실패 시 mock으로 fallback. */
export function getWhaleTransfers(): Transfer[] {
  return mockWhaleTransfers();
}
