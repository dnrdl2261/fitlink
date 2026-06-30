import { formatPrice, formatDate } from '../utils/formatters';
import { calculateDistance } from '../utils/distance';

describe('formatters', () => {
  test('formatPrice는 천단위 콤마와 원을 붙인다', () => {
    expect(formatPrice(88000)).toBe('88,000원');
    expect(formatPrice(0)).toBe('0원');
    expect(formatPrice(1234567)).toBe('1,234,567원');
  });

  test('formatDate는 YYYY-MM-DD를 한국어로 변환한다', () => {
    expect(formatDate('2026-07-01')).toBe('2026년 07월 01일');
  });
});

describe('distance (Haversine)', () => {
  test('같은 좌표는 거리 0', () => {
    const c = { latitude: 37.5, longitude: 127.0 };
    expect(calculateDistance(c, c)).toBe(0);
  });

  test('강남역~역삼역은 약 1km 내외', () => {
    const gangnam = { latitude: 37.4979, longitude: 127.0276 };
    const yeoksam = { latitude: 37.5006, longitude: 127.0364 };
    const d = calculateDistance(gangnam, yeoksam);
    expect(d).toBeGreaterThan(0.5);
    expect(d).toBeLessThan(1.5);
  });
});
