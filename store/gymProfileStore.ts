import { create } from 'zustand';
import { FacilityTag, PricingTier, GymTimeSlot } from '../types';
import { loadPersisted, persistOnChange } from '../utils/persist';

const KEY = 'flowin-gym-profile';

export interface GymProfileEdits {
  name?: string;
  phoneNumber?: string;
  description?: string;
  facilities?: FacilityTag[];
  pricing?: PricingTier[];
  usageRules?: string[];
  operatingHours?: GymTimeSlot[];
}

interface GymProfileState {
  edits: Record<string, GymProfileEdits>;
  updateProfile: (gymId: string, data: GymProfileEdits) => void;
  getEdits: (gymId: string) => GymProfileEdits;
}

const init = loadPersisted(KEY, { edits: {} as Record<string, GymProfileEdits> });

export const useGymProfileStore = create<GymProfileState>((set, get) => ({
  edits: init.edits,

  updateProfile: (gymId, data) => {
    set(s => ({
      edits: { ...s.edits, [gymId]: { ...(s.edits[gymId] ?? {}), ...data } },
    }));
  },

  getEdits: (gymId) => get().edits[gymId] ?? {},
}));

persistOnChange(useGymProfileStore, KEY, (s) => ({ edits: s.edits }));
