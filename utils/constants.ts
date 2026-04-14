import { GeoCoordinate } from '../types';

// 서울시청 기본 좌표 (위치 권한 거부 시 폴백)
export const DEFAULT_COORDINATE: GeoCoordinate = {
  latitude: 37.5665,
  longitude: 126.978,
};

// 수수료율 10%
export const PLATFORM_FEE_RATE = 0.1;

// 앱 테마 색상 (다크 모던)
export const COLORS = {
  primary: '#7C6EE8',        // 인디고 퍼플
  secondary: '#FF6B6B',      // 코랄 레드
  gym: '#2DD4BF',            // 청록 (헬스장 관리자)
  success: '#4ADE80',        // 밝은 초록
  warning: '#FBBF24',        // 앰버
  error: '#F87171',          // 밝은 빨강
  background: '#0D0D14',     // 최어두운 네이비
  surface: '#16161F',        // 어두운 카드
  surfaceElevated: '#1E1E2A',// 살짝 밝은 카드
  text: '#F1F1F5',           // 흰색에 가까운
  textSecondary: '#8080A0',  // 뮤트 퍼플 그레이
  border: '#252535',         // 어두운 테두리
  gradient1: '#7C6EE8',
  gradient2: '#4F46E5',
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: '승인 대기',
  confirmed: '예약 확정',
  in_progress: '진행 중',
  completed: '완료',
  cancelled: '취소됨',
};

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: '#FBBF24',
  confirmed: '#60A5FA',
  in_progress: '#4ADE80',
  completed: '#8080A0',
  cancelled: '#F87171',
};

export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
