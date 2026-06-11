import { create } from 'zustand';
import { TrainerReview, GymReview } from '../types/review';

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
  reviews: [],
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
