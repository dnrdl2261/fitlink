import { create } from 'zustand';
import { Booking, BookingStatus, PTSession, SessionStatus, WeeklySchedule } from '../types';
import { MOCK_BOOKINGS } from '../data/bookings';
import { useAuthStore } from './authStore';
import { supabase, isSupabaseConfigured } from '../config/supabase';

// 로그인한 회원 식별 (없으면 데모 기본값)
const currentMember = () => {
  const m = useAuthStore.getState().member;
  return { id: m?.id ?? 'member_001', name: m?.name ?? '홍길동' };
};

// ── Supabase 연동 (실 사용자만; 데모 mock id는 로컬 메모리만 사용) ──────────
// 실 인증 사용자의 id는 auth uuid. 데모(member_001 등)는 DB 미사용.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealUser = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);

// Booking ↔ Supabase row (snake_case) 매핑
function toRow(b: Booking) {
  return {
    id: b.id,
    member_id: b.memberId,
    member_name: b.memberName,
    trainer_id: b.trainerId,
    trainer_name: b.trainerName,
    product_id: b.productId,
    total_sessions: b.totalSessions,
    remaining_sessions: b.remainingSessions,
    used_sessions: b.usedSessions,
    price_per_session: b.pricePerSession,
    total_amount: b.totalAmount,
    schedule: b.schedule,
    sessions: b.sessions,
    status: b.status,
    start_date: b.startDate,
    notes: b.notes ?? null,
    type: b.type ?? 'pt',
    refunded_amount: b.refundedAmount ?? null,
    refunded_at: b.refundedAt ?? null,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  };
}

function fromRow(r: any): Booking {
  return {
    id: r.id,
    memberId: r.member_id,
    memberName: r.member_name,
    trainerId: r.trainer_id,
    trainerName: r.trainer_name,
    productId: r.product_id,
    totalSessions: r.total_sessions,
    remainingSessions: r.remaining_sessions,
    usedSessions: r.used_sessions,
    pricePerSession: r.price_per_session,
    totalAmount: r.total_amount,
    schedule: r.schedule,
    sessions: r.sessions ?? [],
    status: r.status,
    startDate: r.start_date,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    type: r.type === 'consultation' ? 'consultation' : undefined,
    refundedAmount: r.refunded_amount ?? undefined,
    refundedAt: r.refunded_at ?? undefined,
  };
}

// 변경된 booking을 fire-and-forget으로 DB에 미러 (실 사용자 예약만). authStore.syncProfileToSupabase 패턴.
function mirror(bookingId: string) {
  if (!isSupabaseConfigured) return;
  const b = useBookingStore.getState().bookings.find((x) => x.id === bookingId);
  if (!b || !isRealUser(b.memberId)) return;
  supabase.from('bookings').upsert(toRow(b)).then(() => {}, () => {});
}

