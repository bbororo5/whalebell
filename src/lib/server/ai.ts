import { GoogleAuth } from "google-auth-library";
import type { AlertExplainContext } from "../domain/alert-context";
import { buildAgentPayload } from "../domain/alert-context";
import { generateSeniorMessage, generateShortMessage } from "../sms";

/**
 * AI Agent 멘트 생성 — Google Agent Platform(I/O 2026) 방식.
 *
 * 시니어 해설 3축(규모·방향·의미)을 위해 이미 fetch된 이동·시세·시총% 컨텍스트를
 * 에이전트에 JSON으로 넘긴다. 실패 시 풍부한 템플릿 폴백.
 */

export type AiCopyInput = AlertExplainContext;

export interface AiCopyResult {
  message: string;
  shortBody: string;
  source: "agent" | "template";
}

const LOCATION = "global";
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 12;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    shortBody: { type: "string" },
  },
  required: ["message", "shortBody"],
};

/**
 * Agent Studio system_instruction 과 동일하게 유지.
 * scripts/agent-config.json 에도 같은 내용을 반영한다.
 */
export const SYSTEM_INSTRUCTION = `너는 "고래벨"의 알림 문자 작성기다. 큰손 코인 이동 사실(JSON)을 받아, 시니어(노년층)도 이해하기 쉬운 한국어 안내 문자를 쓴다.

## 해설 축 (반드시 이 순서로 풍부하게)
1. **규모** — 원화 금액(fiatKrwApprox)을 먼저 말한다. marketCapPctApprox가 "확인되지 않음"이 아니면 "이 코인 전체 가치의 약 N%"처럼 상대 크기도 설명한다.
2. **방향** — direction.seniorLabel, fromLabel→toLabel로 "어디서 어디로" 옮겨졌는지 쉽게 말한다.
3. **의미** — direction.meaningHint를 바탕으로 "무엇을 의미할 수 있는지" 설명하되, 단정하지 않는다("~일 수 있습니다").

impactHint는 참고용이다. 그대로 복붙하지 말고, facts와 scale을 보고 자연스럽게 풀어쓴다.

## 반드시 지킬 규칙
- 투자 권유/매수·매도 추천을 절대 하지 않는다.
- 어려운 단어 금지(온체인, 트랜잭션, 컨트랙트, 지갑 금지 → "계좌"). "매도" 대신 "팔다", "위험" 대신 "주의".
- 큰손·세력을 단정하지 않는다. 지갑 주인은 확인되지 않았음을 명시한다.
- 놀라서 바로 사고팔지 말라고 안내한다.
- 마지막에 "이 알림은 투자 권유가 아닙니다."를 넣는다.
- 과장/공포 조장 금지. 차분하게 알리되 안심시킨다.

## 출력
- message: 8~14줄 전체 안내 문자(규모·방향·의미·안심 문구 포함)
- shortBody: 4~6줄 요약(규모 1문장 + 방향 1문장 + 의미 1문장 + 행동 안내 1문장)
- JSON만 출력: {"message":"...","shortBody":"..."}

## Few-shot 예시 1
입력:
{"facts":{"coinName":"이더리움","symbol":"ETH","tokenAmount":"150 ETH","fiatKrwApprox":"약 7.5억 원","detectedAtRelative":"33분 전","fromLabel":"많은 양을 보유한 큰손 계좌","toLabel":"바이낸스 거래소"},"scale":{"marketCapPctApprox":"약 0.02%","impactHint":"높음"},"direction":{"seniorLabel":"거래소로 들어감","meaningHint":"거래소로 옮긴 코인은 팔 준비일 수 있지만, 아직 판 것은 아닙니다."}}

출력:
{"message":"[주의] 이더리움(ETH) 큰손 이동 알림\\n\\n33분 전, 많은 양을 보유한 큰손 계좌에서 이더리움 150개(현재 시세로 약 7.5억 원)가 바이낸스 거래소로 옮겨졌습니다.\\n\\n이번 이동은 이더리움 전체 가치의 약 0.02%에 해당하는 규모입니다.\\n\\n거래소로 옮긴 코인은 팔 준비일 수 있지만, 아직 실제로 팔았다는 뜻은 아닙니다.\\n\\n이 계좌의 주인이 누구인지는 확인되지 않았습니다.\\n\\n놀라서 바로 사거나 팔지 말고, 추가 움직임을 함께 확인하세요.\\n\\n이 알림은 투자 권유가 아닙니다.","shortBody":"[주의] 이더리움 큰손 이동\\n\\n약 7.5억 원(150 ETH)이 바이낸스 거래소로 옮겨졌습니다(33분 전).\\n\\n이더리움 전체 가치의 약 0.02% 규모입니다.\\n\\n팔 준비일 수 있지만, 아직 판 것은 아닙니다.\\n\\n바로 사고팔지 말고 추가 움직임을 확인하세요."}

## Few-shot 예시 2
입력:
{"facts":{"coinName":"월드코인","symbol":"WLD","tokenAmount":"400,000 WLD","fiatKrwApprox":"약 12.1억 원","detectedAtRelative":"2시간 전","fromLabel":"많은 양을 보유한 큰손 계좌","toLabel":"업비트 거래소"},"scale":{"marketCapPctApprox":"약 0.15%","impactHint":"높음"},"direction":{"seniorLabel":"거래소로 들어감","meaningHint":"거래소로 옮긴 코인은 팔 준비일 수 있지만, 아직 판 것은 아닙니다."}}

출력:
{"message":"[주의] 월드코인(WLD) 큰손 이동 알림\\n\\n2시간 전, 큰손 계좌에서 월드코인 40만 개(약 12.1억 원)가 업비트 거래소로 옮겨졌습니다.\\n\\n월드코인 전체 가치의 약 0.15%에 해당하는, 비교적 큰 이동입니다.\\n\\n거래소로 들어간 코인은 팔기 위한 준비일 수 있지만, 지금 팔았다고 보기는 어렵습니다.\\n\\n누가 옮겼는지는 확인되지 않았습니다.\\n\\n가격이 흔들릴 수 있으니, 당장 거래하기보다 추가 움직임을 지켜보세요.\\n\\n이 알림은 투자 권유가 아닙니다.","shortBody":"[주의] 월드코인 큰손 이동\\n\\n약 12.1억 원(40만 WLD)이 업비트로 옮겨졌습니다(2시간 전).\\n\\n전체 가치의 약 0.15% 규모입니다.\\n\\n팔 준비일 수 있으나, 아직 판 것은 아닙니다.\\n\\n바로 사고팔지 말고 추가 확인하세요."}`;

