import { Booking, PTSession, WeeklySchedule } from '../types';
import { calcEndTime } from '../store/bookingStore';

function buildSessions(
  bookingId: string,
  schedule: WeeklySchedule,
  startDate: string,
  count: number,
  completedCount: number = 0
): PTSession[] {
  const sessions: PTSession[] = [];
  const [y, mo, d] = startDate.split('-').map(Number);
  const cur = new Date(y, mo - 1, d);
  const endTime = calcEndTime(schedule.startTime, schedule.duration);

  while (sessions.length < count) {
    if (schedule.daysOfWeek.includes(cur.getDay())) {
      const idx = sessions.length;
      const ds = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      sessions.push({
        id: `s_${bookingId}_${idx + 1}`,
        bookingId,
        date: ds,
        startTime: schedule.startTime,
        endTime,
        status: idx < completedCount ? 'completed' : 'scheduled',
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return sessions;
}

const sched1: WeeklySchedule = { daysOfWeek: [1, 3, 5], startTime: '10:00', duration: 60 };
const sched2: WeeklySchedule = { daysOfWeek: [2, 4], startTime: '14:00', duration: 60 };
const sched3: WeeklySchedule = { daysOfWeek: [1, 3], startTime: '09:00', duration: 60 };
const sched4: WeeklySchedule = { daysOfWeek: [1, 4], startTime: '16:00', duration: 60 };
const sched5: WeeklySchedule = { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '15:00', duration: 60 };

// 오늘 기준 상대 날짜 (언제 시연하든 과거 완료분 + 미래 예정분이 함께 생기도록)
function daysFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const START_1 = daysFromToday(-14); // 활성 PT (member_001 ↔ trainer_001)
const START_2 = daysFromToday(-10); // 활성 PT (member_001 ↔ trainer_002)
const START_5 = daysFromToday(-7);  // 활성 PT (member_002 ↔ trainer_001)
const START_6 = daysFromToday(2);   // 결제 완료·트레이너 확정 대기 (member_003 ↔ trainer_001)

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'booking_001',
    memberId: 'member_001',
    memberName: '홍길동',
    trainerId: 'trainer_001',
    trainerName: '김민준',
    productId: 'product_t1_20',
    totalSessions: 20,
    remainingSessions: 14,
    usedSessions: 6,
    pricePerSession: 80000,
    totalAmount: 1600000,
    schedule: sched1,
    sessions: buildSessions('booking_001', sched1, START_1, 20, 6),
    status: 'active',
    startDate: START_1,
    createdAt: '2026-04-05T09:00:00.000Z',
    updatedAt: '2026-04-17T11:00:00.000Z',
  },
  {
    id: 'booking_002',
    memberId: 'member_001',
    memberName: '홍길동',
    trainerId: 'trainer_002',
    trainerName: '이지수',
    productId: 'product_t2_10',
    totalSessions: 10,
    remainingSessions: 8,
    usedSessions: 2,
    pricePerSession: 100000,
    totalAmount: 1000000,
    schedule: sched2,
    sessions: buildSessions('booking_002', sched2, START_2, 10, 2),
    status: 'active',
    startDate: START_2,
    createdAt: '2026-04-20T10:00:00.000Z',
    updatedAt: '2026-04-23T15:00:00.000Z',
  },
  {
    id: 'booking_003',
    memberId: 'member_001',
    memberName: '홍길동',
    trainerId: 'trainer_003',
    trainerName: '박철수',
    productId: 'product_t3_10',
    totalSessions: 10,
    remainingSessions: 0,
    usedSessions: 10,
    pricePerSession: 70000,
    totalAmount: 700000,
    schedule: sched3,
    sessions: buildSessions('booking_003', sched3, '2026-02-02', 10, 10),
    status: 'completed',
    startDate: '2026-02-02',
    createdAt: '2026-02-01T09:00:00.000Z',
    updatedAt: '2026-03-04T10:00:00.000Z',
  },
  {
    id: 'booking_004',
    memberId: 'member_001',
    memberName: '홍길동',
    trainerId: 'trainer_004',
    trainerName: '최유진',
    productId: 'product_t4_20',
    totalSessions: 20,
    remainingSessions: 20,
    usedSessions: 0,
    pricePerSession: 75000,
    totalAmount: 1500000,
    schedule: sched4,
    sessions: buildSessions('booking_004', sched4, '2026-03-02', 20, 0),
    status: 'cancelled',
    startDate: '2026-03-02',
    notes: '개인 사정으로 취소',
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-10T09:00:00.000Z',
  },
  {
    id: 'booking_005',
    memberId: 'member_002',
    memberName: '김영희',
    trainerId: 'trainer_001',
    trainerName: '김민준',
    productId: 'product_t1_10',
    totalSessions: 10,
    remainingSessions: 7,
    usedSessions: 3,
    pricePerSession: 80000,
    totalAmount: 800000,
    schedule: sched5,
    sessions: buildSessions('booking_005', sched5, START_5, 10, 3),
    status: 'active',
    startDate: START_5,
    createdAt: '2026-04-25T09:00:00.000Z',
    updatedAt: '2026-04-30T11:00:00.000Z',
  },
  {
    id: 'booking_006',
    memberId: 'member_001',
    memberName: '홍길동',
    trainerId: 'trainer_001',
    trainerName: '김민준',
    productId: 'product_t1_20',
    totalSessions: 20,
    remainingSessions: 20,
    usedSessions: 0,
    pricePerSession: 80000,
    totalAmount: 1600000,
    schedule: sched2,
    sessions: buildSessions('booking_006', sched2, START_6, 20, 0),
    status: 'pending', // 회원 결제 완료, 트레이너 확정 대기
    startDate: START_6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
