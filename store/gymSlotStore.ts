import { create } from 'zustand';
import { SlotBooking, SlotInfo } from '../types';
import { MOCK_GYMS } from '../data/gyms';
import { loadPersisted, persistOnChange } from '../utils/persist';

const PERSIST_KEY = 'flowin-gym-slots';

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generate30MinSlots(openTime: string, closeTime: string): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  const openMin = toMinutes(openTime);
  const closeMin = closeTime === '24:00' ? 1440 : toMinutes(closeTime);
  for (let m = openMin; m + 30 <= closeMin; m += 30) {
    slots.push({ start: fromMinutes(m), end: fromMinutes(m + 30) });
  }
  return slots;
}

interface BlacklistEntry {
  trainerId: string;
  trainerName: string;
}

interface GymSlotState {
  slotBookings: SlotBooking[];
  capacityOverrides: Record<string, Record<number, number>>;
  blacklists: Record<string, BlacklistEntry[]>;
  favoriteGyms: string[];

  toggleFavorite: (gymId: string) => void;
  isFavorite: (gymId: string) => boolean;

  bookSlot: (params: {
    gymId: string;
    gymName: string;
    trainerId: string;
    trainerName: string;
    memberId?: string;
    memberName?: string;
    date: string;
    startTime: string;
    memberCount: number;
    facilityFee: number;
  }) => string | null;

  confirmSlot: (slotId: string) => void;
  cancelSlot: (slotId: string) => void;

  // 관리자가 직접 등록하는 회원 이용 일정 (바로 confirmed)
  addAdminSlot: (params: { gymId: string; gymName: string; memberName: string; date: string; startTime: string }) => void;

  getAvailableSlots: (gymId: string, date: string, trainerId: string) => SlotInfo[];
  getGymDaySlots: (gymId: string, date: string) => SlotInfo[];
  getPendingBookings: (gymId: string) => SlotBooking[];

  updateCapacity: (gymId: string, dayOfWeek: number, max: number) => void;
  getCapacity: (gymId: string, dayOfWeek: number) => number;

  blacklistTrainer: (gymId: string, trainerId: string, trainerName: string) => void;
  unblacklistTrainer: (gymId: string, trainerId: string) => void;
  isBlacklisted: (gymId: string, trainerId: string) => boolean;
  getBlacklist: (gymId: string) => BlacklistEntry[];
}

// 오늘 기준 상대 날짜 (QR 시연이 항상 가능하도록 confirmed 예약을 미리 시드)
function slotDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 매출·통계 시연용 confirmed 슬롯 이력 (gym_001, 최근 ~2.5개월 상대 날짜)
function genGymHistory(): SlotBooking[] {
  const gymId = 'gym_001';
  const gymName = '강남 피트니스 클럽';
  const roster = [
    { id: 'trainer_001', name: '김민준' },
    { id: 'trainer_002', name: '이지수' },
    { id: 'trainer_003', name: '박철수' },
  ];
  const members = ['홍길동', '김영희', '박민수', '정수아', '이준호', '최지훈'];
  const times = ['07:00', '09:00', '10:00', '14:00', '18:00', '19:00', '20:00'];
  const fees = [12000, 15000, 18000];
  const out: SlotBooking[] = [];
  let i = 0;
  for (let d = 2; d <= 75; d += 2) {
    const t = roster[i % roster.length];
    out.push({
      id: `slot_hist_${i}`, gymId, gymName,
      trainerId: t.id, trainerName: t.name,
      memberId: undefined, memberName: members[i % members.length],
      date: slotDate(-d), startTime: times[i % times.length],
      memberCount: 1 + (i % 2), facilityFee: fees[i % fees.length],
      status: 'confirmed', createdAt: slotDate(-d),
    });
    i++;
  }
  return out;
}

const SEED_SLOT_BOOKINGS: SlotBooking[] = [
  ...genGymHistory(),
  { id: 'slot_seed_1', gymId: 'gym_001', gymName: '강남 피트니스 클럽', trainerId: 'trainer_001', trainerName: '김민준', memberId: 'member_001', memberName: '홍길동', date: slotDate(0), startTime: '10:00', memberCount: 1, facilityFee: 15000, status: 'confirmed', createdAt: slotDate(-2) },
  { id: 'slot_seed_2', gymId: 'gym_002', gymName: '역삼 스포츠센터',   trainerId: 'trainer_001', trainerName: '김민준', memberId: 'member_002', memberName: '김영희', date: slotDate(2), startTime: '14:00', memberCount: 1, facilityFee: 12000, status: 'confirmed', createdAt: slotDate(-1) },
  { id: 'slot_seed_3', gymId: 'gym_001', gymName: '강남 피트니스 클럽', trainerId: 'trainer_001', trainerName: '김민준', memberId: 'member_001', memberName: '홍길동', date: slotDate(3), startTime: '11:00', memberCount: 1, facilityFee: 15000, status: 'pending',   createdAt: slotDate(0) },
];

const persisted = loadPersisted(PERSIST_KEY, {
  slotBookings: SEED_SLOT_BOOKINGS,
  capacityOverrides: {} as Record<string, Record<number, number>>,
  blacklists: {} as Record<string, BlacklistEntry[]>,
  favoriteGyms: [] as string[],
});

