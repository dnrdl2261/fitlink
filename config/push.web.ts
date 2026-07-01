// 푸시 알림 (웹) — 네이티브 푸시 미지원이므로 no-op.
// (웹 푸시(Web Push API)는 별도 구현 대상 — 현재는 인앱 알림만 사용.)
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  return null;
}
