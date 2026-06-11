import { create } from 'zustand';
import { FacilityTag, PricingTier } from '../types';

export interface GymProfileEdits {
  name?: string;
  phoneNumber?: string;
  description?: string;
  facilities?: FacilityTag[];
  pricing?: PricingTier[];
  usageRules?: string[];
}

interface GymProfileState {
  edits: Record<string, GymProfileEdits>;
  updateProfile: (gymId: string, data: GymProfileEdits) => void;
  getEdits: (gymId: string) => GymProfileEdits;
}

export const useGymProfileStore = create<GymProfileState>((set, get) => ({
  edits: {},

  updateProfile: (gymId, data) => {
    set(s => ({
      edits: { ...s.edits, [gymId]: { ...(s.edits[gymId] ?? {}), ...data } },
    }));
  },

  getEdits: (gymId) => get().edits[gymId] ?? {},
}));
