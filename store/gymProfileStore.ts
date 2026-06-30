import { create } from 'zustand';
import { FacilityTag, PricingTier, GymTimeSlot, Gym, GeoCoordinate } from '../types';
import { loadPersisted, persistOnChange } from '../utils/persist';
import { useGymStore } from './gymStore';

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
  images?: string[];
  // 위치(지역) — 실 헬스장이 직접 설정. mock은 고정.
  address?: string;
  city?: string;
  district?: string;
  dong?: string;
  coordinate?: GeoCoordinate;   // 지역 → 지오코딩 좌표(거리정렬용)
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
    // 실 헬스장은 수정값을 gyms 행에 직접 반영(영속). mock 데모는 edits 오버레이만(upsertGym은 로컬 갱신, DB 미러 안 함).
    const base = useGymStore.getState().getGym(gymId);
    if (base) useGymStore.getState().upsertGym({ ...base, ...get().edits[gymId] });
  },

  getEdits: (gymId) => get().edits[gymId] ?? {},
}));

persistOnChange(useGymProfileStore, KEY, (s) => ({ edits: s.edits }));
