import { create } from 'zustand';
import { FacilityTag, PricingTier, GymTimeSlot, Gym } from '../types';
import { loadPersisted, persistOnChange } from '../utils/persist';

// 원본 헬스장에 관리자 수정값(가격·운영시간·시설 등)을 덮어 '실제 적용 헬스장'을 반환.
// 트레이너/회원 화면이 관리자 설정을 반영해 읽도록 공용 사용.
export function mergeGymEdits(gym: Gym, allEdits: Record<string, GymProfileEdits>): Gym {
  const e = allEdits[gym.id];
  return e ? { ...gym, ...e } : gym;
}

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
