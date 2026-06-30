import { create } from 'zustand';
import { SlotBooking, SlotInfo } from '../types';
import { loadPersisted, persistOnChange } from '../utils/persist';
import { useGymProfileStore } from './gymProfileStore';
import { useGymStore } from './gymStore';
import { supabase, isSupabaseConfigured } from '../config/supabase';

// ── Supabase 연동 (실 사용자만) ──────────────────────────────
// 실 트레이너/헬스장 id == auth uuid. 슬롯은 실 트레이너가 예약하거나 실 헬스장에 속하면 DB 사용.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealUser = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);
const isRealSlot = (b: SlotBooking) => isRealUser(b.trainerId) || isRealUser(b.gymId);

function slotToRow(b: SlotBooking) {
  return {
    id: b.id, gym_id: b.gymId, gym_name: b.gymName,
    trainer_id: b.trainerId, trainer_name: b.trainerName,
    member_id: b.memberId ?? null, member_name: b.memberName ?? null,
    date: b.date, start_time: b.startTime,
    member_count: b.memberCount, facility_fee: b.facilityFee,
    status: b.status, created_at: b.createdAt,
  };
}

function slotFromRow(r: any): SlotBooking {
  return {
    id: r.id, gymId: r.gym_id, gymName: r.gym_name ?? '',
    trainerId: r.trainer_id ?? '', trainerName: r.trainer_name ?? '',
    memberId: r.member_id ?? undefined, memberName: r.member_name ?? undefined,
    date: r.date, startTime: r.start_time,
    memberCount: r.member_count ?? 1, facilityFee: r.facility_fee ?? 0,
    status: r.status, createdAt: r.created_at ?? '',
  };
}

// 변경된 슬롯을 fire-and-forget으로 DB에 미러 (실 슬롯만).
function mirrorSlot(id: string) {
  if (!isSupabaseConfigured) return;
  const b = useGymSlotStore.getState().slotBookings.find((x) => x.id === id);
  if (!b || !isRealSlot(b)) return;
  supabase.from('slot_bookings').upsert(slotToRow(b)).then(() => {}, () => {});
}

function mergeSlots(rows: SlotBooking[]) {
  useGymSlotStore.setState((s) => {
    const ids = new Set(rows.map((r) => r.id));
    return { slotBookings: [...rows, ...s.slotBookings.filter((b) => !ids.has(b.id))] };
  });
}

