import { sessionNet, monthlyEarnings, nextSettlement, TRAINER_SHARE } from '../utils/earnings';
import { gymConfirmedSlots, gymMonthlyRevenue, gymTrainerContribution, gymPopularHours } from '../utils/gymRevenue';
import { Booking, SlotBooking, PTSession } from '../types';

function ses(date: string, status: string, id = 's_' + Math.random()): PTSession {
  return { id, bookingId: 'b', date, startTime: '10:00', endTime: '11:00', status: status as PTSession['status'] };
}
function makeBooking(o: Partial<Booking> & { pricePerSession: number; sessions: PTSession[] }): Booking {
  return {
    id: 'b1', memberId: 'm1', memberName: '홍길동', trainerId: 't1', trainerName: '김트레이너',
    productId: 'p', totalSessions: o.sessions.length, remainingSessions: 0, usedSessions: 0,
    totalAmount: 0, schedule: { daysOfWeek: [], startTime: '10:00', duration: 60 },
    status: 'active', startDate: '2026-01-01',
    ...o,
  } as Booking;
}
function slot(o: Partial<SlotBooking> & { facilityFee: number; date: string; status: string }): SlotBooking {
  return {
    id: 's_' + Math.random(), gymId: 'g1', gymName: 'G', trainerId: 't1', trainerName: '김트레이너',
    startTime: '10:00', memberCount: 1,
    ...o,
  } as SlotBooking;
}

describe('earnings (트레이너 정산)', () => {
  test('sessionNet = PT비의 90% 반올림 (플랫폼 10% 공제)', () => {
    expect(TRAINER_SHARE).toBe(0.9);
    expect(sessionNet(makeBooking({ pricePerSession: 100000, sessions: [] }))).toBe(90000);
    expect(sessionNet(makeBooking({ pricePerSession: 55555, sessions: [] }))).toBe(50000); // 49999.5 → 반올림
  });

  test('monthlyEarnings: 완료 세션만 월별 합산', () => {
    const b = makeBooking({
      pricePerSession: 100000,
      sessions: [ses('2026-03-05', 'completed'), ses('2026-03-20', 'completed'), ses('2026-03-25', 'scheduled')],
    });
    const res = monthlyEarnings([b], 1, new Date(2026, 2, 31));
    expect(res).toHaveLength(1);
    expect(res[0].key).toBe('2026-03');
    expect(res[0].sessions).toBe(2);       // scheduled 제외
    expect(res[0].amount).toBe(180000);    // 2 × 90000
  });

  test('monthlyEarnings: 상담(consultation)은 수익에서 제외', () => {
    const b = makeBooking({ pricePerSession: 100000, type: 'consultation', sessions: [ses('2026-03-05', 'completed')] });
    expect(monthlyEarnings([b], 1, new Date(2026, 2, 31))[0].amount).toBe(0);
  });

  test('nextSettlement: 10일 이전=전월 대상, 이후=이번달 대상', () => {
    const b = makeBooking({ pricePerSession: 100000, sessions: [ses('2026-02-10', 'completed')] });
    const before = nextSettlement([b], new Date(2026, 2, 5));  // 3/5
    expect(before.monthLabel).toBe('2월');
    expect(before.dateLabel).toBe('3월 10일');
    expect(before.amount).toBe(90000);
    const after = nextSettlement([b], new Date(2026, 2, 15));  // 3/15
    expect(after.monthLabel).toBe('3월');
    expect(after.dateLabel).toBe('4월 10일');
    expect(after.amount).toBe(0);          // 3월 완료 세션 없음
  });
});

describe('gymRevenue (헬스장 매출)', () => {
  test('gymConfirmedSlots: 해당 헬스장 confirmed만', () => {
    const slots = [
      slot({ gymId: 'g1', facilityFee: 10000, date: '2026-03-01', status: 'confirmed' }),
      slot({ gymId: 'g1', facilityFee: 10000, date: '2026-03-01', status: 'pending' }),
      slot({ gymId: 'g2', facilityFee: 10000, date: '2026-03-01', status: 'confirmed' }),
    ];
    expect(gymConfirmedSlots(slots, 'g1')).toHaveLength(1);
  });

  test('gymMonthlyRevenue: 월별 시설료 합계', () => {
    const slots = [
      slot({ gymId: 'g1', facilityFee: 10000, date: '2026-03-01', status: 'confirmed' }),
      slot({ gymId: 'g1', facilityFee: 20000, date: '2026-03-15', status: 'confirmed' }),
    ];
    const res = gymMonthlyRevenue(slots, 'g1', 1, new Date(2026, 2, 31));
    expect(res[0].amount).toBe(30000);
    expect(res[0].count).toBe(2);
  });

  test('gymTrainerContribution: 트레이너별 합, 금액 내림차순', () => {
    const slots = [
      slot({ gymId: 'g1', trainerName: 'A', facilityFee: 10000, date: '2026-03-01', status: 'confirmed' }),
      slot({ gymId: 'g1', trainerName: 'B', facilityFee: 30000, date: '2026-03-01', status: 'confirmed' }),
      slot({ gymId: 'g1', trainerName: 'A', facilityFee: 10000, date: '2026-03-02', status: 'confirmed' }),
    ];
    const res = gymTrainerContribution(slots, 'g1');
    expect(res[0]).toEqual({ trainerName: 'B', amount: 30000, count: 1 });
    expect(res[1]).toEqual({ trainerName: 'A', amount: 20000, count: 2 });
  });

  test('gymPopularHours: 시간대별 건수(시각 오름차순)', () => {
    const slots = [
      slot({ gymId: 'g1', facilityFee: 1, date: '2026-03-01', status: 'confirmed', startTime: '10:00' }),
      slot({ gymId: 'g1', facilityFee: 1, date: '2026-03-02', status: 'confirmed', startTime: '10:30' }),
      slot({ gymId: 'g1', facilityFee: 1, date: '2026-03-03', status: 'confirmed', startTime: '14:00' }),
    ];
    expect(gymPopularHours(slots, 'g1')).toEqual([{ hour: 10, count: 2 }, { hour: 14, count: 1 }]);
  });
});
