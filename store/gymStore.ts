import { create } from 'zustand';
import { onDbError } from '../utils/db';
import { Gym, GymTimeSlot, GeoCoordinate } from '../types';
import { MOCK_GYMS } from '../data/gyms';
import { supabase, isSupabaseConfigured } from '../config/supabase';

// 한 번에 받아올 상한. PostgREST 기본 상한(1000)보다 낮게 잡아 화면 이동이 가벼워지게 한다.
const BOUNDS_LIMIT = 500;
const SEARCH_LIMIT = 50;

// 이미 조회한 지도 영역(반올림 키). 지도를 미세하게 움직일 때 같은 요청이 반복되는 걸 막는다.
const loadedBounds = new Set<string>();

// 받아온 헬스장을 목록에 병합(id 기준 새 데이터 우선).
function mergeGyms(set: (fn: (s: { gyms: Gym[] }) => { gyms: Gym[] }) => void, incoming: Gym[]) {
  if (incoming.length === 0) return;
  set((s) => {
    const ids = new Set(incoming.map((g) => g.id));
    return { gyms: [...incoming, ...s.gyms.filter((g) => !ids.has(g.id))] };
  });
}

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
    is_claimed: g.isClaimed ?? true,
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
    isClaimed: r.is_claimed ?? true,
  };
}

interface GymState {
  gyms: Gym[];
  getGym: (id: string) => Gym | undefined;
  ensureLocalGym: (gym: Gym) => void;          // 로컬 목록에만 추가(신규 관리자 빈 헬스장 시드, DB 미러 안 함)
  upsertGym: (gym: Gym) => void;               // 로컬 갱신 + 실 헬스장은 DB 미러
  seedDemoGyms: () => void;                    // 데모 '둘러보기' 진입 시에만 mock 카탈로그 주입
  loadFromSupabase: () => Promise<void>;        // 입점 헬스장 전량(수가 적음)
  loadInBounds: (b: LatLngBounds) => Promise<void>;              // 지도 화면 범위 안의 헬스장
  loadNearby: (center: GeoCoordinate, radiusKm?: number) => Promise<void>; // 내 주변
  searchGymsByName: (q: string) => Promise<Gym[]>;               // 이름 검색(서버측)
}

export interface LatLngBounds {
  minLat: number; maxLat: number; minLng: number; maxLng: number;
}

// 위/경도 1도당 거리로 반경(km)을 사각형 범위로 환산.
export function boundsFromRadius(center: GeoCoordinate, radiusKm: number): LatLngBounds {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.max(0.2, Math.cos((center.latitude * Math.PI) / 180)));
  return {
    minLat: center.latitude - dLat,
    maxLat: center.latitude + dLat,
    minLng: center.longitude - dLng,
    maxLng: center.longitude + dLng,
  };
}

export const useGymStore = create<GymState>((set, get) => ({
  // 실사용자/비로그인 카탈로그는 Supabase gyms 행만 사용한다.
  // MOCK_GYMS는 데모 '둘러보기'에서 seedDemoGyms()로만 주입(가짜 헬스장이 실사용자에게 노출되지 않도록).
  gyms: [],

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

  seedDemoGyms: () => {
    set((s) => {
      const ids = new Set(s.gyms.map((g) => g.id));
      return { gyms: [...s.gyms, ...MOCK_GYMS.filter((g) => !ids.has(g.id)).map((g) => ({ ...g }))] };
    });
  },

  // 입점(등록)한 헬스장만 전량 로드한다. 실제 예약·슬롯이 걸리는 대상이라 수가 적고,
  // 트레이너 파트너 연결·관리자 화면 등 어디서든 필요해서 항상 갖고 있어야 한다.
  //
  // ⚠️ 공공데이터 미등록 헬스장(현재 전국 1만6천 곳)은 여기서 받지 않는다.
  //    전량을 앱 시작마다 받으면 수 MB·수십 회 요청이라 시작이 느려진다.
  //    → 지도는 loadInBounds(화면 범위), 시작 시엔 loadNearby(내 주변)만 받는다.
  //
  // ⚠️ PostgREST는 요청당 행 수 상한(기본 1000)이 있어 그냥 select 하면 조용히 잘린다.
  //    등록 헬스장도 늘어날 수 있으므로 range로 끝까지 페이지네이션한다.
  loadFromSupabase: async () => {
    if (!isSupabaseConfigured) return;
    const PAGE = 1000;
    const rows: any[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('gyms').select('*').eq('is_claimed', true)
        .range(from, from + PAGE - 1);
      if (error || !data) return;
      rows.push(...data);
      if (data.length < PAGE) break;
    }
    const dbGyms = rows.map(fromRow);
    set((s) => {
      const ids = new Set(dbGyms.map((g) => g.id));
      return { gyms: [...dbGyms, ...s.gyms.filter((g) => !ids.has(g.id))] };
    });
  },

  // 지도 화면에 보이는 범위 안의 헬스장만 가져온다(공공데이터 전량 로드 회피).
  // 이미 받아둔 것은 그대로 두고 새로 받은 것만 병합한다.
  loadInBounds: async (b) => {
    if (!isSupabaseConfigured) return;
    const key = `${b.minLat.toFixed(2)},${b.maxLat.toFixed(2)},${b.minLng.toFixed(2)},${b.maxLng.toFixed(2)}`;
    if (loadedBounds.has(key)) return; // 같은 영역 반복 요청 방지(지도 미세 이동 대비)
    loadedBounds.add(key);
    const { data, error } = await supabase
      .from('gyms').select('*')
      .gte('lat', b.minLat).lte('lat', b.maxLat)
      .gte('lng', b.minLng).lte('lng', b.maxLng)
      .limit(BOUNDS_LIMIT);
    if (error || !data) return;
    mergeGyms(set, data.map(fromRow));
  },

  loadNearby: async (center, radiusKm = 20) => {
    if (!center?.latitude) return;
    await get().loadInBounds(boundsFromRadius(center, radiusKm));
  },

  // 이름 검색은 로컬에 없는 헬스장도 찾아야 하므로 서버에서 조회한다.
  searchGymsByName: async (q) => {
    const term = q.trim();
    if (!isSupabaseConfigured || term.length < 2) return [];
    const { data, error } = await supabase
      .from('gyms').select('*')
      .ilike('name', `%${term}%`)
      .limit(SEARCH_LIMIT);
    if (error || !data) return [];
    const found = data.map(fromRow);
    mergeGyms(set, found); // 상세 화면에서 바로 쓸 수 있게 목록에도 넣어둔다
    return found;
  },
}));
