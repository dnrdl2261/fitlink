import { Booking } from '../types';

// 트레이너 수취 비율: PT비의 90% (플랫폼 수수료 10% 공제)
export const TRAINER_SHARE = 0.9;

// 완료된 1세션당 트레이너 순수취액
export function sessionNet(b: Booking): number {
  return Math.round(b.pricePerSession * TRAINER_SHARE);
}

const monthKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// 완료 세션을 'YYYY-MM'별로 합산 (무료상담 제외)
function aggregateByMonth(bookings: Booking[]): Record<string, { amount: number; sessions: number }> {
  const map: Record<string, { amount: number; sessions: number }> = {};
  for (const b of bookings) {
    if (b.type === 'consultation') continue;
    const net = sessionNet(b);
    for (const s of b.sessions) {
      if (s.status !== 'completed') continue;
      const m = s.date.slice(0, 7);
      const cur = map[m] ?? { amount: 0, sessions: 0 };
      cur.amount += net;
      cur.sessions += 1;
      map[m] = cur;
    }
  }
  return map;
}

export interface MonthEarning { key: string; label: string; amount: number; sessions: number; }

// 현재월 포함 최근 n개월의 실제 수익 (오래된 → 최신 순)
export function monthlyEarnings(bookings: Booking[], n: number, now: Date = new Date()): MonthEarning[] {
  const byMonth = aggregateByMonth(bookings);
  const out: MonthEarning[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKeyOf(d);
    const e = byMonth[key] ?? { amount: 0, sessions: 0 };
    out.push({ key, label: `${d.getMonth() + 1}월`, amount: e.amount, sessions: e.sessions });
  }
  return out;
}

export interface Settlement { dateLabel: string; monthLabel: string; amount: number; }

// 다음 정산 예정: 매월 10일에 '전월' 수익을 지급
export function nextSettlement(bookings: Booking[], now: Date = new Date()): Settlement {
  const beforeCutoff = now.getDate() <= 10;
  // 10일 이전이면 이번 달 10일에 '지난달' 정산, 이후면 다음 달 10일에 '이번 달' 정산
  const settleDate = new Date(now.getFullYear(), now.getMonth() + (beforeCutoff ? 0 : 1), 10);
  const targetMonth = new Date(now.getFullYear(), now.getMonth() - (beforeCutoff ? 1 : 0), 1);
  const targetKey = monthKeyOf(targetMonth);
  const amount = monthlyEarnings(bookings, 14, now).find((m) => m.key === targetKey)?.amount ?? 0;
  return {
    dateLabel: `${settleDate.getMonth() + 1}월 ${settleDate.getDate()}일`,
    monthLabel: `${targetMonth.getMonth() + 1}월`,
    amount,
  };
}

export interface EarningTx { id: string; date: string; member: string; amount: number; }

// 특정 월('YYYY-MM')에 완료된 세션 단위 결제 내역
export function monthTransactions(bookings: Booking[], monthKey: string): EarningTx[] {
  const txs: EarningTx[] = [];
  for (const b of bookings) {
    if (b.type === 'consultation') continue;
    const net = sessionNet(b);
    for (const s of b.sessions) {
      if (s.status === 'completed' && s.date.slice(0, 7) === monthKey) {
        txs.push({ id: s.id, date: s.date, member: b.memberName, amount: net });
      }
    }
  }
  return txs.sort((a, b) => b.date.localeCompare(a.date));
}
