# 고래벨 (Whale Bell)

내가 가진 코인에서 **큰손 계좌의 큰 이동**이 생기면, 어려운 말 없이 **쉬운 문자**로 알려주는 시니어 친화 알림 서비스 MVP.

- 로그인/회원가입 없음. **휴대폰 번호 인증**으로 신청하고 내 알림을 확인합니다.
- 알림 기준은 코인 수량이 아니라 **원화 금액**으로 선택합니다. (약 1억 / 5억 / 10억 원)
- MVP에서는 대표 코인만 실제 지원하고, 나머지는 화면에서 **"준비 중"**으로 보여줍니다.

## 기술 스택

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** + shadcn 스타일 경량 컴포넌트
- **Zustand** (셋업 플로우 상태, localStorage 영속)
- 백엔드: Next.js Route Handlers + **Prisma + PostgreSQL** (구독·알림 영속)
  - 인증번호는 무상태(데모 고정코드 `123456`) — 서버리스 다중 인스턴스에서도 안전

## 실행

### 1. 환경변수

`.env.example`를 복사해 `.env`를 만들고 `DATABASE_URL`을 채운다.

```bash
cp .env.example .env
```

- 로컬(Docker): `docker run -d --name whalebell-pg -e POSTGRES_PASSWORD=whalebell -e POSTGRES_USER=whalebell -e POSTGRES_DB=whalebell -p 5433:5432 postgres:16`
  → `DATABASE_URL="postgresql://whalebell:whalebell@localhost:5433/whalebell?schema=public"`
- 배포: [Neon](https://neon.tech)/Supabase/Vercel Postgres에서 발급한 연결 문자열

### 2. 의존성 · 마이그레이션 · 실행

```bash
npm install          # postinstall에서 prisma generate 자동 실행
npm run db:migrate   # 로컬 개발 마이그레이션 (prisma migrate dev)
npm run dev          # http://localhost:3000
```

### 배포

```bash
npm run build        # prisma generate && next build
npm run db:deploy    # 운영 DB에 마이그레이션 적용 (prisma migrate deploy)
npm run start
```

> Prisma + Postgres라 Vercel(서버리스)·Railway/Render/Fly(장시간 서버) 어디든 동일하게 배포된다.

## 화면 구조

| 경로 | 설명 |
| --- | --- |
| `/` | 랜딩 (문자 예시 보기 포함) |
| `/setup/coin` | 코인 선택 (추천 카드 + 검색) |
| `/setup/threshold` | 알림 기준(원화) 선택 |
| `/setup/summary` | 선택 내용 확인 |
| `/setup/phone` | 휴대폰 번호 인증 |
| `/setup/preview` | 받을 문자 미리보기 + 신청 |
| `/complete` | 신청 완료 |
| `/dashboard` | **HOME(관제실)** — 오늘 내 코인 큰손 이동 상태판 |
| `/alerts/[id]` | 알림 상세 |
| `/message-preview` | 실제로 받게 될 문자 전체 보기 (`?id=alertId`) |
| `/manage` | 내 알림 관리 (기준 변경 / 끄기·켜기 / 추가) |

### HOME(`/dashboard`)의 역할

알림 신청 화면이 아니라, **내가 알림 받고 있는 코인의 "오늘 큰손 이동 상태"를 쉽게 확인하는 관제실**이다. 진입 시 루프 B를 1회 자동 실행해 항상 최신 상태로 보인다.

- 구성: 오늘의 상태 카드 → 요약 숫자 4개 → 내가 알림 받는 코인 → 오늘 감지된 큰손 이동 → 거래소 inflow 요약 → 문자 미리보기 → 안내(투자 권유 아님)
- 계산 함수: `src/lib/home.ts` (`todayAlerts`, `homeStatus`, `coinCards`, `biggestTransfer`, `exchangeInflowCount`, `recentAlerts`, `previewAlert`, `realAlerts` …)
- **금지 값 미노출**: 보유 수량·평가금액·수익률·평균 매수가, 매수/매도 추천, 폭락 예측, 세력 단정 (거래소 계정 연동 없이 PRD 데이터로만 구성)

## 코인 정책 (MVP)

- **알림 가능:** 월드코인(WLD), 이더리움(ETH), 테더(USDT)
- **준비 중:** 비트코인(BTC), 리플(XRP), 솔라나(SOL), 도지코인(DOGE), 시바이누(SHIB), 페페(PEPE)

> 이유: WLD/ETH/USDT는 이더리움 계열로 데모 구조를 맞추기 쉬움. BTC/SOL/XRP 등은 체인이 달라 구현 복잡도가 높음.
> 화면에는 이런 기술 얘기를 노출하지 않고 **"알림 가능 / 준비 중"**만 보여줍니다.

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/coins?q=` | 코인 목록/검색 (준비 중 코인도 함께 반환) |
| POST | `/api/verify/request` | 인증번호 발송 (데모 코드 `123456`) |
| POST | `/api/verify/confirm` | 인증번호 확인 |
| GET/POST | `/api/subscriptions` | 번호별 구독 조회 / 구독 생성(1코인1구독, 첫 미리보기 알림 적재) |
| PATCH | `/api/subscriptions/[id]` | 기준 변경, 알림 켜기/끄기 |
| POST | `/api/detect` | **루프 B 1회 실행** (감지→환산→해석→매칭→생성→발송) |
| GET | `/api/alerts?phone=` | 내 코인 알림 목록(실제 매칭 결과) |
| GET | `/api/alerts/[id]` | 알림 상세 |

## 두 개의 핵심 루프

- **A. 알림 신청**: `{코인, 원화기준, 휴대폰번호}` 구독 1건 생성
- **B. 감지 → 발송**: `getWhaleTransfers → convertToKrw → computeImpact → matchSubscriptions → generateSeniorMessage → dispatch`

상세 설계는 [`docs/architecture.md`](docs/architecture.md) 참고. 도메인 순수 함수는 `src/lib/domain/`, 오케스트레이터(`runDetectionCycle`)는 `src/lib/server/cycle.ts`.

## 문자 템플릿

`src/lib/sms.ts`의 `buildAlertSms()`가 선택한 **코인명·심볼·원화 규모·흔들림 가능성**을 동적으로 채워 문자를 만듭니다.

## UI 원칙 (시니어 친화)

- 글씨 크게, 카드 크게, 탭 영역 크게
- 검색보다 추천 코인 카드를 먼저
- 어려운 단어 금지 (지갑→계좌, 매도→팔다, 위험→주의)
- 온체인/트랜잭션/컨트랙트 같은 용어 사용 안 함
