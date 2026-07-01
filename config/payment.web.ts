// 결제 추상화 레이어 (웹) — 포트원 v2 browser-sdk.
// DSN 패턴과 동일: 상점/채널 키 미설정 시 데모(즉시성공, 실제 청구 없음).
// 활성화: .env 에 EXPO_PUBLIC_PORTONE_STORE_ID / EXPO_PUBLIC_PORTONE_CHANNEL_KEY 추가(계약 후 샌드박스/실 채널).
import * as PortOne from '@portone/browser-sdk/v2';
import { supabase } from './supabase';
import type { PaymentRequest, PaymentResult } from './payment.types';

export type { PaymentRequest, PaymentResult } from './payment.types';

const storeId = process.env.EXPO_PUBLIC_PORTONE_STORE_ID ?? '';
const channelKey = process.env.EXPO_PUBLIC_PORTONE_CHANNEL_KEY ?? '';
export const isPaymentConfigured = !!(storeId && channelKey);

export async function requestPayment(req: PaymentRequest): Promise<PaymentResult> {
  // 미설정: 데모 — 실제 청구 없음.
  if (!isPaymentConfigured) {
    return { success: true, paymentId: `demo_${Date.now()}` };
  }
  try {
    const res = await PortOne.requestPayment({
      storeId,
      channelKey,
      paymentId: req.orderId,
      orderName: req.orderName,
      totalAmount: req.amount,
      currency: 'CURRENCY_KRW',
      payMethod: 'CARD',
      customer: req.customerName ? { fullName: req.customerName } : undefined,
    });
    // 응답 없음(창 닫힘) 또는 code 존재 = 실패/취소
    if (!res || res.code != null) {
      return { success: false, message: res?.message ?? '결제가 취소되었습니다.' };
    }
    // 서버 검증(위변조 방지). Edge Function 미배포/시크릿 미설정이면 통과 — 골격 단계.
    try {
      const { data } = await supabase.functions.invoke('verify-payment', {
        body: { paymentId: res.paymentId, expectedAmount: req.amount },
      });
      if (data?.verified === false && data?.reason !== 'not_configured') {
        return { success: false, message: '결제 검증에 실패했습니다. 고객센터에 문의해주세요.' };
      }
    } catch {
      // Edge Function 미배포 — 골격 단계라 통과.
    }
    return { success: true, paymentId: res.paymentId };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : '결제 처리 중 오류가 발생했습니다.' };
  }
}
