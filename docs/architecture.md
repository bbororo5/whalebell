# 고래벨 아키텍처 — 두 개의 핵심 루프

> 본질은 두 개의 루프다. 나머지(대시보드·관리·상세)는 결과를 보여주는 보조 화면이다.
>
> - **A. 알림 신청** — 사용자가 `{코인, 원화기준, 휴대폰번호}` 구독 1건을 등록
> - **B. 큰손 이동 감지 → 문자 발송** — 시스템이 이동을 잡아 → 조건 매칭 → 쉬운 문자 발송

본 문서는 **Mock 전용 MVP** 기준이다. 모든 외부 의존(체인 스캔/시세/문자)은 인터페이스로 추상화하고, 키가 없으면 항상 Mock·fallback으로 동작한다(해커톤 안전).

**저장소**: 구독·알림은 **PostgreSQL(Prisma)** 에 영속한다(배포처 무관: Vercel/Neon/장시간 서버 모두 지원). 인증번호는 무상태(데모 고정코드).

**휴대폰 번호 보호**: 평문 저장 안 함. `phoneHash`(HMAC-SHA256, 동등 조회용) + `phoneEnc`(AES-256-GCM, 발송·표시용 가역 암호화) 2컬럼으로 저장하고, 클라이언트 응답에서는 `010-****-5678`로 마스킹한다. 키는 `PHONE_ENC_KEY`/`PHONE_HASH_SECRET`.

**외부 연동 현황(실서비스 슬롯)**:
- **시세**: CoinGecko 실시간(60초 캐시) → 실패 시 코인별 fallback. `/api/prices`로도 노출.
- **문자 발송**: SOLAPI 실제 발송(HMAC 서명). `SOLAPI_API_KEY`/`SOLAPI_API_SECRET`/`SOLAPI_SENDER` 셋 다 있을 때만 실제 발송, 아니면 `preview_only` 폴백.
- **온체인 전이 감지**: 아직 mock(`mockWhaleTransfers`). live scan(Alchemy/Etherscan)은 슬롯만 존재.
- **자동 실행**: Vercel Cron(`/api/cron/detect`, `CRON_SECRET` 보호) + 대시보드 진입 시 1회.

---

## 1. 전체 그림

```
   [A 신청]                          [B 감지·발송]
 Subscription  ───── 필터 입력 ────▶  매칭(coinSymbol + fiatKrw >= thresholdKrw)
  { coinSymbol,                            │
    thresholdKrw,                          ▼
    phone, active }                   Alert 생성 → 문자(or 미리보기) + 대시보드
       ▲                                   │
       └─────────── 보조 화면 ◀────────────┘
        /manage · /dashboard · /alerts/[id]
```

핵심 규칙
- 로그인 없음. **휴대폰 번호가 키.**
- **1코인 1구독** (같은 phone + coinSymbol 중복 불가).
- 알림 기준은 **원화 규모**.
- 모든 외부 API는 **fallback 필수**. 키 없으면 발송 대신 미리보기 적재.
- 안전 문구(투자권유 아님 등) 필수.

---

## 2. 데이터 모델

### Subscription (A의 산출물 / B의 필터)

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | `sub_...` |
| `phone` | string | 숫자만 정규화 (식별 키) |
| `coinSymbol` | string | 예: `ETH` (available 코인만) |
| `thresholdId` | `"basic"\|"important"\|"huge"` | 표시·변경용 원본 |
| `thresholdKrw` | number | 매칭용 파생값(생성 시 `THRESHOLDS`에서 확정·저장) |
| `active` | boolean | 알림 켜짐 여부 |
| `createdAt` | ISO string | |

> 결정: `thresholdId`를 진실원본으로 두되, **매칭 성능·명확성**을 위해 `thresholdKrw`를 함께 저장(비정규화). 기준 변경(PATCH) 시 둘 다 갱신.

### Transfer (B의 입력) — 신규

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | `tf_...` |
| `coinSymbol` | string | |
| `tokenAmount` | number | 코인 수량 |
| `direction` | `"exchange_inflow"\|"exchange_outflow"\|"wallet_to_wallet"` | MVP 핵심은 `exchange_inflow`(팔기 준비 신호) |
| `fromLabel` | string | 예: `상위권 큰손 계좌` |
| `toLabel` | string | 예: `거래소` |
| `detectedAt` | ISO string | |

> 화면·문자에는 온체인/트랜잭션/지갑 용어 금지 → `계좌`, `거래소로 옮김`으로만 표현.

### Alert (B의 산출물) — 정합화

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | `alert_...` |
| `subscriptionId` | string | 어떤 구독 때문에 생겼는지 |
| `transferId` | string | 어떤 이동에서 나왔는지(중복 방지 키). 첫 미리보기는 `intro_` 접두사 |
| `phone` | string | 발송·조회용 비정규화 |
| `coinSymbol` | string | 표시용 비정규화 |
| `fiatKrw` | number | 환산 원화 규모 |
| `tokenAmount` | number | 이동 수량(표시용 비정규화) |
| `direction` | TransferDirection | 방향(거래소 inflow 집계용 비정규화) |
| `impactLevel` | `"낮음"\|"보통"\|"높음"` | |
| `message` | string | `generateSeniorMessage()` 전체 본문 스냅샷 |
| `shortBody` | string | `generateShortMessage()` HOME·미리보기용 짧은 본문 |
| `delivery` | `"sent"\|"preview_only"` | SOLAPI 키 유무에 따라 |
| `detectedAt` | ISO string | 이동 감지 시각(Transfer에서 비정규화) |
| `createdAt` | ISO string | |