// 실 헬스장의 수용override/블랙리스트를 gyms 행(jsonb)에 미러. 관리자 세션에서만 호출됨(RLS: admin_id=auth.uid()).
function mirrorGymSettings(gymId: string) {
  if (!isRealUser(gymId)) return;
  const s = useGymSlotStore.getState();
  supabase.from('gyms').update({
    capacity_overrides: s.capacityOverrides[gymId] ?? {},
    blacklist: s.blacklists[gymId] ?? [],
  }).eq('id', gymId).then(() => {}, () => {});
}

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

  loadTrainerSlots: (trainerId: string) => Promise<void>;
  loadGymSlots: (gymId: string) => Promise<void>;
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
  const members = ['강서연', '김영희', '박민수', '정수아', '이준호', '최지훈'];
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
  // 트레이너가 시설 슬롯을 예약한 데모(회원=비데모 회원). 시설 예약은 트레이너만 가능.
  { id: 'slot_seed_2', gymId: 'gym_002', gymName: '역삼 스포츠센터',   trainerId: 'trainer_001', trainerName: '김민준', memberId: undefined, memberName: '김영희', date: slotDate(0), startTime: '14:00', memberCount: 1, facilityFee: 12000, status: 'confirmed', createdAt: slotDate(-1) },
  { id: 'slot_seed_3', gymId: 'gym_001', gymName: '강남 피트니스 클럽', trainerId: 'trainer_001', trainerName: '김민준', memberId: undefined, memberName: '정수아', date: slotDate(3), startTime: '11:00', memberCount: 1, facilityFee: 15000, status: 'pending',   createdAt: slotDate(0) },
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
    const id = `slot_admin_${Date.now()}`;
    set((state) => ({
      slotBookings: [{
        id,
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
    mirrorSlot(id);
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
    mirrorSlot(id);
    return id;
  },

  confirmSlot: (slotId) => {
    set((state) => ({
      slotBookings: state.slotBookings.map((b) =>
        b.id === slotId ? { ...b, status: 'confirmed' } : b
      ),
    }));
    mirrorSlot(slotId);
  },

  cancelSlot: (slotId) => {
    set((state) => ({
      slotBookings: state.slotBookings.map((b) =>
        b.id === slotId ? { ...b, status: 'cancelled' } : b
      ),
    }));
    mirrorSlot(slotId);
  },

  getAvailableSlots: (gymId, date, trainerId) => {
    if (trainerId && get().isBlacklisted(gymId, trainerId)) return [];

    const baseGym = useGymStore.getState().getGym(gymId);
    if (!baseGym) return [];

    // 관리자가 수정한 운영시간/PT가용을 반영 (실 헬스장은 행 자체에 반영됨, mock은 edits 오버레이)
    const edits = useGymProfileStore.getState().edits[gymId];
    const operatingHours = edits?.operatingHours ?? baseGym.operatingHours;

    const dayOfWeek = new Date(date).getDay();
    const hours = operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
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
    mirrorGymSettings(gymId);
  },

  getCapacity: (gymId, dayOfWeek) => {
    const overrides = get().capacityOverrides;
    if (overrides[gymId]?.[dayOfWeek] !== undefined) {
      return overrides[gymId][dayOfWeek];
    }
    const gym = useGymStore.getState().getGym(gymId);
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
    mirrorGymSettings(gymId);
  },

  unblacklistTrainer: (gymId, trainerId) => {
    set((state) => ({
      blacklists: {
        ...state.blacklists,
        [gymId]: (state.blacklists[gymId] ?? []).filter((e) => e.trainerId !== trainerId),
      },
    }));
    mirrorGymSettings(gymId);
  },

  isBlacklisted: (gymId, trainerId) => {
    return (get().blacklists[gymId] ?? []).some((e) => e.trainerId === trainerId);
  },

  getBlacklist: (gymId) => {
    return get().blacklists[gymId] ?? [];
  },

  // 실 트레이너(uuid)의 시설 슬롯 예약을 로드. 데모/미설정은 no-op.
  loadTrainerSlots: async (trainerId) => {
    if (!isRealUser(trainerId)) return;
    const { data, error } = await supabase.from('slot_bookings').select('*').eq('trainer_id', trainerId);
    if (error || !data) return;
    mergeSlots(data.map(slotFromRow));
  },

  // 실 헬스장(uuid)에 들어온 슬롯 예약 + 수용override/블랙리스트를 로드(관리자용). 데모/미설정은 no-op.
  loadGymSlots: async (gymId) => {
    if (!isRealUser(gymId)) return;
    const { data, error } = await supabase.from('slot_bookings').select('*').eq('gym_id', gymId);
    if (!error && data) mergeSlots(data.map(slotFromRow));
    // 관리자 설정(gyms 행의 jsonb)을 로컬 상태로 반영
    const { data: g } = await supabase.from('gyms').select('capacity_overrides, blacklist').eq('id', gymId).single();
    if (g) {
      set((s) => ({
        capacityOverrides: { ...s.capacityOverrides, [gymId]: (g.capacity_overrides as any) ?? {} },
        blacklists: { ...s.blacklists, [gymId]: (g.blacklist as any) ?? [] },
      }));
    }
  },
}));

persistOnChange(useGymSlotStore, PERSIST_KEY, (s) => ({
  slotBookings: s.slotBookings,
  capacityOverrides: s.capacityOverrides,
  blacklists: s.blacklists,
  favoriteGyms: s.favoriteGyms,
}));
