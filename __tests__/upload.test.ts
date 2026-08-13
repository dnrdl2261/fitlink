import { fitWithin, isLocalUri, mimeFromUri } from '../utils/upload';

describe('확장자 → MIME 판별 (네이티브는 Blob.type이 없다)', () => {
  test('이미지 확장자', () => {
    expect(mimeFromUri('file:///a/b.jpg')).toBe('image/jpeg');
    expect(mimeFromUri('file:///a/b.JPEG')).toBe('image/jpeg');
    expect(mimeFromUri('file:///a/b.png')).toBe('image/png');
    expect(mimeFromUri('file:///a/b.heic')).toBe('image/heic');
  });

  test('영상 확장자', () => {
    expect(mimeFromUri('file:///a/v.mp4')).toBe('video/mp4');
    expect(mimeFromUri('file:///a/v.mov')).toBe('video/quicktime');
  });

  test('쿼리스트링이 붙어도 판별한다', () => {
    expect(mimeFromUri('file:///a/b.png?x=1')).toBe('image/png');
  });

  test('알 수 없으면 jpeg로 둔다(업로드를 막지 않기 위해)', () => {
    expect(mimeFromUri('file:///a/b')).toBe('image/jpeg');
    expect(mimeFromUri('blob:https://x/abc-def')).toBe('image/jpeg');
  });
});

describe('업로드 이미지 축소 크기 계산', () => {
  test('긴 변이 기준 이하면 축소하지 않는다', () => {
    expect(fitWithin(1600, 900)).toBeNull();
    expect(fitWithin(800, 600)).toBeNull();
    expect(fitWithin(1600, 1600)).toBeNull();
  });

  test('가로가 긴 이미지는 가로를 기준에 맞춘다', () => {
    expect(fitWithin(3200, 1800)).toEqual({ w: 1600, h: 900 });
  });

  test('세로가 긴 이미지는 세로를 기준에 맞춘다', () => {
    expect(fitWithin(1800, 3200)).toEqual({ w: 900, h: 1600 });
  });

  test('비율을 유지한다', () => {
    const r = fitWithin(4000, 3000)!;
    expect(r.w / r.h).toBeCloseTo(4000 / 3000, 2);
  });

  test('극단적으로 긴 이미지도 0px이 되지 않는다', () => {
    const r = fitWithin(20000, 5)!;
    expect(r.w).toBe(1600);
    expect(r.h).toBeGreaterThanOrEqual(1);
  });

  test('잘못된 크기는 축소 대상이 아니다', () => {
    expect(fitWithin(0, 100)).toBeNull();
    expect(fitWithin(100, 0)).toBeNull();
    expect(fitWithin(NaN, 100)).toBeNull();
  });

  test('기준값을 바꿔 쓸 수 있다', () => {
    expect(fitWithin(2000, 1000, 500)).toEqual({ w: 500, h: 250 });
  });
});

describe('로컬 uri 판별', () => {
  test('blob:/file: 은 로컬로 본다', () => {
    expect(isLocalUri('blob:https://example.com/abc')).toBe(true);
    expect(isLocalUri('file:///var/mobile/x.jpg')).toBe(true);
  });

  test('이미 업로드된 원격 URL은 로컬이 아니다', () => {
    expect(isLocalUri('https://xxx.supabase.co/storage/v1/object/public/media/a.jpg')).toBe(false);
    expect(isLocalUri('http://example.com/a.jpg')).toBe(false);
  });

  test('값이 없으면 false', () => {
    expect(isLocalUri(undefined)).toBe(false);
    expect(isLocalUri('')).toBe(false);
  });
});
