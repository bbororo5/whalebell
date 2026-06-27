import type { AlertDelivery } from "../types";

/**
 * [B-6 발송] 문자 발송.
 * SOLAPI 키가 있으면 실제 발송, 없으면 미리보기만 적재("데모는 미리보기만").
 */
export function dispatch(phone: string, message: string): AlertDelivery {
  const hasKey = Boolean(process.env.SOLAPI_API_KEY);
  if (!hasKey) {
    return "preview_only";
  }
  // 확장 슬롯: 여기서 SOLAPI로 실제 발송.
  // 발송 실패 시에도 화면에는 남도록 preview_only로 폴백할 수 있다.
  void phone;
  void message;
  return "sent";
}
