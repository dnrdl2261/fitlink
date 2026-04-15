import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { MOCK_TRAINERS } from '../../data/trainers';
import { formatPrice, formatDate, formatTime } from '../../utils/formatters';
import { COLORS, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '../../utils/constants';

const TRAINER_ID = 'trainer_001';
const THIS_MONTH = '2026-04';

type Tab = 'today' | 'earnings' | 'rating';

export default function TrainerDashboard() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { bookings } = useBookingStore();
  const slotBookings = useGymSlotStore((s) => s.slotBookings);

  const [activeTab, setActiveTab] = useState<Tab>('today');

  const trainer = MOCK_TRAINERS.find((t) => t.id === TRAINER_ID)!;
  const today = new Date().toISOString().split('T')[0];

  // 오늘 세션
  const todaySessions = bookings
    .filter((b) => b.trainerId === TRAINER_ID && b.sessionDate === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const todayConfirmedSlots = slotBookings
    .filter((b) => b.trainerId === TRAINER_ID && b.date === today && b.status === 'confirmed')
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const todayTotal = todaySessions.length + todayConfirmedSlots.length;

  // 이번 달 수익
  const completedSessions = bookings.filter(
    (b) => b.trainerId === TRAINER_ID && b.status === 'completed' && b.sessionDate.startsWith(THIS_MONTH)
  );
  const confirmedSlots = slotBookings.filter(
    (b) => b.trainerId === TRAINER_ID && b.status === 'confirmed' && b.date.startsWith(THIS_MONTH)
  );

  const sessionEarnings = completedSessions.reduce((sum, b) => sum + Math.round(b.payment.trainerFee * 0.9), 0);
  const totalEarnings = sessionEarnings || trainer.monthlyEarnings;

  // 매출 아이템 통합
  const earningsItems = [
    ...completedSessions.map((b) => ({
      id: b.id,
      date: b.sessionDate,
      time: b.startTime,
      label: `${b.memberName} 회원`,
      detail: b.gymName,
      amount: Math.round(b.payment.trainerFee * 0.9),
      type: 'session' as const,
    })),
    ...confirmedSlots.map((b) => ({
      id: b.id,
      date: b.date,
      time: b.startTime,
      label: b.gymName,
      detail: `회원 ${b.memberCount}명 슬롯`,
      amount: b.memberCount * trainer.sessionPrice,
      type: 'slot' as const,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>안녕하세요 👋</Text>
          <Text style={styles.trainerName}>{trainer.name} 트레이너님</Text>
        </View>
        <TouchableOpacity onPress={() => { logout(); router.replace('/login'); }}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* 통계 카드 — 탭 클릭으로 전환 */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={[styles.statCard, { borderTopColor: COLORS.primary }, activeTab === 'today' && styles.statCardActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={styles.statEmoji}>📅</Text>
          <Text style={[styles.statNum, { color: COLORS.primary }]}>{todayTotal}</Text>
          <Text style={styles.statLabel}>오늘 세션</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { borderTopColor: COLORS.secondary }, activeTab === 'earnings' && styles.statCardActive]}
          onPress={() => setActiveTab('earnings')}
        >
          <Text style={styles.statEmoji}>💰</Text>
          <Text style={[styles.statNum, { color: COLORS.secondary }]}>
            {Math.round(totalEarnings / 10000)}만
          </Text>
          <Text style={styles.statLabel}>이번달 수익</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { borderTopColor: COLORS.warning }, activeTab === 'rating' && styles.statCardActive]}
          onPress={() => setActiveTab('rating')}
        >
          <Text style={styles.statEmoji}>⭐</Text>
          <Text style={[styles.statNum, { color: COLORS.warning }]}>{trainer.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>평점</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 바 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.tabActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>오늘 세션</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'earnings' && styles.tabActive]}
          onPress={() => setActiveTab('earnings')}
        >
          <Text style={[styles.tabText, activeTab === 'earnings' && styles.tabTextActive]}>이번달 수익</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rating' && styles.tabActive]}
          onPress={() => setActiveTab('rating')}
        >
          <Text style={[styles.tabText, activeTab === 'rating' && styles.tabTextActive]}>평점</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* 오늘 세션 탭 */}
        {activeTab === 'today' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>오늘 세션 ({todayTotal}개)</Text>
            {todayTotal === 0 ? (
              <Text style={styles.emptyText}>오늘 예약된 세션이 없습니다</Text>
            ) : (
              <>
                {todayConfirmedSlots.map((s) => {
                  const [h, m] = s.startTime.split(':').map(Number);
                  const endMin = h * 60 + m + 30;
                  const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
                  return (
                    <View key={s.id} style={styles.sessionRow}>
                      <View style={[styles.sessionBar, { backgroundColor: COLORS.gym }]} />
                      <View style={styles.sessionInfo}>
                        <Text style={styles.sessionTime}>{s.startTime} ~ {endTime}</Text>
                        <Text style={styles.sessionSub}>{s.gymName} · 회원 {s.memberCount}명</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: COLORS.gym + '22' }]}>
                        <Text style={[styles.badgeText, { color: COLORS.gym }]}>슬롯 확정</Text>
                      </View>
                    </View>
                  );
                })}
                {todaySessions.map((b) => {
                  const statusColor = BOOKING_STATUS_COLORS[b.status];
                  const endHour = parseInt(b.startTime.split(':')[0]) + 1;
                  const endTime = `${String(endHour).padStart(2, '0')}:00`;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={styles.sessionRow}
                      onPress={() => router.push(`/booking/${b.id}`)}
                    >
                      <View style={[styles.sessionBar, { backgroundColor: statusColor }]} />
                      <View style={styles.sessionInfo}>
                        <Text style={styles.sessionTime}>{formatTime(b.startTime)} ~ {formatTime(endTime)}</Text>
                        <Text style={styles.sessionSub}>{b.memberName} · {b.gymName}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
                        <Text style={[styles.badgeText, { color: statusColor }]}>
                          {BOOKING_STATUS_LABELS[b.status]}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* 이번달 수익 탭 */}
        {activeTab === 'earnings' && (
          <View style={styles.section}>
            <View style={styles.earningsSummary}>
              <Text style={styles.sectionTitle}>이번달 수익</Text>
              <Text style={styles.earningsTotal}>{formatPrice(totalEarnings)}</Text>
            </View>
            {earningsItems.length === 0 ? (
              <Text style={styles.emptyText}>이번달 수익 내역이 없습니다</Text>
            ) : (
              earningsItems.map((item) => (
                <View key={item.id} style={styles.earningsRow}>
                  <View style={[
                    styles.earningsTypeBadge,
                    { backgroundColor: item.type === 'slot' ? COLORS.gym + '22' : COLORS.primary + '22' },
                  ]}>
                    <Text style={[
                      styles.earningsTypeText,
                      { color: item.type === 'slot' ? COLORS.gym : COLORS.primary },
                    ]}>
                      {item.type === 'slot' ? '슬롯' : '세션'}
                    </Text>
                  </View>
                  <View style={styles.earningsInfo}>
                    <Text style={styles.earningsLabel}>{item.label}</Text>
                    <Text style={styles.earningsDetail}>{item.date}  {item.time}  ·  {item.detail}</Text>
                  </View>
                  <Text style={styles.earningsAmount}>+{formatPrice(item.amount)}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* 평점 탭 */}
        {activeTab === 'rating' && (
          <View style={styles.section}>
            {/* 평점 요약 */}
            <View style={styles.ratingHeader}>
              <View style={styles.ratingBig}>
                <Text style={styles.ratingScore}>{trainer.rating.toFixed(1)}</Text>
                <Text style={styles.ratingStars}>
                  {'★'.repeat(Math.floor(trainer.rating))}{'☆'.repeat(5 - Math.floor(trainer.rating))}
                </Text>
                <Text style={styles.ratingCount}>리뷰 {trainer.reviewCount}개</Text>
              </View>
            </View>

            {/* 리뷰 목록 */}
            <Text style={styles.sectionTitle}>최근 리뷰</Text>
            {trainer.reviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <Text style={styles.reviewerName}>{r.reviewerName}</Text>
                  <View style={styles.reviewStarRow}>
                    <Text style={styles.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                    <Text style={styles.reviewDate}>{r.createdAt}</Text>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{r.comment}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: COLORS.secondary,
  },
  welcomeText: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  trainerName: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  logoutText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecorationLine: 'underline' },

  statsGrid: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 4,
    borderTopWidth: 3, borderWidth: 1, borderColor: COLORS.border,
  },
  statCardActive: { borderColor: COLORS.secondary, backgroundColor: COLORS.surfaceElevated },
  statEmoji: { fontSize: 22 },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },

  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 14, paddingHorizontal: 4, marginRight: 24,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.secondary },
  tabText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.secondary },

  content: { padding: 16, gap: 12, paddingBottom: 40 },
  section: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 16, gap: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 12 },

  // 오늘 세션
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  sessionBar: { width: 4, height: 44, borderRadius: 2 },
  sessionInfo: { flex: 1 },
  sessionTime: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sessionSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  // 이번달 수익
  earningsSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningsTotal: { fontSize: 20, fontWeight: '800', color: COLORS.success },
  earningsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  earningsTypeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  earningsTypeText: { fontSize: 11, fontWeight: '700' },
  earningsInfo: { flex: 1, gap: 2 },
  earningsLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  earningsDetail: { fontSize: 11, color: COLORS.textSecondary },
  earningsAmount: { fontSize: 14, fontWeight: '800', color: COLORS.success },

  // 평점
  ratingHeader: { alignItems: 'center', paddingVertical: 8 },
  ratingBig: { alignItems: 'center', gap: 4 },
  ratingScore: { fontSize: 52, fontWeight: '800', color: COLORS.warning },
  ratingStars: { fontSize: 24, color: COLORS.warning },
  ratingCount: { fontSize: 13, color: COLORS.textSecondary },
  reviewCard: {
    backgroundColor: COLORS.surfaceElevated, borderRadius: 12,
    padding: 14, gap: 8,
  },
  reviewTop: { gap: 4 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  reviewStarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewStars: { fontSize: 14, color: COLORS.warning },
  reviewDate: { fontSize: 11, color: COLORS.textSecondary },
  reviewComment: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
});
