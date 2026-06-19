export type SlotStatus = 'pending' | 'confirmed' | 'cancelled';

export interface SlotBooking {
  id: string;
  gymId: string;
  gymName: string;
  trainerId: string;
  trainerName: string;
  memberId?: string;    // 이 슬롯을 이용할 회원 (트레이너가 회원 대상으로 예약 시)
  memberName?: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm (30분 단위)
  memberCount: number;
  facilityFee: number; // memberCount × 1회 이용료
  status: SlotStatus;
  createdAt: string;
}

export interface SlotInfo {
  startTime: string;
  endTime: string;
  maxTrainers: number;
  bookedCount: number;  // pending + confirmed 합계
  isAvailable: boolean;
  myBooking?: SlotBooking;
}
