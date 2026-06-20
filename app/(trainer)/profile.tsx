import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useFollowStore } from '../../store/followStore';
import { MOCK_TRAINERS } from '../../data/trainers';
import { formatPrice } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';
import CertificationBadge from '../../components/CertificationBadge';
import StarRating from '../../components/StarRating';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 12 * 2 - 16 * 2 - 4 * 4) / 5;

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

export default function TrainerProfileScreen() {
  const router = useRouter();
  const { trainer, logout } = useAuthStore();
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);

  const allLinks = useFollowStore(s => s.links);
  const followerCount = useMemo(
    () => trainer ? allLinks.filter(l => l.followeeId === trainer.id).length : 0,
    [allLinks, trainer]
  );
  const followingCount = useMemo(
    () => trainer ? allLinks.filter(l => l.followerId === trainer.id).length : 0,
    [allLinks, trainer]
  );


  if (!trainer) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 프로필 헤더 */}
        <View style={styles.header}>
          <Image
            source={{ uri: trainer.profileImageUrl ?? 'https://picsum.photos/seed/default/200/200' }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{trainer.name} 트레이너</Text>
          {trainer.tagline ? (
            <Text style={styles.tagline}>{trainer.tagline}</Text>
          ) : null}
          <StarRating rating={trainer.rating} reviewCount={trainer.reviewCount} size="medium" />
          <View style={styles.specTags}>
            {(trainer.trainingGoals ?? []).map((g) => (
              <View key={g} style={styles.specTag}>
                <Text style={styles.specText}>{g}</Text>
              </View>
            ))}
          </View>
          {/* 팔로워 통계 */}
          <View style={styles.followStats}>
            <TouchableOpacity style={styles.followStatItem} onPress={() => setFollowModal('followers')} activeOpacity={0.7}>
              <Text style={styles.followStatNum}>{followerCount.toLocaleString()}</Text>
              <Text style={styles.followStatLabel}>팔로워</Text>
            </TouchableOpacity>
            <View style={styles.followStatDivider} />
            <TouchableOpacity style={styles.followStatItem} onPress={() => setFollowModal('following')} activeOpacity={0.7}>
              <Text style={styles.followStatNum}>{followingCount.toLocaleString()}</Text>
              <Text style={styles.followStatLabel}>팔로잉</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/(trainer)/edit-profile' as any)}>
            <Text style={styles.editBtnText}>프로필 수정</Text>
          </TouchableOpacity>
        </View>

        {/* 통계 */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{trainer.experienceYears}년</Text>
            <Text style={styles.statLabel}>경력</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{trainer.totalSessions.toLocaleString()}</Text>
            <Text style={styles.statLabel}>총 세션</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatPrice(trainer.sessionPrice)}</Text>
            <Text style={styles.statLabel}>1회 가격</Text>
          </View>
        </View>

        {/* 소개 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>트레이너 소개</Text>
          <Text style={styles.bio}>{trainer.bio}</Text>
          {((trainer.photos && trainer.photos.length > 0) || (trainer.videos && trainer.videos.length > 0)) && (
            <View style={styles.photoGrid}>
              {(trainer.photos ?? []).map((photo) => (
                <TouchableOpacity key={photo.id} onPress={() => setSelectedUri(photo.uri)} activeOpacity={0.85}>
                  <Image source={{ uri: photo.uri }} style={[styles.photoThumb, { width: PHOTO_SIZE, height: PHOTO_SIZE }]} />
                </TouchableOpacity>
              ))}
              {(trainer.videos ?? []).map((video) => (
                <TouchableOpacity key={video.id} style={{ position: 'relative' }} onPress={() => setVideoUri(video.uri)} activeOpacity={0.85}>
                  <Image source={{ uri: video.uri }} style={[styles.photoThumb, { width: PHOTO_SIZE, height: PHOTO_SIZE }]} />
                  <View style={styles.videoOverlay}>
                    <MaterialCommunityIcons name="play-circle" size={22} color="rgba(255,255,255,0.9)" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 자격증 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>자격증 및 인증 ({trainer.certifications.length}개)</Text>
          {trainer.certifications.map((cert) => (
            <CertificationBadge key={cert.id} cert={cert} />
          ))}
        </View>

        {/* 경력 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>경력 사항</Text>
          {trainer.workHistory.map((w) => (
            <View key={w.id} style={styles.workItem}>
              <Text style={styles.workGym}>{w.gymName}</Text>
              <Text style={styles.workPosition}>{w.position}</Text>
              <Text style={styles.workPeriod}>
                {w.startDate.slice(0, 7)} ~ {w.endDate ? w.endDate.slice(0, 7) : '현재'}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            const doLogout = () => { logout(); router.replace('/login'); };
            if (Platform.OS === 'web') {
              if (window.confirm('로그아웃 하시겠습니까?')) doLogout();
            } else {
              Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
                { text: '취소', style: 'cancel' },
                { text: '로그아웃', onPress: doLogout },
              ]);
            }
          }}
        >
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 팔로워 / 팔로잉 모달 */}
      <Modal visible={followModal !== null} transparent animationType="slide" onRequestClose={() => setFollowModal(null)}>
        <TouchableWithoutFeedback onPress={() => setFollowModal(null)}>
          <View style={styles.followModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.followModalSheet}>
                <View style={styles.followHandle} />
                <Text style={styles.followModalTitle}>
                  {followModal === 'followers' ? `팔로워 ${followerCount}명` : `팔로잉 ${followingCount}명`}
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {(followModal === 'followers'
                    ? allLinks.filter(l => l.followeeId === trainer.id).map(l => resolveUser(l.followerId))
                    : allLinks.filter(l => l.followerId === trainer.id).map(l => resolveUser(l.followeeId))
                  ).map(user => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.followUserRow}
                      activeOpacity={user.role === 'trainer' ? 0.7 : 1}
                      onPress={() => {
                        if (user.role === 'trainer' && user.id !== trainer.id) {
                          setFollowModal(null);
                          router.push(`/trainer/${user.id}` as any);
                        }
                      }}
                    >
                      <Image source={{ uri: user.avatar }} style={styles.followUserAvatar} />
                      <View style={styles.followUserInfo}>
                        <Text style={styles.followUserName}>{user.name}</Text>
                        <View style={[styles.followUserRoleBadge, user.role === 'trainer' && styles.followUserRoleBadgeTrainer]}>
                          <Text style={[styles.followUserRoleText, user.role === 'trainer' && styles.followUserRoleTextTrainer]}>
                            {user.role === 'trainer' ? '트레이너' : '회원'}
                          </Text>
                        </View>
                      </View>
                      {user.role === 'trainer' && user.id !== trainer.id && (
                        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
                      )}
                    </TouchableOpacity>
                  ))}
                  {((followModal === 'followers' && followerCount === 0) ||
                    (followModal === 'following' && followingCount === 0)) && (
                    <View style={styles.followEmpty}>
                      <Text style={styles.followEmptyText}>
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

      {/* 사진 확대 모달 */}
      <Modal visible={selectedUri !== null} transparent animationType="fade" onRequestClose={() => setSelectedUri(null)}>
        <TouchableWithoutFeedback onPress={() => setSelectedUri(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View>
                <Image source={{ uri: selectedUri ?? '' }} style={styles.modalImage} resizeMode="contain" />
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedUri(null)}>
                  <Text style={styles.modalCloseTxt}>✕</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 동영상 재생 모달 */}
      <Modal visible={videoUri !== null} transparent animationType="fade" onRequestClose={() => setVideoUri(null)}>
        <TouchableWithoutFeedback onPress={() => setVideoUri(null)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.videoCloseFab} onPress={() => setVideoUri(null)}>
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableWithoutFeedback>
              <View style={{ width: SCREEN_WIDTH - 32 }}>
                {Platform.OS === 'web' && videoUri
                  ? React.createElement('video', {
                      src: videoUri,
                      controls: true,
                      autoPlay: true,
                      style: { width: '100%', borderRadius: 12, backgroundColor: '#000', display: 'block' },
                    })
                  : null}
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
  header: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 16,
    gap: 8,
  },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.border },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  tagline: { fontSize: 13, fontWeight: '600', color: COLORS.secondary, fontStyle: 'italic', textAlign: 'center' },
  editBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.secondary },
  specTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  specTag: {
    backgroundColor: 'rgba(255,107,107,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  specText: { fontSize: 12, color: COLORS.secondary, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  statBox: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.secondary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  section: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  bio: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  photoThumb: { borderRadius: 8, backgroundColor: COLORS.border },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: SCREEN_WIDTH - 32, height: SCREEN_WIDTH - 32, borderRadius: 12 },
  modalCloseBtn: { marginTop: 20, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, alignSelf: 'center' },
  modalCloseTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
  followStats: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 4 },
  followStatItem: { alignItems: 'center', gap: 2 },
  followStatNum: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  followStatLabel: { fontSize: 12, color: COLORS.textSecondary },
  followStatDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  followModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  followModalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%', paddingBottom: 8,
  },
  followHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  followModalTitle: {
    fontSize: 17, fontWeight: '700', color: COLORS.text,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  followUserRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
    gap: 12,
  },
  followUserAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.border },
  followUserInfo: { flex: 1, gap: 4 },
  followUserName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  followUserRoleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: COLORS.background },
  followUserRoleBadgeTrainer: { backgroundColor: 'rgba(91,95,214,0.1)' },
  followUserRoleText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  followUserRoleTextTrainer: { color: COLORS.secondary },
  followEmpty: { alignItems: 'center', paddingVertical: 40 },
  followEmptyText: { fontSize: 14, color: COLORS.textSecondary },
  videoCloseFab: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  workItem: {
    borderLeftWidth: 2.5,
    borderLeftColor: COLORS.secondary,
    paddingLeft: 10,
    paddingBottom: 10,
    gap: 2,
  },
  workGym: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  workPosition: { fontSize: 12, color: COLORS.secondary },
  workPeriod: { fontSize: 11, color: COLORS.textSecondary },
  logoutBtn: {
    margin: 12,
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  logoutText: { color: COLORS.error, fontSize: 15, fontWeight: '500' },
});
