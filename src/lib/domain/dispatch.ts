import crypto from "node:crypto";
import type { AlertDelivery } from "../types";

/**
 * [B-6 발송] 문자 발송.
 * SOLAPI 키(SOLAPI_API_KEY/SOLAPI_API_SECRET/SOLAPI_SENDER)가 모두 있으면 실제 발송,
 * 하나라도 없으면 미리보기만 적재("데모는 미리보기만").
 * 발송 중 오류가 나도 화면에는 남도록 preview_only로 폴백한다.
 *
 * SOLAPI 인증: HMAC-SHA256(date + salt) 서명 헤더.
 * https://developers.solapi.com
 */
export async function dispatch(
  phone: string,
  message: string,
): Promise<AlertDelivery> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const sender = process.env.SOLAPI_SENDER;

  if (!apiKey || !apiSecret || !sender) {
    return "preview_only";
  }

  try {
    const date = new Date().toISOString();
    const salt = crypto.randomBytes(32).toString("hex");
    const signature = crypto
      .createHmac("sha256", apiSecret)
      .update(date + salt)
      .digest("hex");

    const res = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
      },
      body: JSON.stringify({
        message: {
          to: phone.replace(/[^0-9]/g, ""),
          from: sender.replace(/[^0-9]/g, ""),
          text: message,
        },
      }),
    });

    if (!res.ok) {
      console.error("SOLAPI send failed", res.status, await res.text());
      return "preview_only";
    }
    return "sent";
  } catch (err) {
    console.error("SOLAPI send error", err);
    return "preview_only";
  }
}
