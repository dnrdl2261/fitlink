import { create } from 'zustand';
import { TrainerAvailableSlot } from '../types';
import { INITIAL_TRAINER_SLOTS } from '../data/trainerSlots';

interface AddSlotParams {
  trainerId: string;
  trainerName: string;
  gymId: string;
  gymName: string;
  date: string;
  startTime: string;
  endTime: string;
  trainerFee: number;
  facilityFee: number;
  notes?: string;
}

interface TrainerSlotState {
  slots: TrainerAvailableSlot[];
  addSlot: (params: AddSlotParams) => string;
  cancelSlot: (slotId: string) => void;
  bookSlot: (slotId: string) => void;
  getTrainerAllSlots: (trainerId: string) => TrainerAvailableSlot[];
  getTrainerOpenSlots: (trainerId: string) => TrainerAvailableSlot[];
  getDateSlots: (trainerId: string, date: string) => TrainerAvailableSlot[];
}

export const useTrainerSlotStore = create<TrainerSlotState>((set, get) => ({
  slots: INITIAL_TRAINER_SLOTS,

  addSlot: (params) => {
    const id = `tslot_${Date.now()}`;
    const newSlot: TrainerAvailableSlot = {
      ...params,
      id,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ slots: [...state.slots, newSlot] }));
    return id;
  },

  cancelSlot: (slotId) => {
    set((state) => ({
      slots: state.slots.map((s) =>
        s.id === slotId ? { ...s, status: 'cancelled' } : s
      ),
    }));
  },

  bookSlot: (slotId) => {
    set((state) => ({
      slots: state.slots.map((s) =>
        s.id === slotId ? { ...s, status: 'booked' } : s
      ),
    }));
  },

  getTrainerAllSlots: (trainerId) =>
    get().slots.filter((s) => s.trainerId === trainerId),

  getTrainerOpenSlots: (trainerId) =>
    get().slots.filter((s) => s.trainerId === trainerId && s.status === 'open'),

  getDateSlots: (trainerId, date) =>
    get().slots.filter((s) => s.trainerId === trainerId && s.date === date),
}));
