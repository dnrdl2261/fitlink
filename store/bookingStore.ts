import { create } from 'zustand';
import { Booking, BookingStatus } from '../types';
import { MOCK_BOOKINGS } from '../data/bookings';
import { PLATFORM_FEE_RATE } from '../utils/constants';

interface NewBookingParams {
  trainerId: string;
  trainerName: string;
  gymId: string;
  gymName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  facilityFee: number;
  trainerFee: number;
  notes?: string;
}

const AUTO_CONFIRM_MS = 3 * 60 * 60 * 1000; // 3시간

interface BookingState {
  bookings: Booking[];
  addBooking: (params: NewBookingParams) => string;
  cancelBooking: (bookingId: string) => void;
  updateStatus: (bookingId: string, status: BookingStatus) => void;
  autoConfirmPending: () => void;
  getMyBookings: (memberId: string) => Booking[];
  getTrainerBookings: (trainerId: string) => Booking[];
  getGymBookings: (gymId: string) => Booking[];
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: MOCK_BOOKINGS,

  addBooking: (params: NewBookingParams) => {
    const id = `booking_${Date.now()}`;
    const totalBase = params.facilityFee + params.trainerFee;
    const platformFee = Math.round(totalBase * PLATFORM_FEE_RATE);

    const newBooking: Booking = {
      id,
      memberId: 'member_001',
      memberName: '홍길동',
      trainerId: params.trainerId,
      trainerName: params.trainerName,
      gymId: params.gymId,
      gymName: params.gymName,
      sessionDate: params.sessionDate,
      startTime: params.startTime,
      endTime: params.endTime,
      status: 'pending',
      payment: {
        facilityFee: params.facilityFee,
        trainerFee: params.trainerFee,
        platformFee,
        totalAmount: totalBase + platformFee,
        currency: 'KRW',
      },
      notes: params.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({ bookings: [newBooking, ...state.bookings] }));
    return id;
  },

  cancelBooking: (bookingId: string) => {
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId
          ? { ...b, status: 'cancelled', updatedAt: new Date().toISOString().split('T')[0] }
          : b
      ),
    }));
  },

  updateStatus: (bookingId: string, status: BookingStatus) => {
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === bookingId
          ? { ...b, status, updatedAt: new Date().toISOString() }
          : b
      ),
    }));
  },

  autoConfirmPending: () => {
    const now = Date.now();
    set((state) => ({
      bookings: state.bookings.map((b) => {
        if (b.status !== 'pending') return b;
        const createdTime = new Date(b.createdAt).getTime();
        if (now - createdTime >= AUTO_CONFIRM_MS) {
          return { ...b, status: 'confirmed', updatedAt: new Date().toISOString() };
        }
        return b;
      }),
    }));
  },

  getMyBookings: (memberId: string) => {
    return get().bookings.filter((b) => b.memberId === memberId);
  },

  getTrainerBookings: (trainerId: string) => {
    return get().bookings.filter((b) => b.trainerId === trainerId);
  },

  getGymBookings: (gymId: string) => {
    return get().bookings.filter((b) => b.gymId === gymId);
  },
}));
