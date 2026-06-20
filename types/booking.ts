export type BookingStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'refunded';
// pending = 회원 결제 완료, 트레이너 확정 대기 (확정 시 active)
// refunded = 회원이 잔여(미사용) 세션 전액 환불
export type SessionStatus = 'scheduled' | 'pending' | 'completed' | 'cancelled';
// pending = 트레이너가 완료를 요청하고 회원 확인을 기다리는 상태 (확인 시 completed로 차감)

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
}
