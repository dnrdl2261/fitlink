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

export interface TrainerPhoto {
  id: string;
  uri: string;
  caption?: string;
}

export interface TrainerVideo {
  id: string;
  uri: string;
  caption?: string;
}

export interface TrainerAddress {
  city: string;
  district: string;
  dong: string;
}

export type ExerciseType =
  | '웨이트트레이닝' | '보디빌딩' | '파워리프팅'
  | '기구필라테스' | '매트필라테스' | '요가'
  | '크로스핏' | '기능성운동' | '스트레칭'
  | '맨몸운동' | '골프' | '선수트레이닝'
  | '재활운동' | '통증운동' | '시니어운동' | '유소년운동';

export type TrainingGoal =
  | '다이어트' | '벌크업' | '린매스업' | '바디프로필'
  | '기초체력' | '근력향상' | '체형교정' | '재활운동'
  | '산전산후' | '웨딩케어' | '대회준비' | '선수레슨'
  | '입시체육' | '키성장' | '실버운동' | '통증관리'
  | '유연성증진' | '고도비만탈출' | '마른비만탈출';

export type TrainingStyle =
  | '식단밀착관리' | '멘탈케어' | '스파르타' | '동기부여형'
  | '이론중심' | '자세분석' | '부위별집중' | '고강도훈련'
  | '저강도훈련' | '재활특화' | '움직임개선' | '컨디셔닝'
  | '정통웨이트' | '생활습관교정' | '홈트레이닝가이드';

export type Convenience =
  | '새벽수업' | '심야수업' | '주말수업' | '유동적스케줄'
  | '주차가능' | '샤워시설' | '운동복제공' | '개인락커'
  | '단독대관' | '예약제운영';

export interface Trainer extends BaseUser {
  role: 'trainer';
  gender: 'male' | 'female';
  tagline: string;
  bio: string;
  region: string;
  address: TrainerAddress;
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
  photos?: TrainerPhoto[];
  videos?: TrainerVideo[];
  exerciseTypes?: ExerciseType[];
  trainingGoals?: TrainingGoal[];
  trainingStyles?: TrainingStyle[];
  conveniences?: Convenience[];
}
