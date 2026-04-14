export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface PaymentSummary {
  facilityFee: number;
  trainerFee: number;
  platformFee: number;
  totalAmount: number;
  currency: 'KRW';
}

export interface Booking {
  id: string;
  memberId: string;
  memberName: string;
  trainerId: string;
  trainerName: string;
  gymId: string;
  gymName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  payment: PaymentSummary;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
