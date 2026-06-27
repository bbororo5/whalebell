import crypto from "node:crypto";

/**
 * 휴대폰 번호 보호.
 * - hashPhone: HMAC-SHA256 결정적 해시 → 동등 조회(인덱스)용. 평문 복원 불가.
 * - encryptPhone/decryptPhone: AES-256-GCM → 실제 발송·표시를 위한 가역 암호화.
 *
 * 키는 환경변수에서 읽는다.
 *  - PHONE_ENC_KEY:   32바이트 키 (base64 또는 hex). 없으면 개발용 기본키(경고).
 *  - PHONE_HASH_SECRET: 해시용 시크릿 문자열.
 */

function getEncKey(): Buffer {
  const raw = process.env.PHONE_ENC_KEY;
  if (!raw) {
    // 개발 편의용 기본키. 운영에서는 반드시 env로 설정한다.
    return crypto.createHash("sha256").update("whalebell-dev-enc-key").digest();
  }
  // base64(44자) 또는 hex(64자) 모두 허용
  const buf =
    raw.length === 64 ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("PHONE_ENC_KEY must decode to 32 bytes");
  }
  return buf;
}

function getHashSecret(): string {
  return process.env.PHONE_HASH_SECRET ?? "whalebell-dev-hash-secret";
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

/** 동등 조회용 결정적 해시(hex). 같은 번호 → 항상 같은 값. */
export function hashPhone(phone: string): string {
  return crypto
    .createHmac("sha256", getHashSecret())
    .update(normalizePhone(phone))
    .digest("hex");
}

/** AES-256-GCM 암호화 → "ivB64.tagB64.ctB64" */
export function encryptPhone(phone: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncKey(), iv);
  const ct = Buffer.concat([
    cipher.update(normalizePhone(phone), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

export function decryptPhone(enc: string): string {
  const [ivB64, tagB64, ctB64] = enc.split(".");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return pt.toString("utf8");
}

/** 표시용 마스킹: 01012345678 → 010-****-5678 */
export function maskPhone(phone: string): string {
  const d = normalizePhone(phone);
  if (d.length < 7) return "***";
  const head = d.slice(0, 3);
  const tail = d.slice(-4);
  return `${head}-****-${tail}`;
}
