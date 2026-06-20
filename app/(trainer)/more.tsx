import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Modal, TouchableWithoutFeedback, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useFollowStore } from '../../store/followStore';
import { useBookingStore } from '../../store/bookingStore';
import { MOCK_TRAINERS } from '../../data/trainers';
import { COLORS } from '../../utils/constants';
import { formatTime } from '../../utils/formatters';
import { monthlyEarnings } from '../../utils/earnings';

const MOCK_MEMBER_LOOKUP: Record<string, { name: string; avatar: string }> = {
  member_001: { name: '홍길동', avatar: 'https://i.pravatar.cc/200?u=member1' },
  member_002: { name: '이수진', avatar: 'https://i.pravatar.cc/200?u=member2' },
  member_003: { name: '박지훈', avatar: 'https://i.pravatar.cc/200?u=member3' },
  member_004: { name: '최민서', avatar: 'https://i.pravatar.cc/200?u=member4' },
  member_005: { name: '정유나', avatar: 'https://i.pravatar.cc/200?u=member5' },
};

function resolveUser(uid: string) {
  if (uid.startsWith('trainer_')) {
    const t = MOCK_TRAINERS.find(t => t.id === uid);
    if (t) return { id: uid, name: t.name, avatar: t.profileImageUrl ?? '', role: 'trainer' as const };
  }
  const m = MOCK_MEMBER_LOOKUP[uid];
  if (m) return { id: uid, name: m.name, avatar: m.avatar, role: 'member' as const };
  return { id: uid, name: '알 수 없는 사용자', avatar: 'https://picsum.photos/seed/unknown/200/200', role: 'member' as const };
}

const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