> 멱등성: `(transferId, subscriptionId)` 조합으로 중복 Alert 생성 차단.

---

## 3. 루프 A — 알림 신청 (사용자 → 시스템)

화면 흐름은 현재 구현 유지(`/` → `/setup/coin` → `/setup/threshold` → `/setup/summary` → `/setup/phone` → `/setup/preview` → `/complete`).

변경점
1. 구독 생성 시 `thresholdKrw` 확정 저장.
2. **1코인 1구독 제약**: 같은 phone+coinSymbol 존재 시 409 또는 기존 구독 갱신.
3. (선택) `/complete` 진입 시 **첫 미리보기 Alert 1건**을 `preview_only`로 적재해, 신청 직후 대시보드가 비어 보이지 않게 한다.

```
사용자 → 고래벨: 코인 ETH / 기준 1억 / 번호 인증
고래벨 → 저장:  Subscription { phone, coinSymbol:ETH, thresholdId:basic, thresholdKrw:1e8, active:true }
사용자 ← 고래벨: 완료 (+ 첫 미리보기 문자)
```

---

## 4. 루프 B — 감지 → 발송 (시스템 → 사용자)

단일 오케스트레이터 `runDetectionCycle()`가 6단계를 순서대로 실행한다. 각 단계는 **순수 함수**로 분리해 테스트·교체가 쉽도록 한다.

```
[1] 감지   getWhaleTransfers()            → RawTransfer[]
            · MVP: mockWhaleTransfers() (항상 성공)
            · 확장 슬롯: live scan 실패 시 mock fallback (인터페이스만 둠)

[2] 환산   convertToKrw(coin, amount)     → { fiatKrw, priceSource }
            fiatKrw = amount × priceUsd × FX_RATE(1,380)
            priceUsd: CoinGecko 슬롯 → 실패 시 FALLBACK_PRICES[coin]

[3] 해석   computeImpact(transfer, fiatKrw) → ImpactLevel
            근거: 금액 규모 + direction(거래소 inflow면 가중)

[4] 매칭   matchSubscriptions(transfer, fiatKrw, activeSubs) → Subscription[]
            조건: coinSymbol 일치 AND fiatKrw >= sub.thresholdKrw AND sub.active

[5] 생성   generateSeniorMessage({ coin, fiatKrw, impactLevel }) → string
            (= 기존 buildAlertSms, 단일 진입점)

[6] 발송   dispatch(phone, message)       → "sent" | "preview_only"
            SOLAPI 키 있으면 실제 발송, 없으면 미리보기만
            저장: Alert 레코드 (멱등 체크 후)
```

### 도메인 함수 시그니처(요지)

```ts
// 1. 감지
function getWhaleTransfers(): RawTransfer[];          // mock 우선
// 2. 환산
function convertToKrw(coinSymbol: string, tokenAmount: number):
  { fiatKrw: number; priceSource: "live" | "fallback" };
// 3. 해석
function computeImpact(t: RawTransfer, fiatKrw: number): ImpactLevel;
// 4. 매칭
function matchSubscriptions(
  t: RawTransfer, fiatKrw: number, subs: Subscription[],
): Subscription[];
// 5. 생성
function generateSeniorMessage(p: {
  coin: Pick<Coin,"name"|"symbol">; fiatKrw: number; impactLevel: ImpactLevel;
}): string;
// 6. 발송
function dispatch(phone: string, message: string): "sent" | "preview_only";

// 오케스트레이터
function runDetectionCycle(): { created: Alert[]; scanned: number };
```

### impactLevel 규칙 (MVP 기본값)

| direction | fiatKrw 구간 | impact |
|---|---|---|
| exchange_inflow | ≥ 5억 | 높음 |
| exchange_inflow | ≥ 1억 | 보통 |
| exchange_inflow | < 1억 | 낮음 |
| 그 외 방향 | — | 위 기준에서 한 단계 하향 |

상수: `FX_RATE = 1380`, `FALLBACK_PRICES`(코인별 USD), `EXCHANGE_RATE_SOURCE = "fixed"`.

---

## 5. API 엔드포인트

| 메서드 | 경로 | 루프 | 설명 |
|---|---|---|---|
| GET | `/api/coins?q=` | A | 코인 목록/검색(준비 중 포함) |
| POST | `/api/verify/request` | A | 인증번호 발송(데모 123456) |
| POST | `/api/verify/confirm` | A | 인증번호 확인 |
| POST | `/api/subscriptions` | A | 구독 생성(`thresholdKrw` 확정, 1코인1구독 검증) |
| GET | `/api/subscriptions?phone=` | 보조 | 번호별 구독 |
| PATCH | `/api/subscriptions/[id]` | 보조 | 기준 변경(둘 다 갱신)·켜기/끄기 |
| **POST** | **`/api/detect`** | **B** | **루프 B 1회 실행** → 생성된 Alert 반환 |
| GET | `/api/alerts?phone=` | 보조 | 그 번호 구독의 Alert(실제 매칭 결과) |
| GET | `/api/alerts/[id]` | 보조 | Alert 상세 |

