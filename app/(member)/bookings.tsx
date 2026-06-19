import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, SafeAreaView, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import BookingCard from '../../components/BookingCard';
import { useBookingStore } from '../../store/bookingStore';
import { useReviewStore } from '../../store/reviewStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '../../utils/constants';
import { BookingStatus, Booking } from '../../types';
import { formatDate, formatTime } from '../../utils/formatters';

type TabKey = BookingStatus | 'consultation';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'active',       label: '이용중' },
  { key: 'completed',    label: '완료' },
  { key: 'cancelled',    label: '취소' },
  { key: 'consultation', label: '상담' },
];

function ConsultCard({ booking, onCancel }: { booking: Booking; onCancel?: () => void }) {
  const statusColor = BOOKING_STATUS_COLORS[booking.status] ?? COLORS.textSecondary;
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const session = booking.sessions[0];

  return (
    <View style={cst.card}>
      <View style={cst.header}>
        <View style={cst.headerLeft}>
          <View style={cst.consultBadge}>
            <MaterialCommunityIcons name="chat-question-outline" size={12} color="#0891B2" />
            <Text style={cst.consultBadgeText}>무료상담</Text>
          </View>
          <Text style={cst.trainerName}>{booking.trainerName} 트레이너</Text>
        </View>
        <View style={[cst.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[cst.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {session && (
        <View style={cst.infoRow}>
          <MaterialCommunityIcons name="calendar-clock" size={15} color={COLORS.textSecondary} />
          <Text style={cst.infoText}>
            {formatDate(session.date)}  {formatTime(session.startTime)} · 30분
          </Text>
        </View>
      )}

      {booking.notes ? (
        <View style={cst.notesRow}>
          <MaterialCommunityIcons name="text-box-outline" size={15} color={COLORS.textSecondary} />
          <Text style={cst.notesText} numberOfLines={2}>{booking.notes}</Text>
        </View>
      ) : null}

      {booking.status === 'active' && onCancel && (
        <TouchableOpacity style={cst.cancelBtn} onPress={onCancel}>
          <Text style={cst.cancelText}>예약 취소</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function BookingsScreen() {
  const router = useRouter();
  const { bookings, cancelBooking, completeSession, rejectCompletion } = useBookingStore();
  const { hasReviewed } = useReviewStore();
  const { member } = useAuthStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [activeTab, setActiveTab] = useState<TabKey>('active');

  const memberId = member?.id ?? 'member_001';
  const myBookings = bookings.filter((b) => b.memberId === memberId);

  // 트레이너가 완료 요청한(pending) 세션 — 회원이 직접 확인/이의제기
  const pendingConfirms = myBookings.flatMap((b) =>
    b.sessions
      .filter((s) => s.status === 'pending')
      .map((s) => ({
        bookingId: b.id,
        sessionId: s.id,
        trainerId: b.trainerId,
        trainerName: b.trainerName,
        date: s.date,
        startTime: s.startTime,
        ptLabel: b.type === 'consultation' ? '무료상담' : `PT ${b.usedSessions + 1}/${b.totalSessions}회`,
      }))
  );
  const ptBookings = myBookings.filter((b) => b.type !== 'consultation');
  const consultBookings = myBookings.filter((b) => b.type === 'consultation');

  // '이용중' 탭은 확정 대기(pending)도 함께 노출
  const matchTab = (b: Booking, tab: TabKey) =>
    tab === 'active' ? (b.status === 'active' || b.status === 'pending') : b.status === tab;

  const filtered = activeTab === 'consultation'
    ? consultBookings
    : ptBookings.filter((b) => matchTab(b, activeTab));

  const getCount = (tab: TabKey) =>
    tab === 'consultation'
      ? consultBookings.length
      : ptBookings.filter((b) => matchTab(b, tab)).length;

  const handleCancel = (bookingId: string) => {
    Alert.alert('예약 취소', '예약을 취소하시겠습니까?\n취소된 예약은 복구할 수 없습니다.', [
      { text: '아니오', style: 'cancel' },
      { text: '취소하기', style: 'destructive', onPress: () => cancelBooking(bookingId) },
    ]);
  };

  type PendingItem = (typeof pendingConfirms)[number];
  const whenText = (p: PendingItem) => `${formatDate(p.date)} ${formatTime(p.startTime)}`;

  const confirmComplete = (p: PendingItem) => {
    const msg = `${p.trainerName} 트레이너 · ${p.ptLabel}\n${whenText(p)}\n\n완료로 확인하면 1회차가 차감됩니다.`;
    const apply = () => {
      completeSession(p.bookingId, p.sessionId);
      addNotification({
        type: 'session_confirmed',
        title: '회원이 세션을 확인했습니다',
        body: `${p.ptLabel} 세션(${whenText(p)})을 회원이 완료 확인했습니다.`,
        targetRole: 'trainer',
        userId: p.trainerId,
        meta: { bookingId: p.bookingId, sessionId: p.sessionId },
      });
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`[세션 완료 확인]\n\n${msg}`)) apply();
      return;
    }
    Alert.alert('세션 완료 확인', msg, [
      { text: '취소', style: 'cancel' },
      { text: '확인', onPress: apply },
    ]);
  };

  const disputeComplete = (p: PendingItem) => {
    const msg = `${p.trainerName} 트레이너 · ${p.ptLabel}\n${whenText(p)}\n\n사실과 다른가요? 이의를 제기하면 완료 요청이 취소되고 트레이너에게 전달됩니다.`;
    const apply = () => {
      rejectCompletion(p.bookingId, p.sessionId);
      addNotification({
        type: 'session_disputed',
        title: '회원이 이의를 제기했습니다',
        body: `${p.ptLabel} 세션(${whenText(p)}) 완료 요청에 회원이 이의를 제기했습니다. 일정을 확인해 주세요.`,
        targetRole: 'trainer',
        userId: p.trainerId,
        meta: { bookingId: p.bookingId, sessionId: p.sessionId },
      });
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`[이의 제기]\n\n${msg}`)) apply();
      return;
    }
    Alert.alert('이의 제기', msg, [
      { text: '취소', style: 'cancel' },
      { text: '이의 제기', style: 'destructive', onPress: apply },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            <View style={[styles.countBadge, activeTab === tab.key && styles.countBadgeActive]}>
              <Text style={[styles.countText, activeTab === tab.key && styles.countTextActive]}>
                {getCount(tab.key)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          pendingConfirms.length > 0 ? (
            <View style={pend.wrap}>
              <View style={pend.head}>
                <MaterialCommunityIcons name="clipboard-check-outline" size={16} color={COLORS.primary} />
                <Text style={pend.title}>완료 확인 요청 {pendingConfirms.length}건</Text>
              </View>
              <Text style={pend.sub}>
                트레이너가 세션 완료를 요청했어요. 실제로 받았으면 확인, 아니면 이의를 제기하세요.
              </Text>
              {pendingConfirms.map((p) => (
                <View key={p.sessionId} style={pend.item}>
                  <View style={{ flex: 1 }}>
                    <Text style={pend.itemTitle}>{p.trainerName} 트레이너 · {p.ptLabel}</Text>
                    <Text style={pend.itemWhen}>{whenText(p)}</Text>
                  </View>
                  <TouchableOpacity style={pend.disputeBtn} onPress={() => disputeComplete(p)}>
                    <Text style={pend.disputeText}>이의</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={pend.confirmBtn} onPress={() => confirmComplete(p)}>
                    <Text style={pend.confirmText}>확인</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) =>
          activeTab === 'consultation' ? (
            <ConsultCard
              booking={item}
              onCancel={item.status === 'active' ? () => handleCancel(item.id) : undefined}
            />
          ) : (
            <BookingCard
              booking={item}
              onPress={() => router.push(`/booking/${item.id}`)}
              onCancel={item.status === 'active' ? () => handleCancel(item.id) : undefined}
              onReview={
                item.status === 'completed'
                  ? () => router.push({
                      pathname: '/review/write' as any,
                      params: {
                        trainerId: item.trainerId,
                        trainerName: item.trainerName,
                        bookingId: item.id,
                      },
                    })
                  : undefined
              }
              reviewDone={item.status === 'completed' && hasReviewed(item.id)}
            />
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons
                name={
                  activeTab === 'consultation' ? 'chat-question-outline' :
                  activeTab === 'active'       ? 'dumbbell' :
                  activeTab === 'completed'    ? 'check-circle-outline' : 'close-circle-outline'
                }
                size={28}
                color={COLORS.textSecondary}
              />
            </View>
            <Text style={styles.emptyText}>
              {activeTab === 'consultation'
                ? '상담 예약 내역이 없습니다'
                : activeTab === 'active'
                ? '이용중인 PT 패키지가 없습니다'
                : activeTab === 'completed'
                ? '완료된 패키지가 없습니다'
                : '취소된 예약이 없습니다'}
            </Text>
            {(activeTab === 'active' || activeTab === 'consultation') && (
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => router.navigate('/(member)/trainers' as any)}
              >
                <Text style={styles.bookBtnText}>트레이너 찾아보기</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary },
  countBadge: {
    backgroundColor: COLORS.borderSubtle,
    borderRadius: 999,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countBadgeActive: { backgroundColor: COLORS.primary + '22' },
  countText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  countTextActive: { color: COLORS.primary },
  listContent: { paddingTop: 4, paddingBottom: 24 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIconBox: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
  bookBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

const cst = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: { gap: 5 },
  consultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  consultBadgeText: { fontSize: 11, fontWeight: '700', color: '#0891B2' },
  trainerName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderSubtle,
  },
  infoText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  notesText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  cancelBtn: {
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: 'center',
  },
  cancelText: { color: COLORS.error, fontSize: 14, fontWeight: '600' },
});

const pend = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 6, lineHeight: 18 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderSubtle,
  },
  itemTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  itemWhen: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  disputeBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9,
    borderWidth: 1, borderColor: COLORS.error,
  },
  disputeText: { fontSize: 13, fontWeight: '700', color: COLORS.error },
  confirmBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 9,
    backgroundColor: COLORS.primary,
  },
  confirmText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