// DB에서 읽은 예약을 로컬 상태에 병합(id 기준 DB 우선).
function mergeBookings(rows: Booking[]) {
  useBookingStore.setState((s) => {
    const ids = new Set(rows.map((r) => r.id));
    return { bookings: [...rows, ...s.bookings.filter((b) => !ids.has(b.id))] };
  });
}

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
  recordPayment: (info: { orderId: string; bookingId: string; memberId: string; amount: number; paymentId?: string }) => void;
  addConsultation: (params: ConsultationParams) => string;
  cancelBooking: (bookingId: string) => void;
  refundBooking: (bookingId: string) => number; // 잔여분 전액 환불 → 환불액 반환
  confirmBooking: (bookingId: string) => void;
  requestCompletion: (bookingId: string, sessionId: string) => void;
  rejectCompletion: (bookingId: string, sessionId: string) => void;
  completeSession: (bookingId: string, sessionId: string) => void;
  getMyBookings: (memberId: string) => Booking[];
  getTrainerBookings: (trainerId: string) => Booking[];
  loadFromSupabase: (memberId: string) => Promise<void>;
  loadTrainerBookings: (trainerId: string) => Promise<void>;
  isSlotTaken: (date: string, startTime: string, endTime: string, memberId?: string) => boolean;
  findScheduleConflict: (schedule: WeeklySchedule, startDate: string, count: number, memberId?: string) => string | null;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: MOCK_BOOKINGS,

  addBooking: (params) => {
    const id = `booking_${Date.now()}`;
    const sessions = generateSessions(id, params.schedule, params.startDate, params.totalSessions);
    const me = currentMember();
    const newBooking: Booking = {
      id,
      memberId: me.id,
      memberName: me.name,
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
      status: 'pending', // 회원 결제 완료 → 트레이너 확정 대기
      startDate: params.startDate,
      notes: params.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ bookings: [newBooking, ...s.bookings] }));
    mirror(id);
    return id;
  },

  // 결제 기록. 실 회원만 payments 테이블에 기록(데모/미설정은 스킵). booking과 별개 감사 기록.
  recordPayment: (info) => {
    if (!isRealUser(info.memberId)) return;
    supabase.from('payments').insert({
      id: info.orderId,
      booking_id: info.bookingId,
      member_id: info.memberId,
      amount: info.amount,
      status: 'paid',
      pg_payment_id: info.paymentId ?? null,
      created_at: new Date().toISOString().slice(0, 10),
    }).then(() => {}, () => {});
  },

  addConsultation: (params) => {
    const id = `booking_${Date.now()}`;
    const endTime = calcEndTime(params.startTime, params.duration);
    const me = currentMember();
    const newBooking: Booking = {
      id,
      memberId: me.id,
      memberName: me.name,
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
    mirror(id);
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
    mirror(bookingId);
  },

  // 회원이 잔여(미사용) 세션을 전액 환불 (에스크로: 미사용분은 앱이 보관 중이므로 100% 반환)
  refundBooking: (bookingId) => {
    const b = get().bookings.find((x) => x.id === bookingId);
    if (!b) return 0;
    const refundedAmount = b.remainingSessions * b.pricePerSession;
    set((s) => ({
      bookings: s.bookings.map((x) => {
        if (x.id !== bookingId) return x;
        const sessions = x.sessions.map((sess) =>
          sess.status === 'scheduled' || sess.status === 'pending'
            ? { ...sess, status: 'cancelled' as SessionStatus }
            : sess
        );
        return {
          ...x, sessions, status: 'refunded' as BookingStatus,
          remainingSessions: 0, refundedAmount,
          refundedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
      }),
    }));
    mirror(bookingId);
    // 결제 기록도 환불 상태로(실 회원만)
    if (isRealUser(b.memberId)) {
      supabase.from('payments').update({ status: 'refunded' }).eq('booking_id', bookingId).then(() => {}, () => {});
    }
    return refundedAmount;
  },

  // 트레이너가 회원 결제 건을 확정 → pending → active
  confirmBooking: (bookingId) => {
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === bookingId && b.status === 'pending'
          ? { ...b, status: 'active', updatedAt: new Date().toISOString() }
          : b
      ),
    }));
    mirror(bookingId);
  },

  // 트레이너가 완료를 요청 → 회원 확인 대기(pending). 차감은 회원 확인 시까지 보류.
  requestCompletion: (bookingId, sessionId) => {
    set((s) => ({
      bookings: s.bookings.map((b) => {
        if (b.id !== bookingId) return b;
        const sessions = b.sessions.map((sess) =>
          sess.id === sessionId ? { ...sess, status: 'pending' as SessionStatus } : sess
        );
        return { ...b, sessions, updatedAt: new Date().toISOString() };
      }),
    }));
    mirror(bookingId);
  },

  // 회원이 이의 제기 → 다시 예정(scheduled)으로 되돌림 (차감 없음)
  rejectCompletion: (bookingId, sessionId) => {
    set((s) => ({
      bookings: s.bookings.map((b) => {
        if (b.id !== bookingId) return b;
        const sessions = b.sessions.map((sess) =>
          sess.id === sessionId ? { ...sess, status: 'scheduled' as SessionStatus } : sess
        );
        return { ...b, sessions, updatedAt: new Date().toISOString() };
      }),
    }));
    mirror(bookingId);
  },

  completeSession: (bookingId, sessionId) => {
    const b = get().bookings.find((x) => x.id === bookingId);
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
    mirror(bookingId);
    // 정산: 세션 완료 확인 시 에스크로 해제 → 트레이너 90% 입금 + 플랫폼 10% 기록. 실 회원만.
    if (b && isRealUser(b.memberId)) {
      const gross = b.pricePerSession;
      const trainerAmount = Math.round(gross * 0.9);
      supabase.from('settlements').insert({
        id: `settle_${sessionId}`,
        booking_id: bookingId,
        session_id: sessionId,
        trainer_id: b.trainerId,
        member_id: b.memberId,
        gross_amount: gross,
        trainer_amount: trainerAmount,
        platform_fee: gross - trainerAmount,
        status: 'settled',
        created_at: new Date().toISOString().slice(0, 10),
      }).then(() => {}, () => {});
    }
  },

  getMyBookings: (memberId) => get().bookings.filter((b) => b.memberId === memberId),
  getTrainerBookings: (trainerId) => get().bookings.filter((b) => b.trainerId === trainerId),

  // 실 회원(uuid)의 예약을 Supabase에서 로드해 로컬 상태에 병합. 데모/미설정은 no-op.
  loadFromSupabase: async (memberId) => {
    if (!isRealUser(memberId)) return;
    const { data, error } = await supabase.from('bookings').select('*').eq('member_id', memberId);
    if (error || !data) return;
    mergeBookings(data.map(fromRow));
  },

  // 실 트레이너(uuid)가 자신 대상 예약을 로드(trainer_id == 트레이너 카탈로그 uuid). RLS: trainers.profile_id 매칭.
  loadTrainerBookings: async (trainerId) => {
    if (!isRealUser(trainerId)) return;
    const { data, error } = await supabase.from('bookings').select('*').eq('trainer_id', trainerId);
    if (error || !data) return;
    mergeBookings(data.map(fromRow));
  },

  // 회원의 살아있는(active) 예약 중 PT·상담을 통틀어, 같은 날짜에서
  // 시간 구간 [startTime, endTime)이 겹치는 세션이 있으면 true (취소·완료 제외)
  isSlotTaken: (date, startTime, endTime, memberId = 'member_001') => {
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const ns = toMin(startTime), ne = toMin(endTime);
    return get().bookings.some((b) =>
      b.status === 'active' &&
      b.memberId === memberId &&
      b.sessions.some((sess) =>
        (sess.status === 'scheduled' || sess.status === 'pending') &&
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
