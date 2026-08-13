// PT 회차권 유효기간 계산. 환불정책 제5조와 같은 상수를 참조한다.
import { SESSION_PASS_VALIDITY_MONTHS } from './constants';

// 만료 시각 = 결제일 + 유효기간(개월).
// ⚠️ 구매 시점에 계산해 Booking.expiresAt에 저장할 것. 나중에 약관 기간이 바뀌어도
//    이미 판매된 회차권의 조건은 유지되어야 하므로, 조회 때마다 다시 계산하면 안 된다.
export function passExpiryFrom(paidAt: Date): string {
  const d = new Date(paidAt);
  d.setMonth(d.getMonth() + SESSION_PASS_VALIDITY_MONTHS);
  return d.toISOString();
}

// 만료 여부. expiresAt이 없는 예약(유효기간 도입 전 구매분)은 만료로 보지 않는다.
export function isPassExpired(expiresAt: string | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= now.getTime();
}
