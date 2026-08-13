import { passExpiryFrom, isPassExpired } from '../utils/pass';
import { SESSION_PASS_VALIDITY_MONTHS } from '../utils/constants';

describe('회차권 유효기간 (환불정책 제5조)', () => {
  test('약관에 고지한 기간과 코드 상수가 일치한다', () => {
    // 토스페이먼츠에 '12개월'로 신고한 값. 바꾸려면 PG 신고 내용도 함께 정정해야 한다.
    expect(SESSION_PASS_VALIDITY_MONTHS).toBe(12);
  });

  test('만료일 = 결제일 + 12개월', () => {
    const paid = new Date('2026-08-12T00:00:00.000Z');
    expect(passExpiryFrom(paid)).toBe(new Date('2027-08-12T00:00:00.000Z').toISOString());
  });

  test('결제일을 변경하지 않는다(부수효과 없음)', () => {
    const paid = new Date('2026-08-12T00:00:00.000Z');
    passExpiryFrom(paid);
    expect(paid.toISOString()).toBe('2026-08-12T00:00:00.000Z');
  });

  test('윤년 2월 29일 구매도 유효기간이 짧아지지 않는다', () => {
    // 2028-02-29 + 12개월 → 2029-02-29는 없으므로 3월 1일로 넘어간다(회원에게 불리하지 않음).
    const paid = new Date('2028-02-29T00:00:00.000Z');
    const expiry = new Date(passExpiryFrom(paid));
    expect(expiry.getTime()).toBeGreaterThan(new Date('2029-02-28T00:00:00.000Z').getTime());
  });

  test('만료 전에는 만료로 보지 않는다', () => {
    const expiry = '2027-08-12T00:00:00.000Z';
    expect(isPassExpired(expiry, new Date('2027-08-11T23:59:59.000Z'))).toBe(false);
  });

  test('만료 시각이 지나면 만료로 본다', () => {
    const expiry = '2027-08-12T00:00:00.000Z';
    expect(isPassExpired(expiry, new Date('2027-08-12T00:00:01.000Z'))).toBe(true);
  });

  test('유효기간 도입 전 구매분(expiresAt 없음)은 만료시키지 않는다', () => {
    expect(isPassExpired(undefined)).toBe(false);
  });
});