export const useGymSlotStore = create<GymSlotState>((set, get) => ({
  slotBookings: persisted.slotBookings,
  capacityOverrides: persisted.capacityOverrides,
  blacklists: persisted.blacklists,
  favoriteGyms: persisted.favoriteGyms,

  toggleFavorite: (gymId) => {
    set((state) => ({
      favoriteGyms: state.favoriteGyms.includes(gymId)
        ? state.favoriteGyms.filter((id) => id !== gymId)
        : [...state.favoriteGyms, gymId],
    }));
  },

  isFavorite: (gymId) => get().favoriteGyms.includes(gymId),

  addAdminSlot: ({ gymId, gymName, memberName, date, startTime }) => {
    set((state) => ({
      slotBookings: [{
        id: `slot_admin_${Date.now()}`,
        gymId, gymName,
        trainerId: '',
        trainerName: memberName, // 회원 이용 일정 → 회원명을 라벨로
        memberName: undefined,
        date, startTime,
        memberCount: 1,
        facilityFee: 0,
        status: 'confirmed' as const,
        createdAt: new Date().toISOString(),
      }, ...state.slotBookings],
    }));
  },

  bookSlot: ({ gymId, gymName, trainerId, trainerName, memberId, memberName, date, startTime, memberCount, facilityFee }) => {
    if (get().isBlacklisted(gymId, trainerId)) return null;
    const slots = get().getAvailableSlots(gymId, date, trainerId);
    const target = slots.find((s) => s.startTime === startTime);

    if (!target || !target.isAvailable) return null;
    if (target.myBooking) return null;

    const id = `slot_${Date.now()}`;
    const newBooking: SlotBooking = {
      id,
      gymId,
      gymName,
      trainerId,
      trainerName,
      memberId,
      memberName,
      date,
      startTime,
      memberCount,
      facilityFee,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
    };
    set((state) => ({ slotBookings: [...state.slotBookings, newBooking] }));
    return id;
  },

  confirmSlot: (slotId) => {
    set((state) => ({
      slotBookings: state.slotBookings.map((b) =>
        b.id === slotId ? { ...b, status: 'confirmed' } : b
      ),
    }));
  },

  cancelSlot: (slotId) => {
    set((state) => ({
      slotBookings: state.slotBookings.map((b) =>
        b.id === slotId ? { ...b, status: 'cancelled' } : b
      ),
    }));
  },

  getAvailableSlots: (gymId, date, trainerId) => {
    if (trainerId && get().isBlacklisted(gymId, trainerId)) return [];

    const gym = MOCK_GYMS.find((g) => g.id === gymId);
    if (!gym) return [];

    const dayOfWeek = new Date(date).getDay();
    const hours = gym.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!hours || !hours.ptAvailable) return [];

    const capacity = get().getCapacity(gymId, dayOfWeek);
    const rawSlots = generate30MinSlots(hours.openTime, hours.closeTime);
    const activeBookings = get().slotBookings.filter(
      (b) =>
        b.gymId === gymId &&
        b.date === date &&
        (b.status === 'pending' || b.status === 'confirmed')
    );

    return rawSlots.map(({ start, end }) => {
      const bookedCount = activeBookings.filter((b) => b.startTime === start).length;
      const myBooking = trainerId
        ? activeBookings.find((b) => b.startTime === start && b.trainerId === trainerId)
        : undefined;
      return {
        startTime: start,
        endTime: end,
        maxTrainers: capacity,
        bookedCount,
        isAvailable: bookedCount < capacity && !myBooking,
        myBooking,
      };
    });
  },

  getGymDaySlots: (gymId, date) => get().getAvailableSlots(gymId, date, ''),

  getPendingBookings: (gymId) =>
    get().slotBookings.filter((b) => b.gymId === gymId && b.status === 'pending'),

  updateCapacity: (gymId, dayOfWeek, max) => {
    set((state) => ({
      capacityOverrides: {
        ...state.capacityOverrides,
        [gymId]: {
          ...(state.capacityOverrides[gymId] ?? {}),
          [dayOfWeek]: Math.max(0, max),
        },
      },
    }));
  },

  getCapacity: (gymId, dayOfWeek) => {
    const overrides = get().capacityOverrides;
    if (overrides[gymId]?.[dayOfWeek] !== undefined) {
      return overrides[gymId][dayOfWeek];
    }
    const gym = MOCK_GYMS.find((g) => g.id === gymId);
    const hours = gym?.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
    return hours?.maxExternalTrainers ?? 0;
  },

  blacklistTrainer: (gymId, trainerId, trainerName) => {
    set((state) => {
      const current = state.blacklists[gymId] ?? [];
      if (current.some((e) => e.trainerId === trainerId)) return state;
      return {
        blacklists: {
          ...state.blacklists,
          [gymId]: [...current, { trainerId, trainerName }],
        },
      };
    });
  },

  unblacklistTrainer: (gymId, trainerId) => {
    set((state) => ({
      blacklists: {
        ...state.blacklists,
        [gymId]: (state.blacklists[gymId] ?? []).filter((e) => e.trainerId !== trainerId),
      },
    }));
  },

  isBlacklisted: (gymId, trainerId) => {
    return (get().blacklists[gymId] ?? []).some((e) => e.trainerId === trainerId);
  },

  getBlacklist: (gymId) => {
    return get().blacklists[gymId] ?? [];
  },
}));

persistOnChange(useGymSlotStore, PERSIST_KEY, (s) => ({
  slotBookings: s.slotBookings,
  capacityOverrides: s.capacityOverrides,
  blacklists: s.blacklists,
  favoriteGyms: s.favoriteGyms,
}));
