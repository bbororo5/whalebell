# 실제 추적 → AI 멘트 → 문자 발송 파이프라인

```
실제 이동(Alchemy 웹훅) ─┐
                         ├→ ingestTransfer → 환산(시세) → AI 멘트 생성 → 구독자 매칭 → SOLAPI 발송 → Alert 적재
모의 트리거(/api/dev/simulate) ─┘
```

- 공통 진입점: `src/lib/server/ingest.ts` (`ingestTransfer`)
- AI 멘트: `src/lib/server/ai.ts` (`generateAlertCopy`) — **에이전트 → generateContent → 템플릿** 3단 폴백
- 키가 하나도 없어도 템플릿으로 끝까지 동작(데모 안전)

---

## 1) Gemini "Agent Studio" 에이전트 셋업

고래벨은 **배포된 Managed Agent를 ID로 호출**한다. 두 가지 방법 중 택1.

### 공통 준비
- Google AI Studio([aistudio.google.com](https://aistudio.google.com)) 로그인 → **Get API key**로 API 키 발급 → 이게 `GEMINI_API_KEY`.

### 방법 A — Agent Studio UI로 만들기 (코드 없이)
AI Studio 좌측 **Agent Studio(또는 Build → Agents)** 에서 새 에이전트 생성. 설정할 항목과 입력값:

| 항목 | 입력값 |
|---|---|
| **Agent ID / name** | `gorebell-whale-writer` (이 값이 `GEMINI_AGENT_ID`) |
| **Base agent** | `antigravity-preview-05-2026` (현재 유일 지원) |
| **System instruction** | 아래 "시스템 프롬프트" 전체를 붙여넣기 |
| **Tools** | 전부 끔(불필요). 끌 수 없으면 기본값 둬도 됨 |
| **Output** | JSON만 출력하도록 시스템 프롬프트가 강제함 |

### 방법 B — REST로 바로 배포 (터미널)
```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/agents" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -d '{
    "id": "gorebell-whale-writer",
    "base_agent": "antigravity-preview-05-2026",
    "system_instruction": "<아래 시스템 프롬프트>"
  }'
```
→ 생성된 `id`가 `GEMINI_AGENT_ID`.

### 시스템 프롬프트 (그대로 사용)
`src/lib/server/ai.ts`의 `SYSTEM_INSTRUCTION` 상수와 동일하게 넣는다. 핵심 규칙:
- 투자 권유 금지 / 큰손 단정 금지 / "매도→팔다", "위험→주의" / 어려운 용어 금지
- 마지막에 "이 알림은 투자 권유가 아닙니다." 포함
- 출력은 `{"message": "...", "shortBody": "..."}` JSON만

### 호출 방식 (코드가 자동 처리)
```
POST https://generativelanguage.googleapis.com/v1beta/interactions
헤더: x-goog-api-key: GEMINI_API_KEY
바디: { "agent": "<GEMINI_AGENT_ID>", "input": "<이동 JSON>", "environment": "remote" }
```
입력 JSON 예: `{"coinName":"이더리움","symbol":"ETH","fiatKrwApprox":"약 6억 원","direction":"exchange_inflow","impactLevel":"높음"}`

> 참고: Managed Agent(Antigravity)는 샌드박스 기반이라 응답이 수 초~지연될 수 있다. 빠른 응답이 필요하면 `GEMINI_AGENT_ID`를 비우면 **generateContent**(구조화 출력, 빠름)로 자동 폴백한다. 둘 다 실패하면 템플릿.

### 넣을 환경변수
```
GEMINI_API_KEY=...        # 필수(에이전트/모델 둘 다 사용)
GEMINI_AGENT_ID=gorebell-whale-writer   # 배포 에이전트 호출 시
GEMINI_MODEL=gemini-flash-latest        # (선택) generateContent 폴백 모델
```

---

## 2) Alchemy 웹훅 셋업 (실제 온체인 이동 감지)

1. [dashboard.alchemy.com](https://dashboard.alchemy.com) 가입 → 앱 생성(**Ethereum Mainnet**)
2. **Webhooks → Create Webhook → "Address Activity"**
3. **Webhook URL**: `https://<배포도메인>/api/webhooks/alchemy`
4. **Addresses**: 감시할 거래소 입금 주소(또는 큰손 주소)를 등록
   - 추적 토큰(WLD/USDT 컨트랙트, ETH 네이티브)은 코드에서 필터링함 (`src/lib/domain/exchanges.ts`)
5. 생성 후 받은 **Signing Key** → 환경변수 `ALCHEMY_WEBHOOK_SIGNING_KEY`
   - 설정 시 `x-alchemy-signature`(HMAC-SHA256) 검증 활성화

### 거래소 주소 라벨링
`src/lib/domain/exchanges.ts`의 `EXCHANGE_ADDRESSES`에 거래소 핫월렛 주소를 추가하면, `to`가 거래소면 `exchange_inflow`(팔기 준비 신호)로 분류된다. 무료 라벨 소스 한계로 주요 거래소만 큐레이션돼 있다.

---

## 3) 모의 트리거 (해커톤 데모)

키/웹훅 없이도 **전체 파이프라인**(AI 멘트 + 실제 SMS)을 시연:
```bash
curl -X POST "https://<도메인>/api/dev/simulate" \
  -H "Content-Type: application/json" \
  -d '{"coinSymbol":"ETH","krw":600000000,"direction":"exchange_inflow"}'
```
→ 가짜 ETH 6억 이동을 만들어 해당 코인 구독자에게 실제 문자 발송. `created[].delivery`로 발송 여부 확인.

---

## 환경변수 요약

| 변수 | 용도 | 없을 때 |
|---|---|---|
| `GEMINI_API_KEY` | AI 멘트(에이전트/모델) | 템플릿 폴백 |
| `GEMINI_AGENT_ID` | 배포 에이전트 호출 | generateContent 폴백 |
| `GEMINI_MODEL` | 폴백 모델명 | `gemini-flash-latest` |
| `ALCHEMY_WEBHOOK_SIGNING_KEY` | 웹훅 서명 검증 | 검증 생략(수신은 됨) |
| `SOLAPI_*` | 실제 문자 발송 | preview_only |
