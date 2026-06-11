import { GeoCoordinate } from '../types';

// 서울시청 기본 좌표 (위치 권한 거부 시 폴백)
export const DEFAULT_COORDINATE: GeoCoordinate = {
  latitude: 37.5665,
  longitude: 126.978,
};

// 수수료율 10%
export const PLATFORM_FEE_RATE = 0.1;

export const COLORS = {
  primary: '#0057ff',
  secondary: '#0057ff',
  gym: '#0057ff',
  primaryLight: '#3d7fff',
  primarySoft: '#99bbff',
  primaryPale: '#e8f0ff',
  brandDeep: '#003dbf',
  success: '#16a34a',
  successBg: '#e8ffea',
  warning: '#d97706',
  error: '#c13515',
  background: '#ffffff',
  surface: '#ffffff',
  surfaceElevated: '#f7f7f7',
  surfaceSubtle: '#f2f2f2',
  text: '#222222',
  textSecondary: '#6a6a6a',
  textMuted: '#929292',
  border: '#dddddd',
  borderSubtle: '#ebebeb',
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  active: '이용중',
  completed: '완료',
  cancelled: '취소됨',
};

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  active: '#16a34a',
  completed: '#8080A0',
  cancelled: '#F87171',
};

export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
