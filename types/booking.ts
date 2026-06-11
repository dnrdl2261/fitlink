export type BookingStatus = 'active' | 'completed' | 'cancelled';
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';

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
}
