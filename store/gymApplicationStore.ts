import { create } from 'zustand';
import { loadPersisted, persistOnChange } from '../utils/persist';

// 헬스장 입점 신청. 운영자 승인 후 입점. 실서비스 전환 시 Supabase 'gym_applications' 테이블로 매핑.
const KEY = 'flowin-gym-applications';

export type GymAppStatus = '대기' | '승인' | '반려';

export interface GymApplication {
  id: string;
  gymName: string;
  ownerName: string;
  businessNumber: string;
  phone: string;
  address: string;
  status: GymAppStatus;
  createdAt: string;
}

const dAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const SEED: GymApplication[] = [
  { id: 'gymapp_1', gymName: '스트롱짐 송파', ownerName: '김대표', businessNumber: '123-45-67890', phone: '010-1234-5678', address: '서울 송파구 올림픽로 300', status: '대기', createdAt: dAgo(1) },
  { id: 'gymapp_2', gymName: '코어피트니스 분당', ownerName: '이사장', businessNumber: '222-33-44444', phone: '010-2222-3333', address: '경기 성남시 분당구 정자일로 95', status: '대기', createdAt: dAgo(3) },
];

interface GymApplicationState {
  applications: GymApplication[];
  addApplication: (a: Omit<GymApplication, 'id' | 'status' | 'createdAt'>) => string;
  setStatus: (id: string, status: GymAppStatus) => void;
}

const init = loadPersisted(KEY, { applications: SEED });

export const useGymApplicationStore = create<GymApplicationState>((set) => ({
  applications: init.applications,
  addApplication: (a) => {
    const id = `gymapp_${Date.now()}`;
    set((s) => ({ applications: [{ ...a, id, status: '대기', createdAt: new Date().toISOString().slice(0, 10) }, ...s.applications] }));
    return id;
  },
  setStatus: (id, status) => set((s) => ({ applications: s.applications.map((x) => (x.id === id ? { ...x, status } : x)) })),
}));

persistOnChange(useGymApplicationStore, KEY, (s) => ({ applications: s.applications }));
