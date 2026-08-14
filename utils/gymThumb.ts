// 사진 없는 헬스장 썸네일용 이니셜·색 계산 (컴포넌트에서 분리 — 테스트 가능하도록).

// 같은 헬스장은 항상 같은 색이 나오도록 이름 해시로 고른다.
export const PALETTE = ['#4F63F5', '#22A06B', '#E8833A', '#D6455D', '#7A5AF8', '#0E9BA8', '#B0873B'];

// ⚠️ `h*31 + code` 방식은 쓰지 말 것. 한글 음절은 초성이 바뀔 때 코드가 588씩 차이 나는데
//    588*31 = 18228 이 팔레트 크기 7의 배수라, '가짐/나짐/다짐…'이 전부 같은 색이 된다(테스트로 발견).
//    자릿수를 충분히 섞는 FNV-1a를 쓴다.
export function colorFor(name: string): string {
  let h = 0x811c9dc5;
  const s = name || '';
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}

/**
 * 썸네일에 넣을 글자.
 * 한글·숫자 등은 첫 글자, 영문은 최대 두 글자(단어가 둘 이상이면 각 단어 첫 글자).
 * 공백만 있거나 비면 fallback으로 대체한다(빈 원이 뜨는 걸 막기 위해).
 * 사람 아바타(Avatar)는 '짐'이 어색하므로 fallback을 따로 넘긴다.
 */
export function initialsOf(name: string, fallback: string = '짐'): string {
  const t = (name || '').trim();
  if (!t) return fallback;
  if (/^[A-Za-z]/.test(t)) {
    const words = t.split(/\s+/).filter(Boolean);
    const v = words.length > 1 ? words[0][0] + words[1][0] : t.slice(0, 2);
    return v.toUpperCase();
  }
  // 이모지·서로게이트 페어가 깨지지 않도록 코드포인트 단위로 자른다.
  return Array.from(t)[0];
}
