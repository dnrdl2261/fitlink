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
    return id;
  },

  getMemberOffers: (memberId) =>
    get().offers.filter((x) => x.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  getPendingForMember: (memberId) =>
    get().offers.filter((x) => x.memberId === memberId && x.status === '제안'),

  acceptOffer: (id) => set((s) => ({ offers: s.offers.map((x) => (x.id === id ? { ...x, status: '수락' } : x)) })),
  declineOffer: (id) => set((s) => ({ offers: s.offers.map((x) => (x.id === id ? { ...x, status: '거절' } : x)) })),
  markExpiryReminded: (id) => set((s) => ({ offers: s.offers.map((x) => (x.id === id ? { ...x, expiryReminded: true } : x)) })),
}));

persistOnChange(useOfferStore, KEY, (s) => ({ offers: s.offers }));
