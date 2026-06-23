import { create } from 'zustand';
import { loadPersisted, persistOnChange } from '../utils/persist';

// 트레이너 → 회원 맞춤 재등록 제안. 실서비스 전환 시 Supabase 'offers' 테이블로 매핑.
const KEY = 'flowin-offers';

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
}

const init = loadPersisted(KEY, { offers: [] as ReRegOffer[] });

export const useOfferStore = create<OfferState>((set, get) => ({
  offers: init.offers,

  addOffer: (o) => {
    const id = `offer_${Date.now()}`;
    set((s) => ({ offers: [{ ...o, id, status: '제안', createdAt: new Date().toISOString() }, ...s.offers] }));
    return id;
  },

  getMemberOffers: (memberId) =>
    get().offers.filter((x) => x.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  getPendingForMember: (memberId) =>
    get().offers.filter((x) => x.memberId === memberId && x.status === '제안'),

  acceptOffer: (id) => set((s) => ({ offers: s.offers.map((x) => (x.id === id ? { ...x, status: '수락' } : x)) })),
  declineOffer: (id) => set((s) => ({ offers: s.offers.map((x) => (x.id === id ? { ...x, status: '거절' } : x)) })),
}));

persistOnChange(useOfferStore, KEY, (s) => ({ offers: s.offers }));
