// 결제 추상화 레이어 (기본/네이티브).
// 미설정(데모): 즉시 성공 — 실제 청구 없음. 실 웹 결제는 payment.web.ts(포트원)가 이 파일을 대체한다.
// 활성화: .env 에 EXPO_PUBLIC_PORTONE_STORE_ID / EXPO_PUBLIC_PORTONE_CHANNEL_KEY 추가(계약 후).
// (네이티브 실결제는 @portone/react-native-sdk를 별도 도입 — 로드맵 C.)
import type { PaymentRequest, PaymentResult } from './payment.types';

export type { PaymentRequest, PaymentResult } from './payment.types';

export const isPaymentConfigured =
  !!(process.env.EXPO_PUBLIC_PORTONE_STORE_ID && process.env.EXPO_PUBLIC_PORTONE_CHANNEL_KEY);

// 기본(네이티브/비웹): 데모 결제 — 실제 청구 없음.
export async function requestPayment(_req: PaymentRequest): Promise<PaymentResult> {
  return { success: true, paymentId: `demo_${Date.now()}` };
}
