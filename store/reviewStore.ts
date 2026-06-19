import { create } from 'zustand';
import { TrainerReview, GymReview } from '../types/review';

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
}));
