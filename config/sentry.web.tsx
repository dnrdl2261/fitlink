import React from 'react';
import * as Sentry from '@sentry/react';

// 웹 에러 모니터링. DSN 미설정 시 완전 비활성(흰화면/노이즈 방지) — Supabase 분기와 동일 패턴.
// 활성화: .env 에 EXPO_PUBLIC_SENTRY_DSN=https://...ingest.sentry.io/... 추가 후 재배포.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function initSentry(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV === 'development' ? 'development' : 'production',
    tracesSampleRate: 0.1,
    sendDefaultPii: false, // 개인정보 자동수집 차단(PT 매칭 앱 — 민감정보 보호)
  });
}

export function captureError(e: unknown): void {
  if (dsn) Sentry.captureException(e);
}

function Fallback() {
  return (
    <div style={{ padding: 24, textAlign: 'center', fontFamily: 'sans-serif', color: '#374151' }}>
      <p style={{ fontWeight: 700, marginBottom: 8 }}>일시적인 문제가 발생했습니다.</p>
      <p style={{ fontSize: 14, color: '#6B7280' }}>페이지를 새로고침 해주세요.</p>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  if (!dsn) return <>{children}</>;
  return <Sentry.ErrorBoundary fallback={<Fallback />}>{children}</Sentry.ErrorBoundary>;
}