> `/api/detect`는 데모에서 버튼/스크립트로 수동 트리거. 실서비스에서는 cron/worker로 대체(슬롯만 정의).

---

## 6. 현재 코드 대비 변경 작업 (Mock 전용)

1. **타입**: `Transfer` 추가, `Alert`에 `subscriptionId/transferId/phone/message/delivery` 추가, `Subscription`에 `thresholdKrw` 추가.
2. **도메인 코어**(순수 함수) `src/lib/domain/`:
   - `transfers.ts` (`mockWhaleTransfers`, `getWhaleTransfers`)
   - `pricing.ts` (`convertToKrw`, `FX_RATE`, `FALLBACK_PRICES_USD`)
   - `impact.ts` (`computeImpact`)
   - `matching.ts` (`matchSubscriptions`)
   - `dispatch.ts` (`dispatch` — 키 없으면 preview_only)
   - 메시지는 `src/lib/sms.ts`의 `generateSeniorMessage`(단일 진입점) 사용.
   - **오케스트레이터** `runDetectionCycle`/`createIntroAlert`는 저장소를 건드리므로
     순수 도메인과 분리해 `src/lib/server/cycle.ts`에 둔다(도메인은 순수 유지).
3. **store**: 시드 알림 제거 → 빈 상태에서 `runDetectionCycle` 결과로 채움. 멱등 체크 추가. `getSubscriptionsByPhone`은 유지.
4. **API**: `POST /api/detect` 추가. `subscriptions` 생성/수정에 `thresholdKrw` 반영 및 1코인1구독 검증.
5. **화면**: `/dashboard`·`/alerts/[id]`가 새 Alert 스키마(`fiatKrw`, `message`)를 사용. (선택) 대시보드에 "지금 감지 실행" 데모 버튼 → `/api/detect`.

> 화면 카피/디자인은 변경 없음. 데이터가 **고정 시드 → 실제 매칭 결과**로 바뀌는 것이 핵심.

---

## 7. HOME(관제실) 화면 — `/dashboard`

> HOME은 알림 신청 화면이 아니라, **내가 알림 받고 있는 코인의 "오늘 큰손 이동 상태"를 쉽게 확인하는 관제실**이다. (코인 시세 차트 서비스가 아님)

- 진입 시 `POST /api/detect`를 1회 자동 실행해 항상 최신 상태로 보이게 한다(멱등).
- 통계는 **실제 감지분만** 사용한다. 첫 미리보기(`intro_*`) 알림은 통계에서 제외하고, 보여줄 알림이 없을 때 문자 미리보기 폴백으로만 쓴다.

화면 구성(우선순위 순):
1. 오늘의 상태 카드 (`homeStatus`: 조용/주의/살펴볼/큰 변화 적음)
2. 요약 숫자 4개 (알림 코인 수 · 오늘 큰 이동 · 주의 알림 · 가장 큰 이동)
3. 내가 알림 받는 코인 카드 (현재가·기준·오늘 건수·상태)
4. 오늘 감지된 큰손 이동 카드 3개
5. 거래소로 들어간 이동 요약 (`exchangeInflowCount`)
6. 문자 미리보기 (`shortBody`) → `/message-preview?id=`
7. 안내(투자 권유 아님)

계산 함수 `src/lib/home.ts`: `todayAlerts`, `subscribedAlerts`, `realAlerts`, `highImpactCount`, `biggestTransfer`, `exchangeInflowCount`, `recentAlerts`, `homeStatus`, `coinCards`, `previewAlert`.
컴포넌트 `src/components/home/`: `HomeStatusCard`, `HomeSummaryCards`, `SubscribedCoinCard`, `RecentAlertCard`, `ExchangeInflowCard`, `HomeMessagePreview`, `DisclaimerBox`.

**금지 값**(미노출): 보유 수량·평가금액·수익률·평균 매수가, 매수/매도 추천, 폭락 예측, 세력 단정. 거래소 계정 연동 없이 PRD 데이터로만 구성.

현재가는 `getCurrentPriceKrw`(= fallback 시세 × FX)로 계산하며, 시세 API가 없어도 동작한다.

## 8. 확장 슬롯 (지금은 미사용, 인터페이스만)

- `getWhaleTransfers`: Alchemy/Etherscan live scan → 실패 시 `mockWhaleTransfers`.
- `convertToKrw`: CoinGecko live → 실패 시 `FALLBACK_PRICES`.
- `dispatch`: SOLAPI → 키 없으면 `preview_only`.

세 슬롯 모두 환경변수 유무로 분기하며, **키가 없는 기본 상태에서 전체 루프가 끝까지 동작**하는 것을 보장한다.
