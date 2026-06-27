export type CoinStatus = "available" | "coming_soon";

export interface Coin {
  /** 영문 약자(티커) */
  symbol: string;
  /** 한글 이름 */
  name: string;
  /** 상태: 알림 가능 / 준비 중 */
  status: CoinStatus;
  /** 카드에 보여줄 짧은 설명 */
  tagline: string;
  /** "많이 선택하는 코인"에 노출할지 여부 */
  popular: boolean;
  /** 미리보기 금액 계산용 대략 시세(원). 화면에는 노출하지 않음. */
  approxPriceKrw: number;
}

export type ImpactLevel = "낮음" | "보통" | "높음";

export interface Threshold {
  id: "basic" | "important" | "huge";
  /** 카드 제목 */
  title: string;
  /** 기준 원화 금액 */
  krw: number;
  /** 카드 설명 */
  description: string;
}

export interface Subscription {
  id: string;
  phone: string;
  coinSymbol: string;
  /** 표시·변경용 원본 */
  thresholdId: Threshold["id"];
  /** 매칭용 파생값(생성 시 확정·저장) */
  thresholdKrw: number;
  active: boolean;
  createdAt: string;
}

export type TransferDirection =
  | "exchange_inflow"
  | "exchange_outflow"
  | "wallet_to_wallet";

/** B 루프의 입력: 감지된 큰손 계좌 이동 한 건 */
export interface Transfer {
  id: string;
  coinSymbol: string;
  /** 코인 수량 */
  tokenAmount: number;
  direction: TransferDirection;
  /** 예: "상위권 큰손 계좌" */
  fromLabel: string;
  /** 예: "거래소" */
  toLabel: string;
  detectedAt: string;
}

export type AlertDelivery = "sent" | "preview_only";

/** B 루프의 산출물: 특정 구독에 매칭되어 생성된 알림 */
export interface WhaleAlert {
  id: string;
  subscriptionId: string;
  transferId: string;
  /** 발송·조회용 비정규화 */
  phone: string;
  /** 표시용 비정규화 */
  coinSymbol: string;
  /** 환산 원화 규모 */
  fiatKrw: number;
  /** 이동한 코인 수량(표시용 비정규화) */
  tokenAmount: number;
  /** 이동 방향(표시·집계용 비정규화) */
  direction: TransferDirection;
  impactLevel: ImpactLevel;
  /** generateSeniorMessage() 결과 스냅샷(전체) */
  message: string;
  /** HOME/미리보기용 짧은 본문 */
  shortBody: string;
  delivery: AlertDelivery;
  /** 이동이 감지된 시각(전이 detectedAt 비정규화) */
  detectedAt: string;
  createdAt: string;
}
