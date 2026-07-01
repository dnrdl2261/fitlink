import { create } from 'zustand';
import { onDbError } from '../utils/db';
import { loadPersisted, persistOnChange } from '../utils/persist';
import { supabase, isSupabaseConfigured } from '../config/supabase';

// 헬스장 입점 신청. 비로그인 공개 폼이라 신청자 uuid가 없음 → Supabase에 익명 제출(insert),
// 조회·승인/반려는 운영자만(RLS). 운영자 승인 후 입점.
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
  loadAll: () => Promise<void>;
}

function appToRow(a: GymApplication) {
  return {
    id: a.id, gym_name: a.gymName, owner_name: a.ownerName, business_number: a.businessNumber,
    phone: a.phone, address: a.address, status: a.status, created_at: a.createdAt,
  };
}
function appFromRow(x: any): GymApplication {
  return {
    id: x.id, gymName: x.gym_name, ownerName: x.owner_name, businessNumber: x.business_number,
    phone: x.phone, address: x.address, status: x.status, createdAt: x.created_at,
  };
}
function mergeApps(local: GymApplication[], remote: GymApplication[]): GymApplication[] {
  const map = new Map(local.map((a) => [a.id, a]));
  remote.forEach((a) => map.set(a.id, a));
  return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const init = loadPersisted(KEY, { applications: SEED });

export const useGymApplicationStore = create<GymApplicationState>((set) => ({
  applications: init.applications,
  addApplication: (a) => {
    const id = `gymapp_${Date.now()}`;
    const app: GymApplication = { ...a, id, status: '대기', createdAt: new Date().toISOString().slice(0, 10) };
    set((s) => ({ applications: [app, ...s.applications] }));
    if (isSupabaseConfigured) supabase.from('gym_applications').insert(appToRow(app)).then(() => {}, onDbError);
    return id;
  },
  setStatus: (id, status) => {
    set((s) => ({ applications: s.applications.map((x) => (x.id === id ? { ...x, status } : x)) }));
    if (isSupabaseConfigured) supabase.from('gym_applications').update({ status }).eq('id', id).then(() => {}, onDbError);
  },
  // 운영자 전체 조회(RLS: 운영자만). 미설정/비운영자는 no-op.
  loadAll: async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase.from('gym_applications').select('*');
    if (!data) return;
    set((s) => ({ applications: mergeApps(s.applications, data.map(appFromRow)) }));
  },
}));

persistOnChange(useGymApplicationStore, KEY, (s) => ({ applications: s.applications }));
