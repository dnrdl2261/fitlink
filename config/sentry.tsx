import React from 'react';

// Sentry 에러 모니터링 — 기본(네이티브/비웹)은 no-op.
// 웹은 Metro 플랫폼 확장자에 따라 sentry.web.tsx가 이 파일을 대체한다.
// (네이티브 출시 시 @sentry/react-native를 별도 도입 — 로드맵 C.)
export function initSentry(): void {}
export function captureError(_e: unknown): void {}
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
