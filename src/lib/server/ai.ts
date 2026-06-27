import type { Coin, ImpactLevel } from "../types";
import { formatKrwApprox } from "../utils";
import { generateSeniorMessage, generateShortMessage } from "../sms";

/**
 * AI Agent 멘트 생성.
 * 우선순위:
 *  1) Gemini Managed Agent (Agent Studio에서 배포한 에이전트) — GEMINI_AGENT_ID + GEMINI_API_KEY
 *  2) Gemini generateContent (구조화 출력) — GEMINI_API_KEY 만 있을 때
 *  3) 고정 템플릿 폴백 — 키가 없거나 실패 시 (절대 끊기지 않음)
 *
 * 입력은 "이동 사실"의 구조화 데이터, 출력은 시니어용 문자 본문이다.
 */

export interface AiCopyInput {
  coin: Pick<Coin, "name" | "symbol">;
  fiatKrw: number;
  impactLevel: ImpactLevel;
  direction: string;
}

export interface AiCopyResult {
  message: string; // 전체 문자(LMS)
  shortBody: string; // HOME/미리보기용 짧은 본문
  source: "agent" | "model" | "template";
}

const TIMEOUT_MS = 12_000;

function buildPromptInput(input: AiCopyInput): string {
  return JSON.stringify({
    coinName: input.coin.name,
    symbol: input.coin.symbol,
    fiatKrwApprox: formatKrwApprox(input.fiatKrw),
    direction: input.direction,
    impactLevel: input.impactLevel,
  });
}

/** 브랜드 규칙(시니어 친화·안전 문구). Agent Studio에도 동일하게 넣는다. */
export const SYSTEM_INSTRUCTION = `너는 "고래벨"의 알림 문자 작성기다. 큰손 계좌의 코인 이동 사실(JSON)을 받아, 시니어(노년층)도 이해하기 쉬운 한국어 안내 문자를 쓴다.

반드시 지킬 규칙:
- 투자 권유/매수·매도 추천을 절대 하지 않는다.
- 어려운 단어 금지(온체인, 트랜잭션, 컨트랙트, 지갑 금지 → "계좌"로). "매도" 대신 "팔다", "위험" 대신 "주의".
- 큰손을 단정하지 않는다("~일 수 있습니다"). 실제로 팔았다는 뜻이 아님을 명시한다.
- 놀라서 바로 사고팔지 말라고 안내한다.
- 마지막에 "이 알림은 투자 권유가 아닙니다."를 넣는다.
- 과장/공포 조장 금지. 차분하게 알리되 안심시킨다.

출력은 반드시 아래 JSON 형식만 출력한다(다른 텍스트 금지):
{"message": "전체 안내 문자(여러 줄)", "shortBody": "3~4줄 요약 문자"}`;

function parseAiJson(text: string): { message: string; shortBody: string } | null {
  try {
    // 코드펜스/잡텍스트 안의 첫 JSON 오브젝트만 추출
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const obj = JSON.parse(match[0]);
    if (typeof obj.message === "string" && typeof obj.shortBody === "string") {
      return { message: obj.message, shortBody: obj.shortBody };
    }
    return null;
  } catch {
    return null;
  }
}

/** 1) 배포된 Managed Agent 호출 (interactions API) */
async function callManagedAgent(
  input: AiCopyInput,
): Promise<{ message: string; shortBody: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  const agentId = process.env.GEMINI_AGENT_ID;
  if (!apiKey || !agentId) return null;
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          agent: agentId,
          input: buildPromptInput(input),
          environment: "remote",
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text: string =
      data?.output_text ??
      data?.outputText ??
      data?.output?.map?.((o: { text?: string }) => o?.text ?? "").join("\n") ??
      "";
    return parseAiJson(text);
  } catch {
    return null;
  }
}

/** 2) generateContent 구조화 출력 호출 */
async function callGenerateContent(
  input: AiCopyInput,
): Promise<{ message: string; shortBody: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: "user", parts: [{ text: buildPromptInput(input) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                message: { type: "STRING" },
                shortBody: { type: "STRING" },
              },
              required: ["message", "shortBody"],
            },
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return parseAiJson(text);
  } catch {
    return null;
  }
}

/** 멘트 생성 단일 진입점. 항상 결과를 돌려준다(최후엔 템플릿). */
export async function generateAlertCopy(
  input: AiCopyInput,
): Promise<AiCopyResult> {
  const agent = await callManagedAgent(input);
  if (agent) return { ...agent, source: "agent" };

  const model = await callGenerateContent(input);
  if (model) return { ...model, source: "model" };

  return {
    message: generateSeniorMessage({
      coin: input.coin,
      fiatKrw: input.fiatKrw,
      impactLevel: input.impactLevel,
    }),
    shortBody: generateShortMessage({
      coin: input.coin,
      fiatKrw: input.fiatKrw,
      impactLevel: input.impactLevel,
    }),
    source: "template",
  };
}
