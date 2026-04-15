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

interface GymSlotState {
  slotBookings: SlotBooking[];
  capacityOverrides: Record<string, Record<number, number>>;

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
}

export const useGymSlotStore = create<GymSlotState>((set, get) => ({
  slotBookings: [],
  capacityOverrides: {},

  bookSlot: ({ gymId, gymName, trainerId, trainerName, date, startTime, memberCount, facilityFee }) => {
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
}));
