import React, { useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore, Notification, NotifType } from '../store/notificationStore';
import { COLORS } from '../utils/constants';

const ICON_MAP: Record<NotifType, { icon: string; color: string; bg: string }> = {
  booking_confirmed: { icon: 'calendar-check', color: COLORS.success, bg: COLORS.success + '15' },
  booking_cancelled: { icon: 'calendar-remove', color: COLORS.error, bg: COLORS.error + '12' },
  session_reminder:  { icon: 'clock-alert', color: COLORS.primary, bg: COLORS.primaryPale },
  session_completed: { icon: 'check-circle', color: COLORS.success, bg: COLORS.success + '15' },
  slot_approved:     { icon: 'shield-check', color: COLORS.success, bg: COLORS.success + '15' },
  slot_rejected:     { icon: 'shield-off', color: COLORS.error, bg: COLORS.error + '12' },
  slot_request:      { icon: 'calendar-plus', color: COLORS.secondary, bg: COLORS.secondary + '18' },
  payment_done:      { icon: 'cash-check', color: '#7C3AED', bg: '#EDE9FE' },
  review_received:   { icon: 'star', color: '#D97706', bg: '#FEF3C7' },
  partner_approved:  { icon: 'handshake', color: COLORS.secondary, bg: COLORS.secondary + '18' },
  partner_rejected:      { icon: 'handshake-off', color: COLORS.error, bg: COLORS.error + '12' },
  partner_invite:        { icon: 'email-plus-outline', color: COLORS.primary, bg: COLORS.primaryPale },
  partner_request:       { icon: 'account-plus-outline', color: COLORS.secondary, bg: COLORS.secondary + '18' },
  consultation_request:  { icon: 'chat-question-outline', color: '#0891B2', bg: '#E0F2FE' },
};

// 알림 종류(+받는 역할)별로 "누르면 이동할 처리 화면"을 결정.
// params.highlight 가 있으면 목적지 화면에서 해당 항목을 강조 표시한다.
type NotifRoute = { pathname: string; params?: Record<string, string> };

function resolveRoute(n: Notification): NotifRoute | null {
  const m = n.meta ?? {};
  switch (n.type) {
    case 'booking_confirmed':
      // 회원: 예약 상세 / 트레이너: 회원 관리
      return n.targetRole === 'trainer'
        ? { pathname: '/(trainer)/members' }
        : m.bookingId ? { pathname: '/booking/[id]', params: { id: m.bookingId } } : null;

    case 'booking_cancelled':
    case 'session_reminder':
    case 'session_completed':
      return m.bookingId ? { pathname: '/booking/[id]', params: { id: m.bookingId } } : null;

    case 'payment_done':
      return m.bookingId ? { pathname: '/booking/receipt', params: { id: m.bookingId } } : null;

    case 'slot_approved':
    case 'slot_rejected':
      return { pathname: '/(trainer)/my-slot-bookings', ...(m.slotBookingId ? { params: { highlight: m.slotBookingId } } : {}) };

    case 'slot_request':
      return { pathname: '/(gym)/bookings', ...(m.trainerId ? { params: { highlight: m.trainerId } } : {}) };

    case 'review_received':
      return { pathname: '/(trainer)/profile' };

    case 'partner_approved':
    case 'partner_rejected':
    case 'partner_invite':
      // 헬스장이 받으면 트레이너 관리, 트레이너가 받으면 파트너 헬스장
      return n.targetRole === 'gym'
        ? { pathname: '/(gym)/trainers', ...(m.trainerId ? { params: { highlight: m.trainerId } } : {}) }
        : { pathname: '/(trainer)/partner-gyms', ...(m.gymId ? { params: { highlight: m.gymId } } : {}) };

    case 'partner_request':
      // 헬스장이 받는 트레이너 입점 신청 → 트레이너 관리 '신청·초대' 탭
      return { pathname: '/(gym)/trainers', params: { tab: 'requests', ...(m.trainerId ? { highlight: m.trainerId } : {}) } };

    case 'consultation_request':
      return { pathname: '/(trainer)/schedule' };

    default:
      return null;
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  return `${days}일 전`;
}

function NotifItem({ item, onPress }: { item: Notification; onPress: () => void }) {
  const { icon, color, bg } = ICON_MAP[item.type] ?? ICON_MAP.booking_confirmed;
  return (
    <TouchableOpacity
      style={[styles.item, !item.isRead && styles.itemUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {!item.isRead && <View style={styles.unreadDot} />}
      <View style={[styles.iconBox, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.textArea}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, !item.isRead && styles.titleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { member, trainer, gymAdmin, role } = useAuthStore();
  const { notifications, markRead, markAllRead } = useNotificationStore();

  const userId = role === 'member'    ? (member?.id ?? '') :
                 role === 'trainer'   ? (trainer?.id ?? '') :
                 role === 'gym_admin' ? (gymAdmin?.id ?? '') :
                 '';

  const backRoute = role === 'trainer'   ? '/(trainer)/' :
                    role === 'gym_admin' ? '/(gym)/bookings' :
                                          '/(member)/trainers';

  const myNotifs = useMemo(
    () => notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notifications, userId]
  );

  const unreadCount = myNotifs.filter((n) => !n.isRead).length;

  const handlePress = (item: Notification) => {
    markRead(item.id);
    const route = resolveRoute(item);
    if (!route) return;
    const target = { pathname: route.pathname, params: route.params } as any;
    // 탭 그룹 화면은 navigate(중복 스택 방지), 상세 화면은 push
    if (route.pathname.startsWith('/(')) router.navigate(target);
    else router.push(target);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.navigate(backRoute as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.readAllBtn}
            onPress={() => markAllRead(userId)}
          >
            <Text style={styles.readAllText}>모두 읽음</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <MaterialCommunityIcons name="bell-ring" size={15} color={COLORS.primary} />
          <Text style={styles.unreadBannerText}>읽지 않은 알림 {unreadCount}개</Text>
        </View>
      )}

      <FlatList
        data={myNotifs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotifItem item={item} onPress={() => handlePress(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="bell-off-outline" size={52} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>알림이 없습니다</Text>
            <Text style={styles.emptySub}>새로운 소식이 생기면 알려드릴게요</Text>
          </View>
        }
        contentContainerStyle={myNotifs.length === 0 ? { flex: 1 } : { paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 12, paddingRight: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 6, marginRight: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, flex: 1, marginLeft: 4 },
  headerRight: { width: 72 },
  readAllBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: COLORS.primaryPale, borderRadius: 10,
  },
  readAllText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  unreadBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  unreadBannerText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    position: 'relative',
  },
  itemUnread: { backgroundColor: '#fafbff' },
  unreadDot: {
    position: 'absolute', top: 18, left: 10,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  iconBox: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  textArea: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  title: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1, marginRight: 8 },
  titleUnread: { fontWeight: '700', color: COLORS.text },
  time: { fontSize: 11, color: COLORS.textMuted, flexShrink: 0 },
  body: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginLeft: 74 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 80 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textSecondary },
});
