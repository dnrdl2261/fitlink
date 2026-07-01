import { captureError } from '../config/sentry';

// Supabase fire-and-forget 쓰기 실패 핸들러.
// 이 앱은 낙관적 로컬-우선 저장(로컬 반영 후 서버 미러)이라 UX는 막지 않되,
// 서버 저장 실패(네트워크/RLS 등)를 조용히 삼키지 않고 개발 콘솔 + Sentry(웹)로 추적한다.
export function onDbError(err: unknown): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[DB write failed]', err);
  }
  captureError(err);
}
