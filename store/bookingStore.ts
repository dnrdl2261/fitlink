import { create } from 'zustand';
import { Booking, BookingStatus, PTSession, SessionStatus, WeeklySchedule } from '../types';
import { MOCK_BOOKINGS } from '../data/bookings';

export function calcEndTime(startTime: string, duration: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + duration;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function generateSessions(
  bookingId: string,
  schedule: WeeklySchedule,
  startDate: string,
  count: number
): PTSession[] {
  const sessions: PTSession[] = [];
  const [y, mo, d] = startDate.split('-').map(Number);
  const cur = new Date(y, mo - 1, d);
  const endTime = calcEndTime(schedule.startTime, schedule.duration);

  while (sessions.length < count) {
    if (schedule.daysOfWeek.includes(cur.getDay())) {
      const ds = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      sessions.push({
        id: `s_${bookingId}_${sessions.length + 1}`,
        bookingId,
        date: ds,
        startTime: schedule.startTime,
        endTime,
        status: 'scheduled',
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return sessions;
}

interface NewBookingParams {
  trainerId: string;
  trainerName: string;
  productId: string;
  totalSessions: number;
  pricePerSession: number;
  totalAmount: number;
  schedule: WeeklySchedule;
  startDate: string;
  notes?: string;
}

interface ConsultationParams {
  trainerId: string;
  trainerName: string;
  date: string;
  startTime: string;
  duration: number;
  notes?: string;
}

interface BookingState {
  bookings: Booking[];
  addBooking: (params: NewBookingParams) => string;
  addConsultation: (params: ConsultationParams) => string;
  cancelBooking: (bookingId: string) => void;
  completeSession: (bookingId: string, sessionId: string) => void;
  getMyBookings: (memberId: string) => Booking[];
  getTrainerBookings: (trainerId: string) => Booking[];
  isSlotTaken: (date: string, startTime: string, endTime: string, memberId?: string) => boolean;
  findScheduleConflict: (schedule: WeeklySchedule, startDate: string, count: number, memberId?: string) => string | null;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: MOCK_BOOKINGS,

  addBooking: (params) => {
    const id = `booking_${Date.now()}`;
    const sessions = generateSessions(id, params.schedule, params.startDate, params.totalSessions);
    const newBooking: Booking = {
      id,
      memberId: 'member_001',
      memberName: '홍길동',
      trainerId: params.trainerId,
      trainerName: params.trainerName,
      productId: params.productId,
      totalSessions: params.totalSessions,
      remainingSessions: params.totalSessions,
      usedSessions: 0,
      pricePerSession: params.pricePerSession,
      totalAmount: params.totalAmount,
      schedule: params.schedule,
      sessions,
      status: 'active',
      startDate: params.startDate,
      notes: params.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ bookings: [newBooking, ...s.bookings] }));
    return id;
  },

  addConsultation: (params) => {
    const id = `booking_${Date.now()}`;
    const endTime = calcEndTime(params.startTime, params.duration);
    const newBooking: Booking = {
      id,
      memberId: 'member_001',
      memberName: '홍길동',
      trainerId: params.trainerId,
      trainerName: params.trainerName,
      productId: 'consultation',
      totalSessions: 1,
      remainingSessions: 1,
      usedSessions: 0,
      pricePerSession: 0,
      totalAmount: 0,
      schedule: { daysOfWeek: [new Date(params.date).getDay()], startTime: params.startTime, duration: params.duration },
      sessions: [{
        id: `s_${id}_1`,
        bookingId: id,
        date: params.date,
        startTime: params.startTime,
        endTime,
        status: 'scheduled',
      }],
      status: 'active',
      startDate: params.date,
      notes: params.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'consultation',
    };
    set((s) => ({ bookings: [newBooking, ...s.bookings] }));
    return id;
  },

  cancelBooking: (bookingId) => {
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === bookingId
          ? { ...b, status: 'cancelled', updatedAt: new Date().toISOString() }
          : b
      ),
    }));
  },

  completeSession: (bookingId, sessionId) => {
    set((s) => ({
      bookings: s.bookings.map((b) => {
        if (b.id !== bookingId) return b;
        const sessions = b.sessions.map((sess) =>
          sess.id === sessionId ? { ...sess, status: 'completed' as SessionStatus } : sess
        );
        const usedSessions = b.usedSessions + 1;
        const remainingSessions = b.remainingSessions - 1;
        const status: BookingStatus = remainingSessions === 0 ? 'completed' : 'active';
        return { ...b, sessions, usedSessions, remainingSessions, status, updatedAt: new Date().toISOString() };
      }),
    }));
  },

  getMyBookings: (memberId) => get().bookings.filter((b) => b.memberId === memberId),
  getTrainerBookings: (trainerId) => get().bookings.filter((b) => b.trainerId === trainerId),

  // 회원의 살아있는(active) 예약 중 PT·상담을 통틀어, 같은 날짜에서
  // 시간 구간 [startTime, endTime)이 겹치는 세션이 있으면 true (취소·완료 제외)
  isSlotTaken: (date, startTime, endTime, memberId = 'member_001') => {
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const ns = toMin(startTime), ne = toMin(endTime);
    return get().bookings.some((b) =>
      b.status === 'active' &&
      b.memberId === memberId &&
      b.sessions.some((sess) =>
        sess.status === 'scheduled' &&
        sess.date === date &&
        toMin(sess.startTime) < ne && toMin(sess.endTime) > ns
      )
    );
  },

  // PT 주간 반복 예약: startDate부터 생성될 count개의 세션 중
  // 기존 일정과 겹치는 첫 세션의 날짜를 반환(없으면 null)
  findScheduleConflict: (schedule, startDate, count, memberId = 'member_001') => {
    const sessions = generateSessions('preview', schedule, startDate, count);
    const hit = sessions.find((s) => get().isSlotTaken(s.date, s.startTime, s.endTime, memberId));
    return hit ? hit.date : null;
  },
}));