export default function TrainerMoreScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const { trainer } = useAuthStore();
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);
  const { bookings } = useBookingStore();

  const allLinks = useFollowStore(s => s.links);
  const followerCount = useMemo(
    () => trainer ? allLinks.filter(l => l.followeeId === trainer.id).length : 0,
    [allLinks, trainer]
  );
  const followingCount = useMemo(
    () => trainer ? allLinks.filter(l => l.followerId === trainer.id).length : 0,
    [allLinks, trainer]
  );

  const dashStats = useMemo(() => {
    const myBookings = bookings.filter(b => b.trainerId === (trainer?.id ?? ''));
    const todaySessions = myBookings.flatMap(b =>
      b.sessions.filter(s => s.date === TODAY && s.status === 'scheduled')
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const monthEarnings = monthlyEarnings(myBookings, 1)[0]?.amount ?? 0;
    const activeCount = myBookings.filter(b => b.status === 'active').length;
    return { todaySessions, monthEarnings, activeCount };
  }, [bookings, trainer]);

  const sections = [
    {
      title: '운영',
      items: [
        { icon: '🏋️', label: '헬스장 슬롯 예약', sub: '파트너 헬스장 찾아 시설 슬롯 예약', onPress: () => router.push('/(trainer)/gym-list' as any) },
        { icon: '📋', label: '내 슬롯 예약 현황', sub: '신청한 시설 이용 예약 상태 확인', onPress: () => router.push('/(trainer)/my-slot-bookings' as any) },
        { icon: '🤝', label: '파트너 입점 관리', sub: '헬스장 입점 신청 및 파트너 관리', onPress: () => router.push('/(trainer)/partner-gyms') },
        { icon: '💰', label: '수익 현황', sub: '정산 및 수입 확인', onPress: () => router.push('/(trainer)/earnings') },
        { icon: '🎫', label: '패키지 관리', sub: '다회권 상품 등록 및 관리', onPress: () => router.push('/(trainer)/package-manage') },
      ],
    },
    {
      title: '안전 / 지원',
      items: [
        { icon: '🛡️', label: '안전 및 보안', sub: '신고하기·계정 보호·보안 이력', onPress: () => router.push('/(trainer)/safety' as any) },
        { icon: '💬', label: '고객지원 / AI 챗봇', sub: 'AI 도우미·자주 묻는 질문·1:1 문의', onPress: () => router.push('/(trainer)/support' as any) },
      ],
    },
    {
      title: '계정',
      items: [
        { icon: '💪', label: '내 프로필', sub: '트레이너 프로필 관리', onPress: () => router.push('/(trainer)/profile') },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>

        <View style={styles.profileCard}>
          {trainer?.profileImageUrl ? (
            <Image source={{ uri: trainer.profileImageUrl }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: COLORS.secondary + '18' }]}>
              <Text style={styles.avatarEmoji}>💪</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{trainer?.name ?? '트레이너'}</Text>
            <Text style={styles.profileRole}>FLOWIN 트레이너</Text>
            <View style={styles.followStats}>
              <TouchableOpacity style={styles.followStatItem} onPress={() => setFollowModal('followers')} activeOpacity={0.7}>
                <Text style={[styles.followStatNum, { color: COLORS.secondary }]}>{followerCount}</Text>
                <Text style={styles.followStatLabel}>팔로워</Text>
              </TouchableOpacity>
              <View style={styles.followStatDivider} />
              <TouchableOpacity style={styles.followStatItem} onPress={() => setFollowModal('following')} activeOpacity={0.7}>
                <Text style={[styles.followStatNum, { color: COLORS.secondary }]}>{followingCount}</Text>
                <Text style={styles.followStatLabel}>팔로잉</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── 오늘 현황 대시보드 ── */}
        <View style={styles.dashCard}>
          <View style={styles.dashHeader}>
            <Text style={styles.dashTitle}>오늘의 현황</Text>
            <TouchableOpacity onPress={() => router.push('/(trainer)/schedule')}>
              <Text style={styles.dashMore}>스케줄 보기 ›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dashStatsRow}>
            <TouchableOpacity style={styles.dashStat} onPress={() => router.push('/(trainer)/schedule')}>
              <Text style={styles.dashStatVal}>{dashStats.todaySessions.length}</Text>
              <Text style={styles.dashStatLabel}>오늘 세션</Text>
            </TouchableOpacity>
            <View style={styles.dashStatDivider} />
            <TouchableOpacity style={styles.dashStat} onPress={() => router.push('/(trainer)/earnings')}>
              <Text style={styles.dashStatVal}>
                {dashStats.monthEarnings > 0
                  ? `${Math.round(dashStats.monthEarnings / 10000)}만`
                  : '0만'}
              </Text>
              <Text style={styles.dashStatLabel}>이번달 수익</Text>
            </TouchableOpacity>
            <View style={styles.dashStatDivider} />
            <View style={styles.dashStat}>
              <Text style={styles.dashStatVal}>{dashStats.activeCount}</Text>
              <Text style={styles.dashStatLabel}>활성 회원</Text>
            </View>
          </View>

          <View style={styles.sessionDivider} />

          {dashStats.todaySessions.length === 0 ? (
            <View style={styles.noSessionRow}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={15} color={COLORS.textMuted} />
              <Text style={styles.noSessionText}>오늘 예정된 세션이 없습니다</Text>
            </View>
          ) : (
            <View style={styles.todaySessionList}>
              {dashStats.todaySessions.slice(0, 3).map((s, i) => (
                <View key={s.id} style={styles.todaySessionItem}>
                  <View style={styles.sessionNumBadge}>
                    <Text style={styles.sessionNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.todaySessionTime}>{formatTime(s.startTime)}</Text>
                  <Text style={styles.todaySessionLabel}>세션 예정</Text>
                </View>
              ))}
              {dashStats.todaySessions.length > 3 && (
                <Text style={styles.todaySessionMore}>+ {dashStats.todaySessions.length - 3}개 더</Text>
              )}
            </View>
          )}
        </View>

        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity style={styles.menuRow} onPress={item.onPress} activeOpacity={0.7}>
                    <View style={styles.menuIconWrap}>
                      <Text style={styles.menuIcon}>{item.icon}</Text>
                    </View>
                    <View style={styles.menuText}>
                      <Text style={styles.menuLabel} numberOfLines={1}>{item.label}</Text>
                      <Text style={styles.menuSub} numberOfLines={1}>{item.sub}</Text>
                    </View>
                    <Text style={styles.menuArrow}>›</Text>
                  </TouchableOpacity>
                  {idx < section.items.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* 팔로워 / 팔로잉 모달 */}
      <Modal visible={followModal !== null} transparent animationType="slide" onRequestClose={() => setFollowModal(null)}>
        <TouchableWithoutFeedback onPress={() => setFollowModal(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>
                  {followModal === 'followers' ? `팔로워 ${followerCount}명` : `팔로잉 ${followingCount}명`}
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {(followModal === 'followers'
                    ? allLinks.filter(l => l.followeeId === trainer?.id).map(l => resolveUser(l.followerId))
                    : allLinks.filter(l => l.followerId === trainer?.id).map(l => resolveUser(l.followeeId))
                  ).map(user => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.userRow}
                      activeOpacity={user.role === 'trainer' ? 0.7 : 1}
                      onPress={() => {
                        if (user.role === 'trainer' && user.id !== trainer?.id) {
                          setFollowModal(null);
                          router.push(`/trainer/${user.id}` as any);
                        }
                      }}
                    >
                      <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.name}</Text>
                        <View style={[styles.roleBadge, user.role === 'trainer' && styles.roleBadgeTrainer]}>
                          <Text style={[styles.roleText, user.role === 'trainer' && styles.roleTextTrainer]}>
                            {user.role === 'trainer' ? '트레이너' : '회원'}
                          </Text>
                        </View>
                      </View>
                      {user.role === 'trainer' && user.id !== trainer?.id && (
                        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
                      )}
                    </TouchableOpacity>
                  ))}
                  {((followModal === 'followers' && followerCount === 0) ||
                    (followModal === 'following' && followingCount === 0)) && (
                    <View style={styles.emptyWrap}>
                      <Text style={styles.emptyText}>
                        {followModal === 'followers' ? '아직 팔로워가 없습니다' : '아직 팔로잉이 없습니다'}
                      </Text>
                    </View>
                  )}
                  <View style={{ height: 20 }} />
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16, marginTop: 20, marginBottom: 8,
    borderRadius: 16, padding: 18, gap: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.surfaceElevated },
  avatarEmoji: { fontSize: 26 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  profileRole: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  followStats: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 2 },
  followStatItem: { alignItems: 'center', gap: 1, paddingVertical: 4, paddingHorizontal: 6 },
  followStatNum: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  followStatLabel: { fontSize: 11, color: COLORS.textSecondary },
  followStatDivider: { width: 1, height: 24, backgroundColor: COLORS.border },
  /* Dashboard card */
  dashCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  dashHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  dashTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  dashMore: { fontSize: 12, color: COLORS.secondary, fontWeight: '600' },
  dashStatsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
  },
  dashStat: { flex: 1, alignItems: 'center', gap: 3 },
  dashStatVal: { fontSize: 17, fontWeight: '800', color: COLORS.secondary },
  dashStatLabel: { fontSize: 10, color: COLORS.textSecondary },
  dashStatDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  sessionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginHorizontal: 0 },
  todaySessionList: {
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  todaySessionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  sessionNumBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.secondary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  sessionNumText: { fontSize: 11, fontWeight: '700', color: COLORS.secondary },
  todaySessionTime: { fontSize: 13, fontWeight: '700', color: COLORS.text, flexShrink: 0 },
  todaySessionLabel: { fontSize: 12, color: COLORS.textSecondary, flex: 1, marginLeft: 2 },
  todaySessionMore: { fontSize: 11, color: COLORS.textMuted, marginLeft: 28, marginTop: 2 },
  noSessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  noSessionText: { fontSize: 12, color: COLORS.textMuted },

  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, marginLeft: 4 },
  menuCard: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 18 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  menuSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  menuArrow: { fontSize: 20, color: COLORS.textSecondary },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 64 },

  // 팔로워/팔로잉 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%', paddingBottom: 8,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  modalTitle: {
    fontSize: 17, fontWeight: '700', color: COLORS.text,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
    gap: 12,
  },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.border },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: COLORS.background },
  roleBadgeTrainer: { backgroundColor: 'rgba(91,95,214,0.1)' },
  roleText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  roleTextTrainer: { color: COLORS.primary },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },

});
