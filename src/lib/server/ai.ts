import { GoogleAuth } from "google-auth-library";
import type { Coin, ImpactLevel } from "../types";
import { formatKrwApprox } from "../utils";
import { generateSeniorMessage, generateShortMessage } from "../sms";

/**
 * AI Agent 멘트 생성 — Google Agent Platform(I/O 2026) 방식.
 *
 * 흐름: 배포된 커스텀 에이전트(GEMINI_AGENT_ID)를 Interactions API로 호출한다.
 *  - 인증: 서비스 계정(GCP_SA_KEY, JSON) OAuth 토큰
 *  - structured output: response_format(JSON schema) 강제
 *  - 에이전트 호출은 background 필수 → interaction id로 폴링
 *  - 실패/미설정 시 고정 템플릿으로 폴백(서비스는 절대 끊기지 않음)
 *
 * 필요한 환경변수:
 *  - GCP_PROJECT_ID
 *  - GEMINI_AGENT_ID (예: gorebell-whale-writer)
 *  - GCP_SA_KEY (서비스 계정 JSON 전체 문자열)
 */

export interface AiCopyInput {
  coin: Pick<Coin, "name" | "symbol">;
  fiatKrw: number;
  impactLevel: ImpactLevel;
  direction: string;
}

export interface AiCopyResult {
  message: string;
  shortBody: string;
  source: "agent" | "template";
}

const LOCATION = "global";
const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 8; // 약 20초

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    shortBody: { type: "string" },
  },
  required: ["message", "shortBody"],
};

function buildInput(input: AiCopyInput): string {
  return JSON.stringify({
    coinName: input.coin.name,
    symbol: input.coin.symbol,
    fiatKrwApprox: formatKrwApprox(input.fiatKrw),
    direction: input.direction,
    impactLevel: input.impactLevel,
  });
}

let cachedToken: { token: string; exp: number } | null = null;

function readSaKey(): string | null {
  // base64(권장) 또는 평문 JSON 모두 허용
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
    // 토큰 캐시(50분)
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
    // 1) background interaction 시작
    const startRes = await fetch(base, {
      method: "POST",
      headers,
      body: JSON.stringify({
        agent: agentId,
        input: buildInput(input),
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

    // 2) 완료까지 폴링
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
