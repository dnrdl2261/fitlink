import { withRo } from '../utils/formatters';

describe("조사 '(으)로'", () => {
  test('받침이 있으면 으로', () => {
    expect(withRo('회원')).toBe('회원으로');
    expect(withRo('관리인')).toBe('관리인으로');
  });

  test('받침이 없으면 로', () => {
    expect(withRo('PT 트레이너')).toBe('PT 트레이너로');
    expect(withRo('헬스장 관리자')).toBe('헬스장 관리자로');
  });

  test("받침 'ㄹ'은 로", () => {
    expect(withRo('서울')).toBe('서울로');
  });

  test('한글이 아니면 로로 둔다', () => {
    expect(withRo('VIP')).toBe('VIP로');
    expect(withRo('')).toBe('로');
  });
});
