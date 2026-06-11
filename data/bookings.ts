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
    sessions: buildSessions('booking_001', sched1, '2026-04-06', 20, 6),
    status: 'active',
    startDate: '2026-04-06',
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
    sessions: buildSessions('booking_002', sched2, '2026-04-21', 10, 2),
    status: 'active',
    startDate: '2026-04-21',
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
];
