import { create } from 'zustand';
import { SlotBooking, SlotInfo } from '../types';
import { MOCK_GYMS } from '../data/gyms';

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
    date: string;
    startTime: string;
    memberCount: number;
    facilityFee: number;
  }) => string | null;

  confirmSlot: (slotId: string) => void;
  cancelSlot: (slotId: string) => void;

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

export const useGymSlotStore = create<GymSlotState>((set, get) => ({
  slotBookings: [],
  capacityOverrides: {},
  blacklists: {},
  favoriteGyms: [],

  toggleFavorite: (gymId) => {
    set((state) => ({
      favoriteGyms: state.favoriteGyms.includes(gymId)
        ? state.favoriteGyms.filter((id) => id !== gymId)
        : [...state.favoriteGyms, gymId],
    }));
  },

  isFavorite: (gymId) => get().favoriteGyms.includes(gymId),

  bookSlot: ({ gymId, gymName, trainerId, trainerName, date, startTime, memberCount, facilityFee }) => {
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
