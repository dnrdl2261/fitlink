export type BookingStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'refunded';
// pending = 회원 결제 완료, 트레이너 확정 대기 (확정 시 active)
// refunded = 회원이 잔여(미사용) 세션 전액 환불
export type SessionStatus = 'scheduled' | 'pending' | 'completed' | 'cancelled' | 'no_show';
// pending = 트레이너가 완료를 요청하고 회원 확인을 기다리는 상태 (확인 시 completed로 차감)
// no_show = 회원 미출석. 회차는 차감되고 트레이너에게 정산된다(회원 귀책)

export interface WeeklySchedule {
  daysOfWeek: number[]; // 0=일, 1=월, ..., 6=토
  startTime: string;    // "HH:MM"
  duration: number;     // 분 (60 = 1시간)
}

export interface PTSession {
  id: string;
  bookingId: string;
  date: string;       // "YYYY-MM-DD"
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
  status: SessionStatus;
  // 트레이너가 완료를 요청한 시각(ISO). 자동 확정(auto-confirm-sessions)이 이 시각부터
  // SESSION_AUTO_CONFIRM_DAYS를 센다. 예약 전체의 updatedAt을 쓰면 같은 예약의 다른 변경에
  // 시계가 밀린다. 이의 제기로 scheduled로 되돌아가면 지운다.
  requestedAt?: string;
}

export interface Booking {
  id: string;
  memberId: string;
  memberName: string;
  trainerId: string;
  trainerName: string;
  productId: string;
  totalSessions: number;
  remainingSessions: number;
  usedSessions: number;
  pricePerSession: number;
  totalAmount: number;
  schedule: WeeklySchedule;
  sessions: PTSession[];
  status: BookingStatus;
  startDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  type?: 'pt' | 'consultation';
  refundedAmount?: number;
  refundedAt?: string;
  // 회차권 유효기간 만료 시각(결제일 + SESSION_PASS_VALIDITY_MONTHS). 구매 시점 값을 그대로 보관한다.
  // 나중에 약관 기간이 바뀌어도 이미 판매된 회차권의 조건은 유지되어야 하므로 계산하지 말고 저장할 것.
  expiresAt?: string;
}
