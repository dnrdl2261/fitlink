import React, { useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, SafeAreaView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { useReviewStore } from '../../store/reviewStore';
import { formatPrice, formatTime } from '../../utils/formatters';

const D = {
  bg:          '#EEF2F9',
  surface:     '#FFFFFF',
  primary:     '#4F63F5',
  primaryGlow: 'rgba(79,99,245,0.12)',
  text:        '#0F172A',
  textSec:     '#64748B',
  textMuted:   '#94A3B8',
  border:      '#E2E8F0',
  success:     '#10B981',
  error:       '#EF4444',
  amber:       '#F59E0B',
  amberPale:   'rgba(245,158,11,0.10)',
};

const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
const MONTH_PREFIX = TODAY.slice(0, 7);

const MINI_BARS = [
  { label: '12월', amount: 4000000 },
  { label: '1월',  amount: 3200000 },
  { label: '2월',  amount: 3700000 },
  { label: '3월',  amount: 4100000 },
  { label: '4월',  amount: 3900000 },
  { label: '5월',  amount: 4350000 },
];

export default function TrainerDashboardScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const { trainer } = useAuthStore();
  const { bookings } = useBookingStore();
  const allReviews = useReviewStore((s) => s.reviews);
  const trainerId = trainer?.id ?? '';

  const stats = useMemo(() => {
    const myBookings = bookings.filter((b) => b.trainerId === trainerId);

    const todayScheduled = myBookings.flatMap((b) =>
      b.sessions.filter((s) => s.date === TODAY && s.status === 'scheduled')
    );
    const totalHours = todayScheduled.length; // 1h per session assumed

    const activeMembers = new Set(
      myBookings.filter((b) => b.status === 'active').map((b) => b.memberId)
    ).size;

    const todayEarnings = myBookings.reduce((sum, b) => {
      const done = b.sessions.filter((s) => s.date === TODAY && s.status === 'completed');
      return sum + done.length * Math.round(b.pricePerSession * 0.9);
    }, 0);

    const upcoming = myBookings
      .flatMap((b) =>
        b.sessions
          .filter((s) => s.status === 'scheduled' && s.date >= TODAY)
          .map((s) => ({ ...s, memberName: b.memberName, bookingType: b.type }))
      )
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, 5);

    return { todayCount: todayScheduled.length, totalHours, activeMembers, todayEarnings, upcoming };
  }, [bookings, trainerId]);

  const recentReviews = useMemo(() =>
    allReviews
      .filter((r) => r.trainerId === trainerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3),
    [allReviews, trainerId]
  );

  const maxBar = Math.max(...MINI_BARS.map((b) => b.amount));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return '좋은 아침이에요';
    if (h < 17) return '좋은 오후예요';
    return '수고하셨어요';
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: D.bg }}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.trainerName}>{trainer?.name ?? '트레이너'} 트레이너님</Text>
          </View>
          {trainer?.profileImageUrl ? (
            <Image source={{ uri: trainer.profileImageUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{(trainer?.name ?? '?')[0]}</Text>
            </View>
          )}
        </View>

        {/* ── 오늘 통계 4카드 ── */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: D.primary }]}
            onPress={() => router.push('/(trainer)/schedule' as any)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="dumbbell" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statValWhite}>{stats.todayCount}</Text>
            <Text style={styles.statLabelWhite}>오늘 수업</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: D.surface }]}
            onPress={() => router.push('/(trainer)/schedule' as any)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="clock-outline" size={20} color={D.primary} />
            <Text style={[styles.statVal, { color: D.text }]}>{stats.totalHours}h</Text>
            <Text style={styles.statLabelDark}>총 시간</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: D.surface }]}
            onPress={() => router.push('/(trainer)/members' as any)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="account-group-outline" size={20} color={D.success} />
            <Text style={[styles.statVal, { color: D.text }]}>{stats.activeMembers}</Text>
            <Text style={styles.statLabelDark}>회원 관리</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: D.surface }]}
            onPress={() => router.push('/(trainer)/earnings' as any)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="cash-multiple" size={20} color={D.amber} />
            <Text style={[styles.statVal, { color: D.text }]}>
              {stats.todayEarnings > 0 ? `${Math.round(stats.todayEarnings / 10000)}만` : '0원'}
            </Text>
            <Text style={styles.statLabelDark}>오늘 수입</Text>
          </TouchableOpacity>
        </View>

        {/* ── 이번 달 수익 미니 차트 ── */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(trainer)/earnings' as any)}
          activeOpacity={0.92}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>이번 달 수익</Text>
            <Text style={styles.earningsAmount}>{formatPrice(4350000)}</Text>
          </View>
          <View style={styles.miniChart}>
            {MINI_BARS.map((bar, i) => {
              const barH = Math.max((bar.amount / maxBar) * 60, 4);
              const isLast = i === MINI_BARS.length - 1;
              return (
                <View key={bar.label} style={styles.miniBarWrap}>
                  <View style={styles.miniBarTrack}>
                    <View style={[styles.miniBar, { height: barH }, isLast && styles.miniBarActive]} />
                  </View>
                  <Text style={[styles.miniBarLabel, isLast && styles.miniBarLabelActive]}>
                    {bar.label}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.earningsFooter}>
            <MaterialCommunityIcons name="trending-up" size={14} color={D.success} />
            <Text style={styles.earningsGrowth}>지난달 대비 +450,000원</Text>
          </View>
        </TouchableOpacity>

        {/* ── 다가오는 세션 ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>다가오는 세션</Text>
            <TouchableOpacity onPress={() => router.push('/(trainer)/schedule' as any)}>
              <Text style={styles.seeAll}>전체보기</Text>
            </TouchableOpacity>
          </View>
          {stats.upcoming.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBox}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={28} color={D.textMuted} />
              </View>
              <Text style={styles.emptyText}>예정된 세션이 없습니다</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {stats.upcoming.map((s, i) => (
                <View key={s.id} style={styles.sessionRow}>
                  <View style={[styles.sessionDot, i === 0 && styles.sessionDotFirst, s.bookingType === 'consultation' && styles.sessionDotConsult]} />
                  <View style={styles.sessionInfo}>
                    <View style={styles.sessionNameRow}>
                      <Text style={styles.sessionMember}>{s.memberName}</Text>
                      {s.bookingType === 'consultation'
                        ? <View style={styles.consultChip}><Text style={styles.consultChipText}>무료상담</Text></View>
                        : <View style={styles.ptChip}><Text style={styles.ptChipText}>PT</Text></View>
                      }
                    </View>
                    <Text style={styles.sessionTime}>
                      {s.date === TODAY ? '오늘' : s.date.slice(5).replace('-', '/')} · {formatTime(s.startTime)}
                    </Text>
                  </View>
                  {i === 0 && (
                    <View style={styles.nextBadge}>
                      <Text style={styles.nextBadgeText}>다음</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── 최근 후기 ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 후기</Text>
            <View style={styles.ratingBadge}>
              <MaterialCommunityIcons name="star" size={12} color={D.amber} />
              <Text style={styles.ratingText}>{trainer?.rating?.toFixed(1) ?? '5.0'}</Text>
            </View>
          </View>
          {recentReviews.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBox}>
                <MaterialCommunityIcons name="star-outline" size={28} color={D.textMuted} />
              </View>
              <Text style={styles.emptyText}>아직 후기가 없습니다</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {recentReviews.map((r) => (
                <View key={r.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewStars}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <MaterialCommunityIcons
                          key={j}
                          name={j < r.rating ? 'star' : 'star-outline'}
                          size={13}
                          color={D.amber}
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewDate}>{r.createdAt.slice(0, 10)}</Text>
                  </View>
                  <Text style={styles.reviewContent} numberOfLines={2}>{r.comment}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 13, color: D.textSec, fontWeight: '500' },
  trainerName: { fontSize: 22, fontWeight: '800', color: D.text, marginTop: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: D.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: D.primary },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flex: 1, minWidth: '45%',
    borderRadius: 18, padding: 16,
    alignItems: 'flex-start', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  statValWhite: { fontSize: 28, fontWeight: '900', color: '#fff' },
  statLabelWhite: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  statVal: { fontSize: 28, fontWeight: '900' },
  statLabelDark: { fontSize: 13, color: D.textSec, fontWeight: '600' },

  card: {
    backgroundColor: D.surface, borderRadius: 20,
    padding: 18, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: D.text },
  seeAll: { fontSize: 13, color: D.primary, fontWeight: '600' },
  earningsAmount: { fontSize: 20, fontWeight: '800', color: D.primary },

  miniChart: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around',
    height: 80,
  },
  miniBarWrap: { flex: 1, alignItems: 'center', gap: 4 },
  miniBarTrack: { height: 60, justifyContent: 'flex-end' },
  miniBar: { width: 16, borderRadius: 4, backgroundColor: D.primaryGlow },
  miniBarActive: { backgroundColor: D.primary },
  miniBarLabel: { fontSize: 10, color: D.textMuted, fontWeight: '500' },
  miniBarLabelActive: { color: D.primary, fontWeight: '700' },

  earningsFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  earningsGrowth: { fontSize: 12, color: D.success, fontWeight: '600' },

  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: D.border },
  sessionDotFirst: { backgroundColor: D.primary },
  sessionDotConsult: { backgroundColor: '#0891B2' },
  sessionInfo: { flex: 1 },
  sessionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sessionMember: { fontSize: 14, fontWeight: '600', color: D.text },
  sessionTime: { fontSize: 12, color: D.textSec, marginTop: 1 },
  consultChip: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  consultChipText: { fontSize: 10, fontWeight: '700', color: '#0891B2' },
  ptChip: {
    backgroundColor: D.primaryGlow,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  ptChipText: { fontSize: 10, fontWeight: '700', color: D.primary },
  nextBadge: {
    backgroundColor: D.primaryGlow,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  nextBadgeText: { fontSize: 11, fontWeight: '700', color: D.primary },

  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: D.amberPale,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  ratingText: { fontSize: 13, fontWeight: '700', color: D.amber },

  reviewItem: { gap: 4 },
  reviewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewDate: { fontSize: 11, color: D.textMuted },
  reviewContent: { fontSize: 13, color: D.textSec, lineHeight: 18 },

  emptyBox:     { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyIconBox: { width: 68, height: 68, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyText:    { fontSize: 13, color: D.textMuted },
});
