// zustand/middleware(persist)는 내부 devtools 코드가 import.meta.env 를 사용하는데,
// Metro 웹 번들(일반 스크립트)에서는 import.meta 가 런타임 오류를 일으켜 흰 화면이 난다.
// → middleware 없이 localStorage 영속화를 직접 구현한다. (웹 전용, 네이티브/차단 환경에선 안전한 no-op)

// 영속 스키마 버전. 시드/구조를 바꿔 옛 저장값이 새 코드와 안 맞을 때 이 숫자를 올리면,
// 다음 로드 시 모든 옛 localStorage 값이 자동으로 무시(초기화)되고 새 시드가 적용된다.
const PERSIST_VERSION = 2;

const getLS = (): any => {
  try { return (globalThis as any).localStorage ?? null; } catch { return null; }
};

// 저장된 값을 fallback 위에 병합해 초기 상태로 반환.
// 버전이 다르거나 없거나 실패 시 fallback(새 시드).
export function loadPersisted<T extends object>(key: string, fallback: T): T {
  try {
    const raw = getLS()?.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.__v !== PERSIST_VERSION) return fallback; // 버전 불일치 → 옛 데이터 폐기
    const { __v, ...data } = parsed;
    return { ...fallback, ...data };
  } catch {
    return fallback;
  }
}

// store 변경 시마다 pick한 부분만(버전 태그 포함) localStorage에 저장
export function persistOnChange<S>(
  store: { getState: () => S; subscribe: (listener: (s: S) => void) => void },
  key: string,
  pick: (s: S) => object
): void {
  try {
    store.subscribe((s) => {
      try { getLS()?.setItem(key, JSON.stringify({ __v: PERSIST_VERSION, ...pick(s) })); } catch { /* 저장 실패 무시 */ }
    });
  } catch { /* subscribe 실패 무시 */ }
}
