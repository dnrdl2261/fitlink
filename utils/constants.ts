import { Platform, StatusBar } from 'react-native';
import { GeoCoordinate } from '../types';

// 탭 화면 상단 헤더 높이.
// react-navigation 기본값은 iOS만 44이고 웹·안드로이드는 64라 지나치게 두껍다(getDefaultHeaderHeight).
// 지정한 height에는 상태바 영역이 포함되므로 안드로이드는 상태바 높이를 더해준다.
// iOS는 노치·다이나믹아일랜드 보정이 기본 계산에 들어 있어 그대로 둔다(undefined = 기본값 유지).
export const HEADER_HEIGHT =
  Platform.OS === 'web' ? 44
  : Platform.OS === 'android' ? 44 + (StatusBar.currentHeight ?? 0)
  : undefined;

// 위치 권한 거부 시 폴백 좌표 = 부산시청.
// ⚠️ 서비스 데이터(공공데이터 헬스장)가 현재 부산만 적재돼 있어 서울로 두면 지도가 텅 빈 것처럼 보인다.
//    전국으로 확장하면 사용자 접속 지역 기준으로 다시 검토할 것.
export const DEFAULT_COORDINATE: GeoCoordinate = {
  latitude: 35.1798,
  longitude: 129.075,
};

// 지도 화면의 "○○ 중심 기준" 칩 문구. DEFAULT_COORDINATE와 함께 바꿔야 어긋나지 않는다.
export const DEFAULT_LOCATION_LABEL = '부산';

// 수수료율 10%
export const PLATFORM_FEE_RATE = 0.1;

// PT 회차권 유효기간(개월). 환불정책 문서·결제 화면 고지·만료 처리가 모두 이 값을 참조한다.
// ⚠️ 토스페이먼츠에 '서비스 종료까지 기간 12개월'로 신고한 값이므로 바꾸려면 PG 신고 내용도 함께 정정할 것.
export const SESSION_PASS_VALIDITY_MONTHS = 12;

// 트레이너의 세션 완료 요청 후 회원이 무응답이면 자동 확정되는 기간(일).
// 이 값이 없으면 회원이 확인을 안 할 때 정산이 영구히 멈춘다.
// 환불정책 문서 고지와 auto-confirm-sessions Edge Function이 같은 값을 써야 한다.
export const SESSION_AUTO_CONFIRM_DAYS = 7;

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
  pending: '확정 대기',
  active: '이용중',
  completed: '완료',
  cancelled: '취소됨',
  refunded: '환불됨',
};

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  active: '#16a34a',
  completed: '#8080A0',
  cancelled: '#F87171',
  refunded: '#A855F7',
};

export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
// 요일 표시 순서: 월→일 (일요일이 맨 뒤). 모든 화면 공통 정렬 기준
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// 회원/트레이너 결제 화면 공통 결제수단 (MaterialCommunityIcons 이름)
export const PAY_METHODS = [
  { id: 'card',    label: '신용카드',   icon: 'credit-card-outline' },
  { id: 'kakao',   label: '카카오페이', icon: 'chat-outline' },
  { id: 'naver',   label: '네이버페이', icon: 'alpha-n-box' },
  { id: 'toss',    label: '토스',       icon: 'currency-krw' },
  { id: 'account', label: '계좌이체',   icon: 'bank-outline' },
];
