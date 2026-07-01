// 결제 추상화 공유 타입 (payment.ts/payment.web.ts 공통).

export interface PaymentRequest {
  orderId: string;      // 가맹점 주문 고유 id
  orderName: string;    // 결제 상품명
  amount: number;       // 결제 금액(원)
  customerName?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;   // 결제 고유 id (포트원 paymentId 또는 데모 id)
  message?: string;     // 실패/취소 사유
}
