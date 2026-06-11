export type TrainerSlotStatus = 'open' | 'booked' | 'cancelled';

export interface TrainerAvailableSlot {
  id: string;
  trainerId: string;
  trainerName: string;
  gymId: string;
  gymName: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  trainerFee: number;
  facilityFee: number;
  status: TrainerSlotStatus;
  notes?: string;
  createdAt: string;
}
