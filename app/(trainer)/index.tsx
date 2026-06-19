import React, { useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, SafeAreaView, Image, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { useReviewStore } from '../../store/reviewStore';
import { useNotificationStore } from '../../store/notificationStore';
import { formatPrice, formatTime } from '../../utils/formatters';
import { monthlyEarnings } from '../../utils/earnings';

const QUICK_ACTIONS = [
  { icon: 'qrcode-scan',            label: 'QR입장',   route: '/(trainer)/my-slot-bookings' },
  { icon: 'calendar-month-outline', label: '일정',     route: '/(trainer)/schedule' },
  { icon: 'account-group',          label: '커뮤니티', route: '/(trainer)/community' },
  { icon: 'dumbbell',               label: '헬스장',   route: '/(trainer)/gym-list' },
] as const;

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

export default function TrainerDashboardScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const { trainer } = useAuthStore();
  const { bookings, requestCompletion, confirmBooking } = useBookingStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const allReviews = useReviewStore((s) => s.reviews);
  const trainerId = trainer?.id ?? '';

  // 회원이 결제했지만 아직 트레이너 확정 안 된 예약
  const pendingBookings = bookings.filter((b) => b.trainerId === trainerId && b.status === 'pending');

  const handleConfirmBooking = (b: typeof bookings[number]) => {
    const apply = () => {
      confirmBooking(b.id);
      addNotification({
        type: 'booking_confirmed',
        title: '예약이 확정되었습니다',
        body: `${trainer?.name ?? ''} 트레이너가 ${b.totalSessions}회 PT 예약을 확정했습니다. 첫 세션에서 만나요!`,
        targetRole: 'member',
        userId: b.memberId,
        meta: { bookingId: b.id },
      });
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`${b.memberName} 회원의 ${b.totalSessions}회 PT 예약을 확정할까요?`)) apply();
      return;
    }
    Alert.alert('예약 확정', `${b.memberName} 회원의 ${b.totalSessions}회 PT 예약을 확정할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '확정', onPress: apply },
    ]);
  };

  const stats = useMemo(() => {
    const myBookings = bookings.filter((b) => b.trainerId === trainerId);

    const todayScheduled = myBookings.flatMap((b) =>
      b.sessions.filter((s) => s.date === TODAY && s.status === 'scheduled')
    );
    const totalHours = todayScheduled.length; // 1h per session assumed

    const activeMembers = new Set(
      myBookings.filter((b) => b.status === 'active').map((b) => b.memberId)
    ).size;

    const upcoming = myBookings
      .flatMap((b) =>
        b.sessions
          .filter((s) => s.status === 'scheduled' && s.date >= TODAY)
          .map((s) => ({ ...s, memberId: b.memberId, memberName: b.memberName, bookingType: b.type }))
      )
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, 5);

    // 회원 확인 대기 중인(pending) 세션 — 완료 요청을 보냈으나 아직 확인 안 됨
    const pending = myBookings
      .flatMap((b) =>
        b.sessions
          .filter((s) => s.status === 'pending')
          .map((s) => ({ ...s, memberName: b.memberName }))
      )
      .sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.startTime.localeCompare(b.startTime)));

    // 완료 처리할 세션: 이용중 예약의 오늘까지 예정 세션 수
    const completable = myBookings
      .filter((b) => b.status === 'active')
      .flatMap((b) => b.sessions.filter((s) => s.status === 'scheduled' && s.date <= TODAY))
      .length;

    return { todayCount: todayScheduled.length, totalHours, activeMembers, upcoming, pending, completable };
  }, [bookings, trainerId]);

  const recentReviews = useMemo(() =>
    allReviews
      .filter((r) => r.trainerId === trainerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3),
    [allReviews, trainerId]
  );

  // 다음 두 예약 세션 (반폭 카드 2개로 나란히 표시) + 이후 일정
  const heroSessions = stats.upcoming.slice(0, 2);
  const laterSessions = stats.upcoming.slice(2);

  const whenLabel = (s: { date: string; startTime: string }) =>
    `${s.date === TODAY ? '오늘' : s.date.slice(5).replace('-', '/')} · ${formatTime(s.startTime)}`;

  // 세션 완료 = 1회 차감(대금 정산 근거)이라, 일방 처분이 아닌 '출석 기록'으로 처리하고
  // 회원에게 즉시 알림 + 이의제기 안내를 남겨 오해·분쟁을 예방한다.
  const handleComplete = (s: typeof stats.upcoming[number]) => {
    const booking = bookings.find((b) => b.id === s.bookingId);
    const isConsult = s.bookingType === 'consultation';
    const ptLabel = isConsult
      ? '무료상담'
      : `PT ${(booking ? booking.usedSessions + 1 : 1)}/${booking?.totalSessions ?? 0}회`;

    const dt = new Date(`${s.date}T00:00:00`);
    const wd = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
    const dateLabel = `${dt.getMonth() + 1}월 ${dt.getDate()}일(${wd}) ${formatTime(s.startTime)}`;

    const summary =
      `${s.memberName} 회원 · ${ptLabel}\n${dateLabel}\n\n` +
      `회원에게 완료 확인을 요청합니다. 회원이 확인하면 1회차가 차감되고,\n` +
      `사실과 다르면 회원이 이의를 제기할 수 있습니다.`;

    const done = () => {
      requestCompletion(s.bookingId, s.id);
      addNotification({
        type: 'session_confirm_request',
        title: '세션 완료 확인 요청',
        body:
          `${trainer?.name ?? ''} 트레이너가 ${ptLabel} 세션(${dateLabel}) 완료 확인을 요청했습니다.\n` +
          `예약 화면에서 확인해 주세요. 사실과 다르면 이의를 제기할 수 있습니다.`,
        targetRole: 'member',
        userId: s.memberId,
        meta: { bookingId: s.bookingId, sessionId: s.id },
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`[세션 완료 확인 요청]\n\n${summary}`)) done();
      return;
    }
    Alert.alert('세션 완료 확인 요청', summary, [
      { text: '취소', style: 'cancel' },
      { text: '확인 요청 보내기', onPress: done },
    ]);
  };

  // 실제 예약 데이터에서 최근 6개월 수익 산출
  const earningMonths = useMemo(
    () => monthlyEarnings(bookings.filter((b) => b.trainerId === trainerId), 6),
    [bookings, trainerId]
  );
  const thisMonth = earningMonths[earningMonths.length - 1];
  const lastMonth = earningMonths[earningMonths.length - 2];
  const monthDiff = (thisMonth?.amount ?? 0) - (lastMonth?.amount ?? 0);
  const growthPct = lastMonth && lastMonth.amount > 0
    ? Math.round((monthDiff / lastMonth.amount) * 100)
    : null;
  const maxBar = Math.max(...earningMonths.map((m) => m.amount), 1);

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

        {/* ── 다음 세션 히어로 (다음 두 예약을 반폭 카드로 나란히) ── */}
        {heroSessions.length > 0 ? (
          <View style={styles.heroRow}>
            {heroSessions.map((s, i) => (
              <View key={s.id} style={[styles.heroCard, styles.heroCardHalf]}>
                <View style={styles.heroHead}>
                  <View style={styles.heroBadge}>
                    <MaterialCommunityIcons name="bell-ring-outline" size={13} color="#fff" />
                    <Text style={styles.heroBadgeText}>{i === 0 ? '다음 세션' : '다음 예약'}</Text>
                  </View>
                  <Text style={styles.heroWhen}>{whenLabel(s)}</Text>
                </View>

                <View style={styles.heroBody}>
                  <View style={styles.heroAvatar}>
                    <Text style={styles.heroAvatarText}>{s.memberName[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroMember} numberOfLines={1}>{s.memberName} 회원</Text>
                    {s.bookingType === 'consultation'
                      ? <View style={[styles.heroChip, { backgroundColor: '#E0F2FE' }]}><Text style={[styles.heroChipText, { color: '#0891B2' }]}>무료상담</Text></View>
                      : <View style={[styles.heroChip, { backgroundColor: D.primaryGlow }]}><Text style={[styles.heroChipText, { color: D.primary }]}>PT 세션</Text></View>
                    }
                  </View>
                </View>

                <View style={styles.heroActions}>
                  <TouchableOpacity
                    style={styles.heroBtnGhost}
                    onPress={() => handleComplete(s)}
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons name="check-circle-outline" size={16} color={D.primary} />
                    <Text style={styles.heroBtnGhostText}>완료 확인 요청</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.heroCard}>
            <Text style={styles.heroEmptyTitle}>예정된 세션이 없어요</Text>
            <Text style={styles.heroEmptySub}>일정을 추가해 회원과 세션을 잡아보세요</Text>
          </View>
        )}

        {/* ── 예약 확정 대기 (회원 결제 완료) ── */}
        {pendingBookings.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>예약 확정 대기</Text>
              <View style={styles.pendingCountChip}>
                <Text style={styles.pendingCountText}>{pendingBookings.length}</Text>
              </View>
            </View>
            <View style={{ gap: 10 }}>
              {pendingBookings.map((b) => (
                <View key={b.id} style={styles.confirmRow}>
                  <View style={styles.confirmAvatar}>
                    <Text style={styles.confirmAvatarText}>{b.memberName[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingName}>{b.memberName} 회원</Text>
                    <Text style={styles.pendingWhen}>{b.totalSessions}회 PT · {formatPrice(b.totalAmount)} 결제 완료</Text>
                  </View>
                  <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirmBooking(b)} activeOpacity={0.85}>
                    <MaterialCommunityIcons name="check" size={14} color="#fff" />
                    <Text style={styles.confirmBtnText}>확정</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <Text style={styles.pendingHint}>확정하면 회원에게 알림이 발송됩니다.</Text>
          </View>
        )}

        {/* ── 회원 확인 대기 ── */}
        {stats.pending.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>회원 확인 대기</Text>
              <View style={styles.pendingCountChip}>
                <Text style={styles.pendingCountText}>{stats.pending.length}</Text>
              </View>
            </View>
            <View style={{ gap: 10 }}>
              {stats.pending.map((p) => (
                <View key={p.id} style={styles.pendingRow}>
                  <MaterialCommunityIcons name="clock-alert-outline" size={18} color={D.amber} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingName}>{p.memberName} 회원</Text>
                    <Text style={styles.pendingWhen}>{whenLabel(p)} · 확인 대기 중</Text>
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.pendingHint}>회원이 확인하면 회차가 차감됩니다.</Text>
          </View>
        )}

        {/* ── 빠른 실행 ── */}
        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map((q) => (
            <TouchableOpacity
              key={q.label}
              style={styles.quickItem}
              onPress={() => router.push({ pathname: q.route, params: { from: 'home' } } as any)}
              activeOpacity={0.7}
            >
              <View style={styles.quickIcon}>
                <MaterialCommunityIcons name={q.icon as any} size={22} color={D.primary} />
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 오늘 한눈에 (통합 요약 바) ── */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>오늘 한눈에</Text>
          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={styles.summaryItem}
              onPress={() => router.push({ pathname: '/(trainer)/schedule', params: { from: 'home' } } as any)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="dumbbell" size={17} color={D.primary} />
              <Text style={styles.summaryVal}>{stats.todayCount}</Text>
              <Text style={styles.summaryLabel}>오늘 수업</Text>
            </TouchableOpacity>

            <View style={styles.summaryDivider} />

            <TouchableOpacity
              style={styles.summaryItem}
              onPress={() => router.push({ pathname: '/(trainer)/schedule', params: { from: 'home' } } as any)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="clock-outline" size={17} color={D.textSec} />
              <Text style={styles.summaryVal}>{stats.totalHours}h</Text>
              <Text style={styles.summaryLabel}>총 시간</Text>
            </TouchableOpacity>

            <View style={styles.summaryDivider} />

            <TouchableOpacity
              style={styles.summaryItem}
              onPress={() => router.push({ pathname: '/(trainer)/members', params: { from: 'home' } } as any)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="account-group-outline" size={17} color={D.success} />
              <Text style={styles.summaryVal}>{stats.activeMembers}</Text>
              <Text style={styles.summaryLabel}>회원</Text>
            </TouchableOpacity>

            <View style={styles.summaryDivider} />

            <TouchableOpacity
              style={styles.summaryItem}
              onPress={() => router.push({ pathname: '/(trainer)/manage', params: { from: 'home' } } as any)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="clipboard-check-outline" size={17} color={D.amber} />
              <Text style={[styles.summaryVal, (pendingBookings.length + stats.completable) > 0 && { color: D.amber }]}>
                {pendingBookings.length + stats.completable}
              </Text>
              <Text style={styles.summaryLabel}>처리 대기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 이번 달 수익 미니 차트 ── */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push({ pathname: '/(trainer)/earnings', params: { from: 'home' } } as any)}
          activeOpacity={0.92}
        >
          <View style={[styles.cardHeader, { alignItems: 'flex-start' }]}>
            <View>
              <Text style={styles.cardTitle}>이번 달 수익</Text>
              <Text style={styles.earningsAmount}>{formatPrice(thisMonth?.amount ?? 0)}</Text>
            </View>
            {growthPct !== null && (
              <View style={[styles.growthChip, growthPct < 0 && { backgroundColor: '#FEF2F2' }]}>
                <MaterialCommunityIcons
                  name={growthPct >= 0 ? 'trending-up' : 'trending-down'}
                  size={12}
                  color={growthPct >= 0 ? D.success : D.error}
                />
                <Text style={[styles.growthChipText, growthPct < 0 && { color: D.error }]}>
                  {growthPct >= 0 ? '+' : ''}{growthPct}%
                </Text>
              </View>
            )}
          </View>
          <View style={styles.miniChart}>
            {earningMonths.map((bar, i) => {
              const barH = Math.max((bar.amount / maxBar) * 64, 4);
              const isLast = i === earningMonths.length - 1;
              return (
                <View key={bar.key} style={styles.miniBarWrap}>
                  <View style={styles.miniValueRow}>
                    {isLast && <Text style={styles.miniBarValue}>{Math.round(bar.amount / 10000)}만</Text>}
                  </View>
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
            <MaterialCommunityIcons
              name={monthDiff >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={monthDiff >= 0 ? D.success : D.error}
            />
            <Text style={[styles.earningsGrowth, monthDiff < 0 && { color: D.error }]}>
              지난달 대비 {monthDiff >= 0 ? '+' : '-'}{formatPrice(Math.abs(monthDiff))}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── 이후 일정 ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>이후 일정</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/(trainer)/schedule', params: { from: 'home' } } as any)}>
              <Text style={styles.seeAll}>전체보기</Text>
            </TouchableOpacity>
          </View>
          {laterSessions.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBox}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={28} color={D.textMuted} />
              </View>
              <Text style={styles.emptyText}>다음 세션 이후 일정이 없습니다</Text>
            </View>
          ) : (
            <View style={{ gap: 4 }}>
              {laterSessions.map((s) => {
                const consult = s.bookingType === 'consultation';
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.sessionRow}
                    onPress={() => router.push({ pathname: '/(trainer)/schedule', params: { from: 'home' } } as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sessionAvatar, consult && styles.sessionAvatarConsult]}>
                      <Text style={[styles.sessionAvatarText, consult && { color: '#0891B2' }]}>{s.memberName[0]}</Text>
                    </View>
                    <View style={styles.sessionInfo}>
                      <View style={styles.sessionNameRow}>
                        <Text style={styles.sessionMember}>{s.memberName}</Text>
                        {consult
                          ? <View style={styles.consultChip}><Text style={styles.consultChipText}>무료상담</Text></View>
                          : <View style={styles.ptChip}><Text style={styles.ptChipText}>PT</Text></View>
                        }
                      </View>
                      <Text style={styles.sessionTime}>
                        {s.date === TODAY ? '오늘' : s.date.slice(5).replace('-', '/')} · {formatTime(s.startTime)}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={D.textMuted} />
                  </TouchableOpacity>
                );
              })}
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
            <View style={{ gap: 10 }}>
              {recentReviews.map((r) => (
                <View key={r.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewer}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>{r.memberName?.[0] ?? '?'}</Text>
                      </View>
                      <View style={{ gap: 2 }}>
                        <Text style={styles.reviewName}>{r.memberName}</Text>
                        <View style={styles.reviewStars}>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <MaterialCommunityIcons
                              key={j}
                              name={j < r.rating ? 'star' : 'star-outline'}
                              size={12}
                              color={D.amber}
                            />
                          ))}
                        </View>
                      </View>
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

  heroRow: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  heroCard: {
    backgroundColor: D.surface, borderRadius: 20, padding: 16, gap: 12,
    borderWidth: 1, borderColor: D.primaryGlow,
    shadowColor: D.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 14, elevation: 4,
  },
  heroCardHalf: { flex: 1, minWidth: 0 },
  heroHead: { flexDirection: 'column', alignItems: 'flex-start', gap: 6 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: D.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  heroWhen: { fontSize: 14, fontWeight: '700', color: D.text },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: D.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { fontSize: 20, fontWeight: '800', color: D.primary },
  heroMember: { fontSize: 17, fontWeight: '800', color: D.text, marginBottom: 4 },
  heroChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  heroChipText: { fontSize: 11, fontWeight: '700' },
  heroActions: { flexDirection: 'column', alignSelf: 'stretch', gap: 8 },
  heroBtnGhost: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: D.primaryGlow, paddingVertical: 11, borderRadius: 12,
  },
  heroBtnGhostText: { fontSize: 14, fontWeight: '700', color: D.primary },
  heroEmptyTitle: { fontSize: 16, fontWeight: '800', color: D.text },
  heroEmptySub: { fontSize: 13, color: D.textSec, marginTop: -6 },

  pendingCountChip: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7,
    backgroundColor: D.amberPale, alignItems: 'center', justifyContent: 'center',
  },
  pendingCountText: { fontSize: 12, fontWeight: '800', color: D.amber },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  confirmAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: D.primaryGlow, alignItems: 'center', justifyContent: 'center' },
  confirmAvatarText: { fontSize: 15, fontWeight: '800', color: D.primary },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: D.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  confirmBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  pendingName: { fontSize: 14, fontWeight: '700', color: D.text },
  pendingWhen: { fontSize: 12, color: D.textSec, marginTop: 1 },
  pendingHint: { fontSize: 12, color: D.textMuted, marginTop: 10 },

  quickRow: { flexDirection: 'row', gap: 10 },
  quickItem: { flex: 1, alignItems: 'center', gap: 6 },
  quickIcon: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: D.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  quickLabel: { fontSize: 12, fontWeight: '600', color: D.textSec },

  summaryCard: {
    backgroundColor: D.surface, borderRadius: 20, padding: 18, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: D.textSec },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2 },
  summaryDivider: { width: 1, height: 36, backgroundColor: D.border },
  summaryVal: { fontSize: 20, fontWeight: '900', color: D.text },
  summaryLabel: { fontSize: 11, color: D.textSec, fontWeight: '600' },

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
  earningsAmount: { fontSize: 22, fontWeight: '900', color: D.primary, marginTop: 3 },
  growthChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#ECFDF5', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
  },
  growthChipText: { fontSize: 12, fontWeight: '800', color: D.success },

  miniChart: { flexDirection: 'row', justifyContent: 'space-around', gap: 4 },
  miniBarWrap: { flex: 1, alignItems: 'center', gap: 5 },
  miniValueRow: { height: 15, justifyContent: 'flex-end' },
  miniBarValue: { fontSize: 11, fontWeight: '800', color: D.primary },
  miniBarTrack: { height: 64, justifyContent: 'flex-end' },
  miniBar: { width: 20, borderRadius: 6, backgroundColor: D.primaryGlow },
  miniBarActive: { backgroundColor: D.primary },
  miniBarLabel: { fontSize: 10, color: D.textMuted, fontWeight: '500' },
  miniBarLabelActive: { color: D.primary, fontWeight: '700' },

  earningsFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  earningsGrowth: { fontSize: 12, color: D.success, fontWeight: '600' },

  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 4 },
  sessionAvatar: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: D.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  sessionAvatarConsult: { backgroundColor: '#E0F2FE' },
  sessionAvatarText: { fontSize: 15, fontWeight: '800', color: D.primary },
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

  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: D.amberPale,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  ratingText: { fontSize: 13, fontWeight: '700', color: D.amber },

  reviewItem: { gap: 8, backgroundColor: D.bg, borderRadius: 14, padding: 12 },
  reviewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  reviewer: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  reviewAvatar: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: D.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 14, fontWeight: '800', color: D.primary },
  reviewName: { fontSize: 13, fontWeight: '700', color: D.text },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewDate: { fontSize: 11, color: D.textMuted },
  reviewContent: { fontSize: 13, color: D.text, lineHeight: 19 },

  emptyBox:     { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyIconBox: { width: 68, height: 68, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyText:    { fontSize: 13, color: D.textMuted },
});
