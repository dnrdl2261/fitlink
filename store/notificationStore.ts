import { create } from 'zustand';

export type NotifType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'session_reminder'
  | 'session_completed'
  | 'slot_approved'
  | 'slot_rejected'
  | 'slot_request'
  | 'payment_done'
  | 'review_received'
  | 'partner_approved'
  | 'partner_rejected'
  | 'partner_invite'
  | 'consultation_request';

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  targetRole: 'member' | 'trainer' | 'gym';
  userId: string;
  meta?: { bookingId?: string; sessionId?: string; trainerId?: string; slotBookingId?: string; gymId?: string };
}

const MOCK: Notification[] = [
  {
    id: 'n_1', type: 'booking_confirmed', isRead: false,
    title: '예약이 확정되었습니다',
    body: '김민준 트레이너와의 PT 예약이 확정되었습니다. 매주 월·수 오전 10:00',
    createdAt: '2026-05-20T09:00:00',
    targetRole: 'member', userId: 'member_001',
    meta: { bookingId: 'booking_001' },
  },
  {
    id: 'n_2', type: 'session_reminder', isRead: false,
    title: '오늘 PT 세션이 있습니다',
    body: '김민준 트레이너와의 세션이 1시간 후 시작됩니다. (오전 10:00)',
    createdAt: '2026-05-20T09:01:00',
    targetRole: 'member', userId: 'member_001',
    meta: { bookingId: 'booking_001' },
  },
  {
    id: 'n_3', type: 'payment_done', isRead: true,
    title: '결제가 완료되었습니다',
    body: '10회 패키지 결제 900,000원이 완료되었습니다.',
    createdAt: '2026-05-19T15:30:00',
    targetRole: 'member', userId: 'member_001',
    meta: { bookingId: 'booking_001' },
  },
  {
    id: 'n_4', type: 'session_completed', isRead: true,
    title: '세션이 완료되었습니다',
    body: '오늘 PT 세션이 완료되었습니다. 후기를 남겨보세요!',
    createdAt: '2026-05-18T11:10:00',
    targetRole: 'member', userId: 'member_001',
    meta: { bookingId: 'booking_001' },
  },
  {
    id: 'n_5', type: 'slot_request', isRead: false,
    title: '새 슬롯 예약 요청',
    body: '김민준 트레이너가 5/21(수) 10:00~10:30 슬롯을 요청했습니다.',
    createdAt: '2026-05-20T08:30:00',
    targetRole: 'gym', userId: 'admin_001',
  },
  {
    id: 'n_6', type: 'slot_request', isRead: false,
    title: '새 슬롯 예약 요청',
    body: '박지성 트레이너가 5/22(목) 14:00~14:30 슬롯을 요청했습니다.',
    createdAt: '2026-05-19T16:00:00',
    targetRole: 'gym', userId: 'admin_001',
  },
  {
    id: 'n_7', type: 'slot_approved', isRead: false,
    title: '슬롯 예약이 승인되었습니다',
    body: '강남 피트니스에서 5/21(수) 10:00 슬롯 예약을 승인했습니다.',
    createdAt: '2026-05-20T09:30:00',
    targetRole: 'trainer', userId: 'trainer_001',
  },
  {
    id: 'n_8', type: 'booking_confirmed', isRead: false,
    title: '새 PT 예약이 접수되었습니다',
    body: '홍길동 회원이 10회 패키지를 결제했습니다. 일정을 확인해주세요.',
    createdAt: '2026-05-20T08:00:00',
    targetRole: 'trainer', userId: 'trainer_001',
  },
  {
    id: 'n_9', type: 'review_received', isRead: true,
    title: '새 후기가 등록되었습니다',
    body: '이수진 회원이 ★5 후기를 남겼습니다: "정말 친절하고 열정적인 트레이너..."',
    createdAt: '2026-05-17T20:15:00',
    targetRole: 'trainer', userId: 'trainer_001',
  },
  {
    id: 'n_10', type: 'slot_rejected', isRead: true,
    title: '슬롯 예약이 거절되었습니다',
    body: '강남 피트니스에서 5/15(목) 16:00 슬롯 예약을 거절했습니다.',
    createdAt: '2026-05-14T14:00:00',
    targetRole: 'trainer', userId: 'trainer_001',
  },
  {
    id: 'n_11', type: 'partner_approved', isRead: true,
    title: '파트너 승인 완료',
    body: '강남 피트니스와의 파트너 계약이 승인되었습니다.',
    createdAt: '2026-05-10T10:00:00',
    targetRole: 'trainer', userId: 'trainer_001',
  },
];

interface NotifState {
  notifications: Notification[];
  markRead: (id: string) => void;
  markAllRead: (userId: string) => void;
  addNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
  getUnread: (userId: string) => number;
}

export const useNotificationStore = create<NotifState>((set, get) => ({
  notifications: MOCK,

  markRead: (id) => set((s) => ({
    notifications: s.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n),
  })),

  markAllRead: (userId) => set((s) => ({
    notifications: s.notifications.map((n) =>
      n.userId === userId ? { ...n, isRead: true } : n
    ),
  })),

  addNotification: (data) => set((s) => ({
    notifications: [{
      ...data,
      id: `n_${Date.now()}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    }, ...s.notifications],
  })),

  getUnread: (userId) => get().notifications.filter((n) => n.userId === userId && !n.isRead).length,
}));
