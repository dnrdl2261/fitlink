import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Platform, Alert, Modal, TouchableWithoutFeedback, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useFollowStore } from '../../store/followStore';
import { useBookingStore } from '../../store/bookingStore';
import { MOCK_TRAINERS } from '../../data/trainers';
import { formatTime, formatDate } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';

const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
const THIS_MONTH = TODAY.slice(0, 7);

interface MenuItem {
  icon: string;
  label: string;
  sub?: string;
  onPress: () => void;
}

const MOCK_MEMBER_LOOKUP: Record<string, { name: string; avatar: string }> = {
  member_001: { name: '홍길동', avatar: 'https://picsum.photos/seed/member1/200/200' },
  member_002: { name: '이수진', avatar: 'https://picsum.photos/seed/member2/200/200' },
  member_003: { name: '박지훈', avatar: 'https://picsum.photos/seed/member3/200/200' },
  member_004: { name: '최민서', avatar: 'https://picsum.photos/seed/member4/200/200' },
  member_005: { name: '정유나', avatar: 'https://picsum.photos/seed/member5/200/200' },
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

export default function MemberMoreScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const { member, logout } = useAuthStore();
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);

  const { bookings } = useBookingStore();
  const allLinks = useFollowStore(s => s.links);
  const followerCount = useMemo(
    () => member ? allLinks.filter(l => l.followeeId === member.id).length : 0,
    [allLinks, member]
  );
  const followingCount = useMemo(
    () => member ? allLinks.filter(l => l.followerId === member.id).length : 0,
    [allLinks, member]
  );

  const ptStats = useMemo(() => {
    const myBookings = bookings.filter(b => b.memberId === 'member_001');
    const activeBookings = myBookings.filter(b => b.status === 'active');
    const totalRemaining = activeBookings.reduce((s, b) => s + b.remainingSessions, 0);
    const monthDone = myBookings.flatMap(b =>
      b.sessions.filter(s => s.status === 'completed' && s.date.startsWith(THIS_MONTH))
    ).length;
    const upcoming = myBookings
      .flatMap(b => b.sessions
        .filter(s => s.status === 'scheduled' && s.date >= TODAY)
        .map(s => ({ ...s, trainerName: b.trainerName, bookingId: b.id }))
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .slice(0, 2);
    return { activeCount: activeBookings.length, totalRemaining, monthDone, upcoming };
  }, [bookings]);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('로그아웃 하시겠습니까?')) {
        logout();
        router.replace('/login');
      }
      return;
    }
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => { logout(); router.replace('/login'); } },
    ]);
  };

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: '활동',
      items: [
        { icon: '🏋️', label: '트레이너 찾기', sub: '전문 트레이너 검색 및 프로필 확인', onPress: () => router.push('/(member)/trainer-list' as any) },
        { icon: '📅', label: '내 예약', sub: '예약 내역 확인', onPress: () => router.navigate('/(member)/bookings' as any) },
        { icon: '🎫', label: '내 패키지', sub: '다회권 구매 내역 및 잔여 횟수', onPress: () => router.navigate('/(member)/my-packages' as any) },
      ],
    },
    {
      title: '안전 / 지원',
      items: [
        { icon: '🛡️', label: '안전 및 보안', sub: '신고하기·계정 보호·보안 이력', onPress: () => router.push('/(member)/safety' as any) },
        { icon: '💬', label: '고객지원 / AI 챗봇', sub: 'AI 도우미·자주 묻는 질문·1:1 문의', onPress: () => router.push('/(member)/support' as any) },
      ],
    },
    {
      title: '계정',
      items: [
        { icon: '👤', label: '내 프로필', sub: '프로필 및 이용 현황', onPress: () => router.push('/(member)/profile') },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>

        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          {member?.profileImageUrl ? (
            <Image source={{ uri: member.profileImageUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>🏃</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{member?.name ?? '회원'}</Text>
            <Text style={styles.profileRole}>FLOWIN 회원</Text>
            <View style={styles.followStats}>
              <TouchableOpacity style={styles.followStatItem} onPress={() => setFollowModal('followers')} activeOpacity={0.7}>
                <Text style={styles.followStatNum}>{followerCount}</Text>
                <Text style={styles.followStatLabel}>팔로워</Text>
              </TouchableOpacity>
              <View style={styles.followStatDivider} />
              <TouchableOpacity style={styles.followStatItem} onPress={() => setFollowModal('following')} activeOpacity={0.7}>
                <Text style={styles.followStatNum}>{followingCount}</Text>
                <Text style={styles.followStatLabel}>팔로잉</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 내 PT 현황 카드 */}
        <View style={styles.dashCard}>
          <View style={styles.dashHeader}>
            <MaterialCommunityIcons name="dumbbell" size={16} color={COLORS.primary} />
            <Text style={styles.dashTitle}>내 PT 현황</Text>
            <TouchableOpacity onPress={() => router.navigate('/(member)/bookings' as any)} style={styles.dashLink}>
              <Text style={styles.dashLinkText}>예약 보기 ›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dashStatsRow}>
            <View style={styles.dashStatItem}>
              <Text style={styles.dashStatNum}>{ptStats.activeCount}</Text>
              <Text style={styles.dashStatLabel}>활성 패키지</Text>
            </View>
            <View style={styles.dashStatDivider} />
            <View style={styles.dashStatItem}>
              <Text style={styles.dashStatNum}>{ptStats.totalRemaining}</Text>
              <Text style={styles.dashStatLabel}>남은 세션</Text>
            </View>
            <View style={styles.dashStatDivider} />
            <View style={styles.dashStatItem}>
              <Text style={styles.dashStatNum}>{ptStats.monthDone}</Text>
              <Text style={styles.dashStatLabel}>이번달 운동</Text>
            </View>
          </View>

          <View style={styles.dashDivider} />

          {ptStats.upcoming.length === 0 ? (
            <View style={styles.dashEmpty}>
              <MaterialCommunityIcons name="calendar-blank" size={18} color={COLORS.textMuted} />
              <Text style={styles.dashEmptyText}>예정된 세션이 없습니다</Text>
              <TouchableOpacity onPress={() => router.navigate('/(member)/trainers' as any)}>
                <Text style={styles.dashEmptyLink}>트레이너 찾아보기 ›</Text>
              </TouchableOpacity>
            </View>
          ) : (
            ptStats.upcoming.map((sess) => (
              <TouchableOpacity
                key={sess.id}
                style={styles.dashSession}
                onPress={() => router.push(`/booking/${sess.bookingId}` as any)}
                activeOpacity={0.7}
              >
                <View style={styles.dashSessionBar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dashSessionTime}>
                    {sess.date === TODAY ? '오늘' : formatDate(sess.date).replace('년 ', '.').replace('월 ', '.').replace('일', '')}
                    {' · '}{formatTime(sess.startTime)}
                  </Text>
                  <Text style={styles.dashSessionTrainer}>{sess.trainerName} 트레이너</Text>
                </View>
                <View style={styles.dashSessionBadge}>
                  <Text style={styles.dashSessionBadgeText}>예정</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* 메뉴 섹션 */}
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
                      {item.sub && <Text style={styles.menuSub} numberOfLines={1}>{item.sub}</Text>}
                    </View>
                    <Text style={styles.menuArrow}>›</Text>
                  </TouchableOpacity>
                  {idx < section.items.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* 로그아웃 */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

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
                    ? allLinks.filter(l => l.followeeId === member?.id).map(l => resolveUser(l.followerId))
                    : allLinks.filter(l => l.followerId === member?.id).map(l => resolveUser(l.followeeId))
                  ).map(user => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.userRow}
                      activeOpacity={user.role === 'trainer' ? 0.7 : 1}
                      onPress={() => {
                        if (user.role === 'trainer') {
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
                      {user.role === 'trainer' && (
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
    borderRadius: 14, padding: 18, gap: 14,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 8, elevation: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.surfaceElevated },
  avatarEmoji: { fontSize: 26 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  profileRole: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  followStats: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 2 },
  followStatItem: { alignItems: 'center', gap: 1, paddingVertical: 4, paddingHorizontal: 6 },
  followStatNum: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  followStatLabel: { fontSize: 11, color: COLORS.textSecondary },
  followStatDivider: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: COLORS.border },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuCard: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 18 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  menuSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  menuArrow: { fontSize: 20, color: COLORS.border },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.borderSubtle, marginLeft: 64 },
  logoutBtn: { backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 15, alignItems: 'center' },
  logoutText: { fontSize: 16, fontWeight: '500', color: COLORS.error },

  // PT 현황 대시보드 카드
  dashCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  dashHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    backgroundColor: COLORS.primaryPale,
    borderBottomWidth: 1, borderBottomColor: COLORS.primary + '22',
  },
  dashTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, flex: 1 },
  dashLink: { paddingLeft: 8 },
  dashLinkText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  dashStatsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 14,
  },
  dashStatItem: { flex: 1, alignItems: 'center', gap: 3 },
  dashStatNum: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  dashStatLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  dashStatDivider: { width: 1, height: 32, backgroundColor: COLORS.border },
  dashDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  dashEmpty: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  dashEmptyText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  dashEmptyLink: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  dashSession: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.borderSubtle,
  },
  dashSessionBar: {
    width: 3, height: 36, borderRadius: 2, backgroundColor: COLORS.primary,
  },
  dashSessionTime: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  dashSessionTrainer: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  dashSessionBadge: {
    backgroundColor: COLORS.primaryPale, borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.primary + '33',
  },
  dashSessionBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  // 팔로워/팔로잉 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 8 },
  modalHandle: { width: 40, height: 4, borderRadius: 9999, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.borderSubtle },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.borderSubtle, gap: 12 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, backgroundColor: COLORS.surfaceElevated },
  roleBadgeTrainer: { backgroundColor: COLORS.primaryPale },
  roleText: { fontSize: 11, fontWeight: '500', color: COLORS.textMuted },
  roleTextTrainer: { color: COLORS.text },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});
