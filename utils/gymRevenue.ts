import { SlotBooking } from '../types';

// 헬스장 수익 = 확정된 슬롯(외부 트레이너의 시설 이용)의 시설 이용료 합
const monthKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function gymConfirmedSlots(slots: SlotBooking[], gymId: string): SlotBooking[] {
  return slots.filter((s) => s.gymId === gymId && s.status === 'confirmed');
}

export interface GymMonth { key: string; label: string; amount: number; count: number; }

// 현재월 포함 최근 n개월의 실제 시설료 수익
export function gymMonthlyRevenue(slots: SlotBooking[], gymId: string, n: number, now: Date = new Date()): GymMonth[] {
  const byMonth: Record<string, { amount: number; count: number }> = {};
  for (const s of gymConfirmedSlots(slots, gymId)) {
    const m = s.date.slice(0, 7);
    const cur = byMonth[m] ?? { amount: 0, count: 0 };
    cur.amount += s.facilityFee;
    cur.count += 1;
    byMonth[m] = cur;
  }
  const out: GymMonth[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKeyOf(d);
    const e = byMonth[key] ?? { amount: 0, count: 0 };
    out.push({ key, label: `${d.getMonth() + 1}월`, amount: e.amount, count: e.count });
  }
  return out;
}

export interface GymTx { id: string; date: string; trainer: string; amount: number; }

export function gymMonthTransactions(slots: SlotBooking[], gymId: string, monthKey: string): GymTx[] {
  return gymConfirmedSlots(slots, gymId)
    .filter((s) => s.date.slice(0, 7) === monthKey && s.facilityFee > 0)
    .map((s) => ({ id: s.id, date: s.date, trainer: s.trainerName, amount: s.facilityFee }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface GymSettlement { dateLabel: string; monthLabel: string; amount: number; }

export function gymNextSettlement(slots: SlotBooking[], gymId: string, now: Date = new Date()): GymSettlement {
  const beforeCutoff = now.getDate() <= 10;
  const settleDate = new Date(now.getFullYear(), now.getMonth() + (beforeCutoff ? 0 : 1), 10);
  const targetMonth = new Date(now.getFullYear(), now.getMonth() - (beforeCutoff ? 1 : 0), 1);
  const targetKey = monthKeyOf(targetMonth);
  const amount = gymMonthlyRevenue(slots, gymId, 14, now).find((m) => m.key === targetKey)?.amount ?? 0;
  return {
    dateLabel: `${settleDate.getMonth() + 1}월 ${settleDate.getDate()}일`,
    monthLabel: `${targetMonth.getMonth() + 1}월`,
    amount,
  };
}

export interface TrainerContribution { trainerName: string; amount: number; count: number; }

// 트레이너별 시설 매출 기여도 (monthKey 미지정 시 전체 기간)
export function gymTrainerContribution(slots: SlotBooking[], gymId: string, monthKey?: string): TrainerContribution[] {
  const map: Record<string, TrainerContribution> = {};
  for (const s of gymConfirmedSlots(slots, gymId)) {
    if (s.facilityFee <= 0) continue;
    if (monthKey && s.date.slice(0, 7) !== monthKey) continue;
    const cur = map[s.trainerName] ?? { trainerName: s.trainerName, amount: 0, count: 0 };
    cur.amount += s.facilityFee;
    cur.count += 1;
    map[s.trainerName] = cur;
  }
  return Object.values(map).sort((a, b) => b.amount - a.amount);
}

export interface HourBucket { hour: number; count: number; }

// 시간대별 이용 건수 (인기 시간대)
export function gymPopularHours(slots: SlotBooking[], gymId: string): HourBucket[] {
  const map: Record<number, number> = {};
  for (const s of gymConfirmedSlots(slots, gymId)) {
    const h = parseInt(s.startTime.split(':')[0]);
    map[h] = (map[h] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([h, c]) => ({ hour: Number(h), count: c }))
    .sort((a, b) => a.hour - b.hour);
}
