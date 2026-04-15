import { BaseUser } from './user';

export type Specialization =
  | '체중감량'
  | '근육증가'
  | '재활'
  | '필라테스'
  | '크로스핏'
  | '요가'
  | '체력향상'
  | '스포츠퍼포먼스';

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issuedDate: string;
  expiryDate?: string;
  verified: boolean;
}

export interface WorkHistory {
  id: string;
  gymName: string;
  position: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface Review {
  id: string;
  reviewerName: string;
  reviewerImage?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface AvailableSlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  endTime: string;
}

export interface Trainer extends BaseUser {
  role: 'trainer';
  bio: string;
  region: string;
  specializations: Specialization[];
  certifications: Certification[];
  workHistory: WorkHistory[];
  experienceYears: number;
  rating: number;
  reviewCount: number;
  reviews: Review[];
  sessionPrice: number;
  partnerGymIds: string[];
  availableSlots: AvailableSlot[];
  totalSessions: number;
  monthlyEarnings: number;
}
