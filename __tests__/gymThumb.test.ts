import { colorFor, initialsOf, PALETTE } from '../utils/gymThumb';

describe('헬스장 썸네일 이니셜', () => {
  test('한글은 첫 글자', () => {
    expect(initialsOf('금강헬스클럽')).toBe('금');
    expect(initialsOf('오케이피트니스 남포점')).toBe('오');
  });

  test('영문은 두 글자 (단어가 둘 이상이면 각 첫 글자)', () => {
    expect(initialsOf('CrossFit ASLAN')).toBe('CA');
    expect(initialsOf('Gymmy')).toBe('GY');
  });

  test('앞뒤 공백을 무시한다', () => {
    expect(initialsOf('  바디업 헬스  ')).toBe('바');
  });

  test('빈 이름은 기본값으로 대체한다', () => {
    expect(initialsOf('')).toBe('짐');
    expect(initialsOf('   ')).toBe('짐');
  });

  test('숫자·기호로 시작해도 깨지지 않는다', () => {
    expect(initialsOf('404 피트니스')).toBe('4');
    expect(initialsOf('(주)스마트짐')).toBe('(');
  });
});

describe('헬스장 썸네일 색상', () => {
  test('같은 이름은 항상 같은 색', () => {
    expect(colorFor('금강헬스클럽')).toBe(colorFor('금강헬스клуб'.replace('клуб', '클럽')));
    expect(colorFor('A')).toBe(colorFor('A'));
  });

  test('팔레트 안의 색만 나온다', () => {
    ['금강헬스클럽', 'CrossFit', '404 피트니스', '', 'ㅁ'].forEach((n) => {
      expect(PALETTE).toContain(colorFor(n));
    });
  });

  test('이름이 다르면 색이 갈린다(전부 같지는 않다)', () => {
    const names = ['가짐', '나짐', '다짐', '라짐', '마짐', '바짐', '사짐', '아짐'];
    const uniq = new Set(names.map(colorFor));
    expect(uniq.size).toBeGreaterThan(1);
  });
});
