import { create } from 'zustand';
import { onDbError } from '../utils/db';
import { TrainerReview, GymReview } from '../types/review';
import { supabase, isSupabaseConfigured } from '../config/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealUser = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);

function trainerReviewToRow(r: TrainerReview) {
  return {
    id: r.id, trainer_id: r.trainerId, trainer_name: r.trainerName,
    booking_id: r.bookingId ?? null, member_id: r.memberId, member_name: r.memberName,
    member_avatar: r.memberAvatar ?? null, rating: r.rating, comment: r.comment,
    media: r.media ?? [], created_at: r.createdAt,
  };
}
function trainerReviewFromRow(r: any): TrainerReview {
  return {
    id: r.id, trainerId: r.trainer_id, trainerName: r.trainer_name ?? '',
    bookingId: r.booking_id ?? '', memberId: r.member_id, memberName: r.member_name ?? '',
    memberAvatar: r.member_avatar ?? undefined, rating: r.rating ?? 5, comment: r.comment ?? '',
    media: r.media ?? [], createdAt: r.created_at ?? '',
  };
}
function gymReviewToRow(r: GymReview) {
  return {
    id: r.id, gym_id: r.gymId, gym_name: r.gymName,
    member_id: r.memberId, member_name: r.memberName, member_avatar: r.memberAvatar ?? null,
    rating: r.rating, comment: r.comment, created_at: r.createdAt,
  };
}
function gymReviewFromRow(r: any): GymReview {
  return {
    id: r.id, gymId: r.gym_id, gymName: r.gym_name ?? '',
    memberId: r.member_id, memberName: r.member_name ?? '', memberAvatar: r.member_avatar ?? undefined,
    rating: r.rating ?? 5, comment: r.comment ?? '', createdAt: r.created_at ?? '',
  };
}

// 시연용 더미 후기 (김민준 트레이너 = trainer_001)
const MOCK_TRAINER_REVIEWS: TrainerReview[] = [
  {
    id: 'review_demo_1',
    trainerId: 'trainer_001',
    trainerName: '김민준',
    bookingId: 'booking_demo_r1',
    memberId: 'member_001',
    memberName: '홍길동',
    rating: 5,
    comment: '자세 교정을 꼼꼼하게 잡아주시고 매 세션마다 동기부여가 확실해요. 3개월 만에 체형이 확 달라졌습니다!',
    media: [],
    createdAt: '2026-06-12',
  },
  {
    id: 'review_demo_2',
    trainerId: 'trainer_001',
    trainerName: '김민준',
    bookingId: 'booking_demo_r2',
    memberId: 'member_002',
    memberName: '김영희',
    rating: 4,
    comment: '운동 강도를 체력에 맞게 조절해 주셔서 무리 없이 따라갈 수 있었어요. 식단 피드백도 큰 도움이 됐습니다.',
    media: [],
    createdAt: '2026-06-05',
  },
];

interface ReviewState {
  reviews: TrainerReview[];
  gymReviews: GymReview[];
  addReview: (data: Omit<TrainerReview, 'id' | 'createdAt'>) => string;
  addGymReview: (data: Omit<GymReview, 'id' | 'createdAt'>) => string;
  getTrainerReviews: (trainerId: string) => TrainerReview[];
  getGymReviews: (gymId: string) => GymReview[];
  hasReviewed: (bookingId: string) => boolean;
  hasReviewedGym: (gymId: string, memberId: string) => boolean;
  loadFromSupabase: () => Promise<void>;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: MOCK_TRAINER_REVIEWS,
  gymReviews: [],

  addReview: (data) => {
    const id = `review_${Date.now()}`;
    const review: TrainerReview = {
      ...data,
      id,
      createdAt: new Date().toISOString().split('T')[0],
    };
    set((state) => ({ reviews: [...state.reviews, review] }));
    if (isRealUser(review.memberId)) {
      supabase.from('trainer_reviews').insert(trainerReviewToRow(review)).then(() => {}, onDbError);
    }
    return id;
  },

  addGymReview: (data) => {
    const id = `gym_review_${Date.now()}`;
    const review: GymReview = {
      ...data,
      id,
      createdAt: new Date().toISOString().split('T')[0],
    };
    set((state) => ({ gymReviews: [...state.gymReviews, review] }));
    if (isRealUser(review.memberId)) {
      supabase.from('gym_reviews').insert(gymReviewToRow(review)).then(() => {}, onDbError);
    }
    return id;
  },

  getTrainerReviews: (trainerId) =>
    get().reviews.filter((r) => r.trainerId === trainerId),

  getGymReviews: (gymId) =>
    get().gymReviews.filter((r) => r.gymId === gymId),

  hasReviewed: (bookingId) =>
    get().reviews.some((r) => r.bookingId === bookingId),

  hasReviewedGym: (gymId, memberId) =>
    get().gymReviews.some((r) => r.gymId === gymId && r.memberId === memberId),

  // 공개 후기를 Supabase에서 로드(병합). mock 시드 유지. 미설정은 no-op.
  loadFromSupabase: async () => {
    if (!isSupabaseConfigured) return;
    const [tr, gr] = await Promise.all([
      supabase.from('trainer_reviews').select('*'),
      supabase.from('gym_reviews').select('*'),
    ]);
    set((state) => {
      const next: Partial<ReviewState> = {};
      if (!tr.error && tr.data) {
        const rows = tr.data.map(trainerReviewFromRow);
        const ids = new Set(rows.map((r) => r.id));
        next.reviews = [...rows, ...state.reviews.filter((r) => !ids.has(r.id))];
      }
      if (!gr.error && gr.data) {
        const rows = gr.data.map(gymReviewFromRow);
        const ids = new Set(rows.map((r) => r.id));
        next.gymReviews = [...rows, ...state.gymReviews.filter((r) => !ids.has(r.id))];
      }
      return next as ReviewState;
    });
  },
}));
