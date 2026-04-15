export type SlotStatus = 'pending' | 'confirmed' | 'cancelled';

export interface SlotBooking {
  id: string;
  gymId: string;
  gymName: string;
  trainerId: string;
  trainerName: string;
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