let cachedToken: { token: string; exp: number } | null = null;

function readSaKey(): string | null {
  const b64 = process.env.GCP_SA_KEY_BASE64;
  if (b64) {
    try {
      return Buffer.from(b64, "base64").toString("utf8");
    } catch {
      return null;
    }
  }
  return process.env.GCP_SA_KEY ?? null;
}

async function getAccessToken(): Promise<string | null> {
  const rawKey = readSaKey();
  if (!rawKey) return null;
  if (cachedToken && Date.now() < cachedToken.exp) return cachedToken.token;
  try {
    const credentials = JSON.parse(rawKey);
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const res = await client.getAccessToken();
    const token = res.token ?? null;
    if (!token) return null;
    cachedToken = { token, exp: Date.now() + 50 * 60_000 };
    return token;
  } catch {
    return null;
  }
}

function extractText(data: {
  outputs?: { text?: string }[];
  output_text?: string;
}): string {
  if (typeof data.output_text === "string") return data.output_text;
  if (Array.isArray(data.outputs)) {
    return data.outputs.map((o) => o?.text ?? "").join("");
  }
  return "";
}

function parseJson(text: string): { message: string; shortBody: string } | null {
  try {
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

async function callAgent(
  input: AiCopyInput,
): Promise<{ message: string; shortBody: string } | null> {
  const projectId = process.env.GCP_PROJECT_ID;
  const agentId = process.env.GEMINI_AGENT_ID;
  if (!projectId || !agentId) return null;

  const token = await getAccessToken();
  if (!token) return null;

  const base = `https://aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${LOCATION}/interactions`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    const startRes = await fetch(base, {
      method: "POST",
      headers,
      body: JSON.stringify({
        agent: agentId,
        input: buildAgentPayload(input),
        environment: { type: "remote" },
        background: true,
        store: true,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!startRes.ok) return null;
    const start = await startRes.json();
    const id: string | undefined = start?.id;
    if (!id) return null;
    if (start?.status === "completed") {
      return parseJson(extractText(start));
    }

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const pollRes = await fetch(`${base}/${id}`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(15_000),
      });
      if (!pollRes.ok) continue;
      const poll = await pollRes.json();
      if (poll?.status === "completed") {
        return parseJson(extractText(poll));
      }
      if (poll?.status === "failed" || poll?.status === "cancelled") {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** 멘트 생성 단일 진입점. 항상 결과를 돌려준다(최후엔 템플릿). */
export async function generateAlertCopy(
  input: AiCopyInput,
): Promise<AiCopyResult> {
  const agent = await callAgent(input);
  if (agent) return { ...agent, source: "agent" };

  return {
    message: generateSeniorMessage(input),
    shortBody: generateShortMessage(input),
    source: "template",
  };
}
