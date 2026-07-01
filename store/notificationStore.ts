import { create } from 'zustand';
import { onDbError } from '../utils/db';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { registerForPushNotificationsAsync } from '../config/push';

export type NotifType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'session_reminder'
  | 'session_completed'
  | 'session_confirm_request'
  | 'session_confirmed'
  | 'session_disputed'
  | 'slot_approved'
  | 'slot_rejected'
  | 'slot_request'
  | 'payment_done'
  | 'review_received'
  | 'partner_approved'
  | 'partner_rejected'
  | 'partner_invite'
  | 'partner_request'
  | 'consultation_request'
  | 'trainer_proposal';

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

// ── Supabase 연동 (실 수신자만; 데모 mock id는 로컬만) ──────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealUser = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);

function notifToRow(n: Notification) {
  return {
    id: n.id, type: n.type, title: n.title, body: n.body,
    is_read: n.isRead, created_at: n.createdAt,
    target_role: n.targetRole, user_id: n.userId, meta: n.meta ?? null,
  };
}

function notifFromRow(r: any): Notification {
  return {
    id: r.id, type: r.type, title: r.title ?? '', body: r.body ?? '',
    isRead: !!r.is_read, createdAt: r.created_at ?? '',
    targetRole: r.target_role, userId: r.user_id, meta: r.meta ?? undefined,
  };
}

interface NotifState {
  notifications: Notification[];
  markRead: (id: string) => void;
  markAllRead: (userId: string) => void;
  addNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
  getUnread: (userId: string) => number;
  loadFromSupabase: (userId: string) => Promise<void>;
  savePushToken: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotifState>((set, get) => ({
  notifications: MOCK,

  markRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n),
    }));
    const n = get().notifications.find((x) => x.id === id);
    if (n && isRealUser(n.userId)) {
      supabase.from('notifications').update({ is_read: true }).eq('id', id).then(() => {}, onDbError);
    }
  },

  markAllRead: (userId) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.userId === userId ? { ...n, isRead: true } : n
      ),
    }));
    if (isRealUser(userId)) {
      supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).then(() => {}, onDbError);
    }
  },

  addNotification: (data) => {
    const n: Notification = {
      ...data,
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ notifications: [n, ...s.notifications] }));
    // 실 수신자 알림만 DB에 미러(작성자=다른 사용자라도 RLS insert는 인증 사용자 누구나 허용).
    if (isRealUser(n.userId)) {
      supabase.from('notifications').insert(notifToRow(n)).then(() => {}, onDbError);
      // 네이티브 푸시 발송(Edge Function). 미배포/토큰없음이면 조용히 무시 — 인앱 알림은 정상 동작.
      supabase.functions.invoke('send-push', {
        body: { userId: n.userId, title: n.title, body: n.body, data: n.meta ?? {} },
      }).then(() => {}, () => {}); // Edge Function 미배포/토큰없음은 정상 → 조용히 무시
    }
  },

  getUnread: (userId) => get().notifications.filter((n) => n.userId === userId && !n.isRead).length,

  // 실 사용자(uuid)의 알림을 Supabase에서 로드해 병합(id 기준). 데모/미설정은 no-op.
  loadFromSupabase: async (userId) => {
    if (!isRealUser(userId)) return;
    const { data, error } = await supabase
      .from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return;
    const rows = data.map(notifFromRow);
    set((s) => {
      const ids = new Set(rows.map((r) => r.id));
      return { notifications: [...rows, ...s.notifications.filter((n) => !ids.has(n.id))] };
    });
  },

  // 기기 푸시 토큰을 등록해 저장(실 사용자만). 웹/권한거부/미실기기는 no-op.
  savePushToken: async (userId) => {
    if (!isRealUser(userId)) return;
    const token = await registerForPushNotificationsAsync();
    if (!token) return;
    supabase.from('push_tokens').upsert({
      user_id: userId,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    }).then(() => {}, onDbError);
  },
}));
