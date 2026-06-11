export interface ReviewMedia {
  id: string;
  type: 'image' | 'video';
  uri: string;
}

export interface TrainerReview {
  id: string;
  trainerId: string;
  trainerName: string;
  bookingId: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  rating: number;
  comment: string;
  media: ReviewMedia[];
  createdAt: string;
}

export interface GymReview {
  id: string;
  gymId: string;
  gymName: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
}
