export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export type FacilityTag =
  | '샤워실'
  | '주차장'
  | '락커룸'
  | '요가스튜디오'
  | '필라테스'
  | '수영장'
  | '사우나'
  | '스쿼시'
  | '카페테리아'
  | '어린이놀이터';

export interface GymTimeSlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  openTime: string;
  closeTime: string;
  ptAvailable: boolean;
  maxExternalTrainers: number; // 30분 슬롯당 동시에 받을 수 있는 최대 외부 트레이너 수
}

export interface PricingTier {
  sessionType: 'single' | 'package_5' | 'package_10';
  facilityFee: number;
  label: string;
}

export interface Gym {
  id: string;
  name: string;
  description: string;
  address: string;
  coordinate: GeoCoordinate;
  phoneNumber: string;
  images: string[];
  facilities: FacilityTag[];
  operatingHours: GymTimeSlot[];
  pricing: PricingTier[];
  partnerTrainerIds: string[];
  rating: number;
  reviewCount: number;
  isPartner: boolean;
  adminUserId: string;
  distance?: number;
  usageRules?: string[];
}
