import { create } from 'zustand';
import { loadPersisted, persistOnChange } from '../utils/persist';
import { supabase, isSupabaseConfigured } from '../config/supabase';

// 트레이너 → 회원 맞춤 재등록 제안. Supabase 'offers' 테이블 연동.
const KEY = 'flowin-offers';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealUser = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);

export type OfferStatus = '제안' | '수락' | '거절';

export interface ReRegOffer {
  id: string;
  trainerId: string;
  trainerName: string;
  memberId: string;
  memberName: string;
  sessionCount: number;
  pricePerSession: number; // 제안 1회 가격
  basePrice: number;       // 정상가(할인 표시용)
  memo: string;
  expiresAt: string;       // 제안 만료일 (YYYY-MM-DD)
  expiryReminded?: boolean; // 만료 임박 알림 발송 여부
  status: OfferStatus;
  createdAt: string;
}

interface OfferState {
  offers: ReRegOffer[];
  addOffer: (o: Omit<ReRegOffer, 'id' | 'status' | 'createdAt'>) => string;
  getMemberOffers: (memberId: string) => ReRegOffer[];
  getPendingForMember: (memberId: string) => ReRegOffer[];
  acceptOffer: (id: string) => void;
  declineOffer: (id: string) => void;
  markExpiryReminded: (id: string) => void;
  loadForMember: (memberId: string) => Promise<void>;
  loadForTrainer: (trainerId: string) => Promise<void>;
}

const isRealOffer = (o: ReRegOffer) => isRealUser(o.memberId) || isRealUser(o.trainerId);
function offerToRow(o: ReRegOffer) {
  return {
    id: o.id, trainer_id: o.trainerId, trainer_name: o.trainerName,
    member_id: o.memberId, member_name: o.memberName,
    session_count: o.sessionCount, price_per_session: o.pricePerSession, base_price: o.basePrice,
    memo: o.memo, expires_at: o.expiresAt, expiry_reminded: !!o.expiryReminded,
    status: o.status, created_at: o.createdAt,
  };
}
function offerFromRow(r: any): ReRegOffer {
  return {
    id: r.id, trainerId: r.trainer_id, trainerName: r.trainer_name ?? '',
    memberId: r.member_id, memberName: r.member_name ?? '',
    sessionCount: r.session_count ?? 0, pricePerSession: r.price_per_session ?? 0, basePrice: r.base_price ?? 0,
    memo: r.memo ?? '', expiresAt: r.expires_at ?? '', expiryReminded: !!r.expiry_reminded,
    status: r.status, createdAt: r.created_at ?? '',
  };
}
function mirrorOffer(id: string) {
  if (!isSupabaseConfigured) return;
  const o = useOfferStore.getState().offers.find((x) => x.id === id);
  if (!o || !isRealOffer(o)) return;
  supabase.from('offers').upsert(offerToRow(o)).then(() => {}, () => {});
}
function mergeOffers(rows: ReRegOffer[]) {
  useOfferStore.setState((s) => {
    const ids = new Set(rows.map((r) => r.id));
    return { offers: [...rows, ...s.offers.filter((o) => !ids.has(o.id))] };
  });
}

const dateAfter = (days: number) => {
  const d = new Date(); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 데모용 마감 임박 제안(회원 진입 시 만료 임박 알림 시연)
const SEED_OFFERS: ReRegOffer[] = [
  {
    id: 'offer_demo_1',
    trainerId: 'trainer_001', trainerName: '김민준',
    memberId: 'member_001', memberName: '홍길동',
    sessionCount: 10, pricePerSession: 70000, basePrice: 90000,
    memo: '재등록 감사 할인 🙏 다음 달도 함께해요!',
    expiresAt: dateAfter(1),
    status: '제안', createdAt: dateAfter(-2),
  },
];

const init = loadPersisted(KEY, { offers: SEED_OFFERS });

export const useOfferStore = create<OfferState>((set, get) => ({
  offers: init.offers,

  addOffer: (o) => {
    const id = `offer_${Date.now()}`;
    set((s) => ({ offers: [{ ...o, id, status: '제안', createdAt: new Date().toISOString() }, ...s.offers] }));
    mirrorOffer(id);
    return id;
  },

  getMemberOffers: (memberId) =>
    get().offers.filter((x) => x.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  getPendingForMember: (memberId) =>
    get().offers.filter((x) => x.memberId === memberId && x.status === '제안'),

  acceptOffer: (id) => { set((s) => ({ offers: s.offers.map((x) => (x.id === id ? { ...x, status: '수락' } : x)) })); mirrorOffer(id); },
  declineOffer: (id) => { set((s) => ({ offers: s.offers.map((x) => (x.id === id ? { ...x, status: '거절' } : x)) })); mirrorOffer(id); },
  markExpiryReminded: (id) => { set((s) => ({ offers: s.offers.map((x) => (x.id === id ? { ...x, expiryReminded: true } : x)) })); mirrorOffer(id); },

  loadForMember: async (memberId) => {
    if (!isRealUser(memberId)) return;
    const { data, error } = await supabase.from('offers').select('*').eq('member_id', memberId);
    if (error || !data) return;
    mergeOffers(data.map(offerFromRow));
  },
  loadForTrainer: async (trainerId) => {
    if (!isRealUser(trainerId)) return;
    const { data, error } = await supabase.from('offers').select('*').eq('trainer_id', trainerId);
    if (error || !data) return;
    mergeOffers(data.map(offerFromRow));
  },
}));

persistOnChange(useOfferStore, KEY, (s) => ({ offers: s.offers }));
