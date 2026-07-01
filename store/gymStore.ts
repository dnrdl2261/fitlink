import { create } from 'zustand';
import { onDbError } from '../utils/db';
import { Gym, GymTimeSlot } from '../types';
import { MOCK_GYMS } from '../data/gyms';
import { supabase, isSupabaseConfigured } from '../config/supabase';

// 헬스장 목록의 단일 소스(공유). MOCK_GYMS는 데모 카탈로그, 실 헬스장(관리자 uuid)은 Supabase gyms 테이블에서 병합.
// 실 헬스장의 id == 관리자 auth uuid (트레이너 패턴과 동일). 회원/트레이너 화면이 여기서 base gym을 읽는다.
// (관리자 수정값 오버레이 gymProfileStore.edits는 mock 데모 헬스장에만 적용; 실 헬스장은 행 자체가 최신값)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealGym = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);

// 신규 실 헬스장의 기본 운영시간 (관리자가 시설설정에서 조정)
function defaultHours(): GymTimeSlot[] {
  return ([0, 1, 2, 3, 4, 5, 6] as const).map((dayOfWeek) => ({
    dayOfWeek, openTime: '08:00', closeTime: '22:00', ptAvailable: true, maxExternalTrainers: 2,
  }));
}

// 신규 실 헬스장의 빈 프로필 (관리자가 채움). id == adminUserId == auth uuid.
export function emptyGym(id: string, name: string): Gym {
  return {
    id, name: name || '', description: '', address: '',
    city: '', district: '', dong: '',
    coordinate: { latitude: 0, longitude: 0 },
    phoneNumber: '', images: [], facilities: [],
    operatingHours: defaultHours(),
    // 기본 요금 3종(0원) — 관리자가 시설설정/프로필에서 금액 입력하도록 입력칸 제공
    pricing: [
      { sessionType: 'single', facilityFee: 0, label: '1회 이용' },
      { sessionType: 'package_5', facilityFee: 0, label: '5회 패키지' },
      { sessionType: 'package_10', facilityFee: 0, label: '10회 패키지' },
    ],
    partnerTrainerIds: [], rating: 0, reviewCount: 0,
    isPartner: false, adminUserId: id, usageRules: [],
  };
}

function toRow(g: Gym) {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    address: g.address,
    city: g.city, district: g.district, dong: g.dong,
    lat: g.coordinate?.latitude ?? null,
    lng: g.coordinate?.longitude ?? null,
    phone_number: g.phoneNumber,
    images: g.images,
    facilities: g.facilities,
    operating_hours: g.operatingHours,
    pricing: g.pricing,
    usage_rules: g.usageRules ?? [],
    rating: g.rating,
    review_count: g.reviewCount,
    is_partner: g.isPartner,
    admin_id: g.adminUserId,
  };
}

function fromRow(r: any): Gym {
  return {
    id: r.id,
    name: r.name ?? '',
    description: r.description ?? '',
    address: r.address ?? '',
    city: r.city ?? '', district: r.district ?? '', dong: r.dong ?? '',
    coordinate: { latitude: r.lat ?? 0, longitude: r.lng ?? 0 },
    phoneNumber: r.phone_number ?? '',
    images: r.images ?? [],
    facilities: r.facilities ?? [],
    operatingHours: r.operating_hours ?? [],
    pricing: r.pricing ?? [],
    partnerTrainerIds: [],
    rating: r.rating ?? 0,
    reviewCount: r.review_count ?? 0,
    isPartner: r.is_partner ?? false,
    adminUserId: r.admin_id ?? r.id,
    usageRules: r.usage_rules ?? [],
  };
}

interface GymState {
  gyms: Gym[];
  getGym: (id: string) => Gym | undefined;
  ensureLocalGym: (gym: Gym) => void;          // 로컬 목록에만 추가(신규 관리자 빈 헬스장 시드, DB 미러 안 함)
  upsertGym: (gym: Gym) => void;               // 로컬 갱신 + 실 헬스장은 DB 미러
  loadFromSupabase: () => Promise<void>;
}

export const useGymStore = create<GymState>((set, get) => ({
  gyms: MOCK_GYMS.map((g) => ({ ...g })),

  getGym: (id) => get().gyms.find((g) => g.id === id),

  ensureLocalGym: (gym) => {
    set((s) => (s.gyms.some((g) => g.id === gym.id) ? s : { gyms: [gym, ...s.gyms] }));
  },

  upsertGym: (gym) => {
    set((s) => {
      const exists = s.gyms.some((g) => g.id === gym.id);
      return { gyms: exists ? s.gyms.map((g) => (g.id === gym.id ? gym : g)) : [gym, ...s.gyms] };
    });
    if (isRealGym(gym.id)) {
      supabase.from('gyms').upsert(toRow(gym)).then(() => {}, onDbError);
    }
  },

  // Supabase 실 헬스장을 목록에 병합(id 기준 DB 우선). mock 카탈로그는 유지. 미설정 시 no-op.
  loadFromSupabase: async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.from('gyms').select('*');
    if (error || !data) return;
    const dbGyms = data.map(fromRow);
    set((s) => {
      const ids = new Set(dbGyms.map((g) => g.id));
      return { gyms: [...dbGyms, ...s.gyms.filter((g) => !ids.has(g.id))] };
    });
  },
}));
