import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet, TouchableOpacity,
  SafeAreaView, Modal, Dimensions, TouchableWithoutFeedback,
  Platform, Alert, FlatList, StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { useFollowStore } from '../../store/followStore';
import { useReviewStore } from '../../store/reviewStore';
import { useReportStore } from '../../store/reportStore';
import { MOCK_TRAINERS } from '../../data/trainers';
import { useTrainerStore } from '../../store/trainerStore';
import { useMergedGyms } from '../../hooks/useFilteredGyms';
import { formatPrice, formatRelativeDate } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';
import CertificationBadge from '../../components/CertificationBadge';

const { width: SW, height: SH } = Dimensions.get('window');
const HERO_H = Math.round(SH * 0.52);

const MOCK_MEMBER_LOOKUP: Record<string, { name: string; avatar: string }> = {
  member_001: { name: '홍길동',  avatar: 'https://i.pravatar.cc/200?u=member1' },
  member_002: { name: '이수진',  avatar: 'https://i.pravatar.cc/200?u=member2' },
  member_003: { name: '박지훈',  avatar: 'https://i.pravatar.cc/200?u=member3' },
  member_004: { name: '최민서',  avatar: 'https://i.pravatar.cc/200?u=member4' },
  member_005: { name: '정유나',  avatar: 'https://i.pravatar.cc/200?u=member5' },
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

const SCHEDULE_KEYS = ['새벽수업', '심야수업', '주말수업', '유동적스케줄', '예약제운영'] as const;
const SCHEDULE_LABEL: Record<string, string> = {
  새벽수업: '새벽 수업 가능',
  심야수업: '심야 수업 가능',
  주말수업: '주말·공휴일 가능',
  유동적스케줄: '유동적 스케줄',
  예약제운영: '예약제 운영',
};

export default function TrainerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDone, setReportDone] = useState(false);
  const [blacklistConfirm, setBlacklistConfirm] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [reviewSort, setReviewSort] = useState<'default' | 'rating'>('default');
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllCerts, setShowAllCerts] = useState(false);
  const [showAllWork, setShowAllWork] = useState(false);
  const [showAllGyms, setShowAllGyms] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);

  // 사진 슬라이드 뷰어
  const [photoViewerIdx, setPhotoViewerIdx] = useState<number | null>(null);
  const [pvCurrentIdx, setPvCurrentIdx] = useState(0);
  const pvScrollRef = useRef<ScrollView>(null);

  const { role, member, trainer: myTrainer, gymAdmin } = useAuthStore();
  const storeTrainers = useTrainerStore((s) => s.trainers);
  const trainerFromMock = storeTrainers.find((t) => t.id === id);
  const trainer = (myTrainer?.id === id) ? myTrainer : trainerFromMock;
  const allReviews = useReviewStore((s) => s.reviews);
  const realReviews = allReviews.filter((r) => r.trainerId === (id ?? ''));
  const { getOrCreate } = useChatStore();
  const { addReport } = useReportStore();

  const allLinks = useFollowStore(s => s.links);
  const { follow, unfollow } = useFollowStore();
  const myId = role === 'member' ? (member?.id ?? '') : role === 'trainer' ? (myTrainer?.id ?? '') : '';
  const isFollowing = useMemo(
    () => !!myId && !!trainer && allLinks.some(l => l.followerId === myId && l.followeeId === trainer.id),
    [allLinks, myId, trainer]
  );
  const followerCount = useMemo(
    () => trainer ? allLinks.filter(l => l.followeeId === trainer.id).length : 0,
    [allLinks, trainer]
  );
  const followingCount = useMemo(
    () => trainer ? allLinks.filter(l => l.followerId === trainer.id).length : 0,
    [allLinks, trainer]
  );
  const canFollow = (role === 'member' || role === 'trainer') && !!trainer && myId !== trainer.id;

  useGymSlotStore(s => s.blacklists);
  const { blacklistTrainer, unblacklistTrainer, isBlacklisted } = useGymSlotStore();
  const GYM_ID = gymAdmin?.gymId ?? '';
  const blacklisted = trainer ? isBlacklisted(GYM_ID, trainer.id) : false;

  const allPhotos = trainer?.photos ?? [];
  const mergedGyms = useMergedGyms();

  useEffect(() => {
    if (photoViewerIdx === null) return;
    setPvCurrentIdx(photoViewerIdx);
    const timer = setTimeout(() => {
      pvScrollRef.current?.scrollTo({ x: photoViewerIdx * SW, animated: false });
    }, 80);
    return () => clearTimeout(timer);
  }, [photoViewerIdx]);

  const handleMemberChat = () => {
    if (!member || !trainer) return;
    const convId = getOrCreate(
      'member-trainer',
      { id: member.id, name: member.name, role: 'member' },
      { id: trainer.id, name: trainer.name, role: 'trainer' }
    );
    router.push(`/chat/${convId}` as any);
  };

  const handleGymChat = () => {
    if (!gymAdmin || !trainer) return;
    const convId = getOrCreate(
      'trainer-gym',
      { id: trainer.id, name: trainer.name, role: 'trainer' },
      { id: gymAdmin.id, name: gymAdmin.name, role: 'gym_admin' }
    );
    router.push(`/chat/${convId}` as any);
  };

  if (!trainer) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>트레이너 정보를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const partnerGyms = mergedGyms.filter((g) => trainer.partnerGymIds.includes(g.id));
  const primaryGym = partnerGyms[0] ?? null;

  const allNormalized = [
    ...[...realReviews].reverse().map(r => ({
      id: r.id, name: r.memberName, avatar: r.memberAvatar,
      rating: r.rating, date: r.createdAt, comment: r.comment, media: r.media,
    })),
    ...trainer.reviews.map((r: any) => ({
      id: r.id as string, name: r.reviewerName as string, avatar: r.reviewerImage as string | undefined,
      rating: r.rating as number, date: r.createdAt as string, comment: r.comment as string,
      media: [] as typeof realReviews[0]['media'],
    })),
  ];
  const sortedReviews = reviewSort === 'rating'
    ? [...allNormalized].sort((a, b) => b.rating - a.rating)
    : allNormalized;
  const visibleReviews = showAllReviews ? sortedReviews : sortedReviews.slice(0, 3);
  const visibleCerts = showAllCerts ? trainer.certifications : trainer.certifications.slice(0, 3);
  const visibleWork = showAllWork ? trainer.workHistory : trainer.workHistory.slice(0, 2);
  const visibleGyms = showAllGyms ? partnerGyms : partnerGyms.slice(0, 3);

  const scheduleItems = SCHEDULE_KEYS.filter(k => trainer.conveniences?.includes(k as any));
  const trialPrice = Math.round(trainer.sessionPrice * 0.4 / 1000) * 1000;

  const allTags = [
    ...(trainer.specializations ?? []),
    ...(trainer.exerciseTypes ?? []).slice(0, 3),
    ...(trainer.trainingGoals ?? []).slice(0, 3),
  ];

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: role === 'member' || role === 'gym_admin' ? 90 : 40 }}>

        {/* ── 히어로 이미지 ── */}
        <View style={st.hero}>
          <Image
            source={{ uri: trainer.profileImageUrl ?? `https://picsum.photos/seed/${trainer.id}/600/800` }}
            style={st.heroImg}
            resizeMode="cover"
          />

          {/* 그라데이션 오버레이 레이어 (상단 투명 → 하단 불투명) */}
          <View style={st.heroGrad1} />
          <View style={st.heroGrad2} />
          <View style={st.heroGrad3} />

          {/* 상단 버튼 */}
          <SafeAreaView style={st.heroTop}>
            <TouchableOpacity style={st.heroIconBtn} onPress={() => router.back()}>
              <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {role === 'member' && (
                <TouchableOpacity style={st.heroIconBtn} onPress={() => setReportModal(true)}>
                  <MaterialCommunityIcons name="flag-outline" size={20} color="#fff" />
                </TouchableOpacity>
              )}
              {canFollow && (
                <TouchableOpacity
                  style={st.heroIconBtn}
                  onPress={() => isFollowing ? unfollow(myId, trainer.id) : follow(myId, trainer.id)}
                >
                  <MaterialCommunityIcons
                    name={isFollowing ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isFollowing ? '#FF4D6D' : '#fff'}
                  />
                </TouchableOpacity>
              )}
            </View>
          </SafeAreaView>

          {/* 하단 정보 오버레이 (전체 폭) */}
          <View style={st.heroOverlay}>
            {/* 전문분야 칩들 */}
            <View style={st.heroSpecRow}>
              {(trainer.trainingGoals ?? []).slice(0, 3).map(g => (
                <View key={g} style={st.heroSpecChip}>
                  <Text style={st.heroSpecText}>{g}</Text>
                </View>
              ))}
            </View>
            <Text style={st.heroOverlayName}>{trainer.name} 트레이너</Text>
            <View style={st.heroOverlayMeta2}>
              {(trainer.address?.city || trainer.address?.district) && (
                <View style={st.heroOverlayRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={st.heroOverlayMetaText}>
                    {[trainer.address?.city, trainer.address?.district].filter(Boolean).join(' ')}
                  </Text>
                </View>
              )}
              <View style={st.heroOverlayRow}>
                <MaterialCommunityIcons name="star" size={12} color="#FBBF24" />
                <Text style={st.heroOverlayMetaText}>{trainer.rating.toFixed(1)} ({allNormalized.length})</Text>
              </View>
              <Text style={st.heroOverlayMetaText}>경력 {trainer.experienceYears}년</Text>
            </View>
          </View>
        </View>

        {/* ── 기본 정보 ── */}
        <View style={st.infoBlock}>
          {trainer.tagline ? <Text style={st.tagline}>{trainer.tagline}</Text> : null}
          {primaryGym && (
            <View style={st.gymRow}>
              <MaterialCommunityIcons name="dumbbell" size={13} color="#999" />
              <Text style={st.gymText}>{primaryGym.name}</Text>
            </View>
          )}

          {/* 팔로워 통계 */}
          <View style={st.statsRow}>
            <TouchableOpacity style={st.statItem} onPress={() => setFollowModal('followers')}>
              <Text style={st.statNum}>{followerCount.toLocaleString()}</Text>
              <Text style={st.statLabel}>팔로워</Text>
            </TouchableOpacity>
            <View style={st.statDivider} />
            <TouchableOpacity style={st.statItem} onPress={() => setFollowModal('following')}>
              <Text style={st.statNum}>{followingCount.toLocaleString()}</Text>
              <Text style={st.statLabel}>팔로잉</Text>
            </TouchableOpacity>
            <View style={st.statDivider} />
            <View style={st.statItem}>
              <Text style={st.statNum}>{trainer.totalSessions.toLocaleString()}</Text>
              <Text style={st.statLabel}>총 세션</Text>
            </View>
          </View>

          {/* 액션 버튼 */}
          <View style={st.actionRow}>
            {canFollow && (
              <TouchableOpacity
                style={[st.actionBtn, isFollowing ? st.actionBtnOff : st.actionBtnOn]}
                onPress={() => isFollowing ? unfollow(myId, trainer.id) : follow(myId, trainer.id)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={isFollowing ? 'account-check' : 'account-plus-outline'}
                  size={16}
                  color={isFollowing ? '#888' : '#fff'}
                />
                <Text style={[st.actionBtnText, isFollowing && st.actionBtnTextOff]}>
                  {isFollowing ? '팔로잉' : '팔로우'}
                </Text>
              </TouchableOpacity>
            )}
            {role === 'member' && (
              <TouchableOpacity style={st.chatBtn} onPress={handleMemberChat} activeOpacity={0.8}>
                <MaterialCommunityIcons name="message-outline" size={16} color={COLORS.primary} />
                <Text style={st.chatBtnText}>채팅</Text>
              </TouchableOpacity>
            )}
            {role === 'gym_admin' && (
              <TouchableOpacity style={st.chatBtn} onPress={handleGymChat} activeOpacity={0.8}>
                <MaterialCommunityIcons name="message-outline" size={16} color={COLORS.primary} />
                <Text style={st.chatBtnText}>채팅</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={st.sectionDivider} />

        {/* ── 전문 분야 태그 ── */}
        {allTags.length > 0 && (
          <>
            <View style={st.section}>
              <Text style={st.sectionTitle}>전문 분야</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tagScroll}>
                {(trainer.trainingGoals ?? []).map(g => (
                  <View key={g} style={st.tagPrimary}>
                    <Text style={st.tagPrimaryText}>{g}</Text>
                  </View>
                ))}
                {(trainer.exerciseTypes ?? []).slice(0, 4).map(e => (
                  <View key={e} style={st.tagSecondary}>
                    <Text style={st.tagSecondaryText}>{e}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
            <View style={st.sectionDivider} />
          </>
        )}

        {/* ── 트레이너 소개 ── */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>트레이너 소개</Text>
          <Text style={st.bioText}>
            {showFullBio || trainer.bio.length <= 100
              ? trainer.bio
              : trainer.bio.slice(0, 100) + '...'}
          </Text>
          {trainer.bio.length > 100 && (
            <TouchableOpacity style={st.moreBtn} onPress={() => setShowFullBio(!showFullBio)}>
              <Text style={st.moreBtnText}>{showFullBio ? '접기' : '더보기'}</Text>
              <MaterialCommunityIcons name={showFullBio ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── 사진 갤러리 ── */}
        {allPhotos.length > 0 && (
          <>
            <View style={st.sectionDivider} />
            <View style={st.section}>
              <Text style={st.sectionTitle}>사진</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {allPhotos.map((photo, idx) => (
                  <TouchableOpacity key={photo.id} onPress={() => setPhotoViewerIdx(idx)} activeOpacity={0.88}>
                    <Image source={{ uri: photo.uri }} style={st.galleryThumb} />
                  </TouchableOpacity>
                ))}
                {(trainer.videos ?? []).map((video) => (
                  <TouchableOpacity key={video.id} onPress={() => setVideoUri(video.uri)} activeOpacity={0.88}>
                    <View style={{ position: 'relative' }}>
                      <Image source={{ uri: video.uri }} style={st.galleryThumb} />
                      <View style={st.videoOverlay}>
                        <MaterialCommunityIcons name="play-circle" size={28} color="rgba(255,255,255,0.9)" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        <View style={st.sectionDivider} />

        {/* ── 1회 체험 가격 ── */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>수업 가격</Text>
          <View style={st.priceCard}>
            <View style={st.priceCardLeft}>
              <Text style={st.priceCardLabel}>정규 세션</Text>
              <Text style={st.priceCardMain}>{formatPrice(trainer.sessionPrice)}</Text>
              <Text style={st.priceCardSub}>회당</Text>
            </View>
            <View style={st.priceCardDivider} />
            <View style={st.priceCardRight}>
              <View style={st.trialBadge}>
                <Text style={st.trialBadgeText}>첫 체험</Text>
              </View>
              <Text style={st.triceCardTrial}>{formatPrice(trialPrice)}</Text>
              <Text style={st.priceCardSub}>정규의 40%</Text>
            </View>
          </View>
          <Text style={st.priceNote}>+ 헬스장 시설 이용료 별도 (1만~1.8만원)</Text>
        </View>

        <View style={st.sectionDivider} />

        {/* ── 자격증 ── */}
        {trainer.certifications.length > 0 && (
          <>
            <View style={st.section}>
              <Text style={st.sectionTitle}>자격증 및 인증</Text>
              {visibleCerts.map((cert) => (
                <CertificationBadge key={cert.id} cert={cert} />
              ))}
              {trainer.certifications.length > 3 && (
                <TouchableOpacity style={st.moreBtn} onPress={() => setShowAllCerts(!showAllCerts)}>
                  <Text style={st.moreBtnText}>
                    {showAllCerts ? '접기' : `더보기 (${trainer.certifications.length - 3}개 더)`}
                  </Text>
                  <MaterialCommunityIcons name={showAllCerts ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={st.sectionDivider} />
          </>
        )}

        {/* ── 경력 ── */}
        {trainer.workHistory.length > 0 && (
          <>
            <View style={st.section}>
              <Text style={st.sectionTitle}>경력 사항</Text>
              {visibleWork.map((w, idx) => (
                <View key={w.id} style={st.workItem}>
                  <View style={st.timelineCol}>
                    <View style={st.timelineDot} />
                    {idx < visibleWork.length - 1 && <View style={st.timelineLine} />}
                  </View>
                  <View style={st.workContent}>
                    <Text style={st.workGym}>{w.gymName}</Text>
                    <Text style={st.workPosition}>{w.position}</Text>
                    <Text style={st.workPeriod}>
                      {w.startDate.slice(0, 7)} ~ {w.endDate ? w.endDate.slice(0, 7) : '현재'}
                    </Text>
                    {w.description ? <Text style={st.workDesc}>{w.description}</Text> : null}
                  </View>
                </View>
              ))}
              {trainer.workHistory.length > 2 && (
                <TouchableOpacity style={st.moreBtn} onPress={() => setShowAllWork(!showAllWork)}>
                  <Text style={st.moreBtnText}>
                    {showAllWork ? '접기' : `더보기 (${trainer.workHistory.length - 2}개 더)`}
                  </Text>
                  <MaterialCommunityIcons name={showAllWork ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={st.sectionDivider} />
          </>
        )}

        {/* ── 수업 일정 ── */}
        {scheduleItems.length > 0 && (
          <>
            <View style={st.section}>
              <Text style={st.sectionTitle}>수업 일정</Text>
              <View style={st.scheduleGrid}>
                {scheduleItems.map(k => (
                  <View key={k} style={st.scheduleItem}>
                    <MaterialCommunityIcons name="check-circle-outline" size={16} color={COLORS.primary} />
                    <Text style={st.scheduleText}>{SCHEDULE_LABEL[k]}</Text>
                  </View>
                ))}
                {(trainer.conveniences ?? [])
                  .filter(c => !SCHEDULE_KEYS.includes(c as any))
                  .slice(0, 4)
                  .map(c => (
                    <View key={c} style={st.scheduleItem}>
                      <MaterialCommunityIcons name="check-circle-outline" size={16} color="#bbb" />
                      <Text style={st.scheduleTextMuted}>{c}</Text>
                    </View>
                  ))}
              </View>
            </View>
            <View style={st.sectionDivider} />
          </>
        )}

        {/* ── 활동 헬스장 ── */}
        {partnerGyms.length > 0 && (
          <>
            <View style={st.section}>
              <Text style={st.sectionTitle}>활동 헬스장</Text>
              {visibleGyms.map((gym) => (
                <TouchableOpacity key={gym.id} style={st.gymItem} onPress={() => router.push(`/gym/${gym.id}`)}>
                  <View style={st.gymIconWrap}>
                    <MaterialCommunityIcons name="dumbbell" size={18} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.gymName}>{gym.name}</Text>
                    <Text style={st.gymAddr}>{gym.address}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#ccc" />
                </TouchableOpacity>
              ))}
              {partnerGyms.length > 3 && (
                <TouchableOpacity style={st.moreBtn} onPress={() => setShowAllGyms(!showAllGyms)}>
                  <Text style={st.moreBtnText}>
                    {showAllGyms ? '접기' : `더보기 (${partnerGyms.length - 3}개 더)`}
                  </Text>
                  <MaterialCommunityIcons name={showAllGyms ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={st.sectionDivider} />
          </>
        )}


        {/* ── 리뷰 ── */}
        <View style={st.section}>
          <View style={st.reviewHeader}>
            <Text style={st.sectionTitle}>수강생 후기 ({allNormalized.length})</Text>
            <View style={st.sortRow}>
              {(['default', 'rating'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[st.sortChip, reviewSort === s && st.sortChipOn]}
                  onPress={() => { setReviewSort(s); setShowAllReviews(false); }}
                >
                  <Text style={[st.sortChipText, reviewSort === s && st.sortChipTextOn]}>
                    {s === 'default' ? '추천순' : '평점순'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {visibleReviews.map((rev) => (
            <View key={rev.id} style={st.reviewCard}>
              <View style={st.reviewTop}>
                {rev.avatar ? (
                  <Image source={{ uri: rev.avatar }} style={st.reviewAvatar} />
                ) : (
                  <View style={[st.reviewAvatar, st.reviewAvatarEmpty]}>
                    <MaterialCommunityIcons name="account" size={18} color="#ccc" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={st.reviewerName}>{rev.name}</Text>
                    <Text style={st.reviewStars}>{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</Text>
                  </View>
                  <Text style={st.reviewDate}>{formatRelativeDate(rev.date)}</Text>
                </View>
              </View>
              <Text style={st.reviewComment}>{rev.comment}</Text>
              {rev.media.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 8 }}>
                  {rev.media.map((m) => (
                    <Image key={m.id} source={{ uri: m.uri }} style={st.reviewMedia} />
                  ))}
                </ScrollView>
              )}
            </View>
          ))}

          {allNormalized.length === 0 && (
            <View style={st.emptyBox}>
              <Text style={st.emptyText}>아직 후기가 없습니다</Text>
            </View>
          )}

          {allNormalized.length > 3 && (
            <TouchableOpacity style={st.moreBtn} onPress={() => setShowAllReviews(!showAllReviews)}>
              <Text style={st.moreBtnText}>
                {showAllReviews ? '접기' : `더보기 (${allNormalized.length - 3}개 더)`}
              </Text>
              <MaterialCommunityIcons name={showAllReviews ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* 헬스장 관리자 블랙리스트 */}
        {role === 'gym_admin' && (
          <>
            <View style={st.sectionDivider} />
            <View style={st.section}>
              {blacklisted && (
                <View style={st.blackBanner}>
                  <Text style={st.blackBannerText}>🚫 현재 블랙리스트에 등록되어 있습니다</Text>
                </View>
              )}
              <TouchableOpacity
                style={[st.blackBtn, blacklisted ? st.blackBtnActive : st.blackBtnInactive]}
                onPress={() => blacklisted ? setRemoveConfirm(true) : setBlacklistConfirm(true)}
              >
                <Text style={[st.blackBtnText, blacklisted ? st.blackBtnTextActive : st.blackBtnTextInactive]}>
                  {blacklisted ? '블랙리스트 해제' : '블랙리스트 등록'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

      </ScrollView>

      {/* ── 하단 고정 바 (회원용) ── */}
      {role === 'member' && (
        <View style={st.bottomBar}>
          <View style={st.bottomPriceWrap}>
            <Text style={st.bottomPrice}>{formatPrice(trainer.sessionPrice)}</Text>
            <Text style={st.bottomPriceSub}>/회</Text>
          </View>
          <View style={st.bottomBtnRow}>
            <TouchableOpacity
              style={st.consultBtn}
              onPress={() => router.push({ pathname: '/booking/consultation', params: { trainerId: trainer.id } } as any)}
            >
              <Text style={st.consultBtnText}>무료상담</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={st.bottomBtn}
              onPress={() => router.push({ pathname: '/booking/new', params: { trainerId: trainer.id } } as any)}
            >
              <Text style={st.bottomBtnText}>PT 등록하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 사진 슬라이드 뷰어 */}
      <Modal visible={photoViewerIdx !== null} transparent animationType="fade" onRequestClose={() => setPhotoViewerIdx(null)}>
        <View style={st.pvOverlay}>
          <TouchableOpacity style={st.pvCloseBtn} onPress={() => setPhotoViewerIdx(null)}>
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {allPhotos.length > 1 && (
            <View style={st.pvCounter}>
              <Text style={st.pvCounterText}>{pvCurrentIdx + 1} / {allPhotos.length}</Text>
            </View>
          )}
          <ScrollView
            ref={pvScrollRef}
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            scrollEventThrottle={50}
            onScroll={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
              if (idx !== pvCurrentIdx) setPvCurrentIdx(idx);
            }}
            onMomentumScrollEnd={e => {
              setPvCurrentIdx(Math.round(e.nativeEvent.contentOffset.x / SW));
            }}
          >
            {allPhotos.map((photo, idx) => (
              <View key={idx} style={{ width: SW, justifyContent: 'center', alignItems: 'center' }}>
                <Image source={{ uri: photo.uri }} style={{ width: SW, height: SW * 1.3 }} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
          {allPhotos.length > 1 && (
            <View style={st.pvDots}>
              {allPhotos.map((_, i) => (
                <View key={i} style={[st.pvDot, i === pvCurrentIdx && st.pvDotActive]} />
              ))}
            </View>
          )}
        </View>
      </Modal>

      {/* 동영상 재생 */}
      <Modal visible={videoUri !== null} transparent animationType="fade" onRequestClose={() => setVideoUri(null)}>
        <TouchableWithoutFeedback onPress={() => setVideoUri(null)}>
          <View style={st.vidOverlay}>
            <TouchableOpacity style={st.vidCloseBtn} onPress={() => setVideoUri(null)}>
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableWithoutFeedback>
              <View style={{ width: SW - 32 }}>
                {Platform.OS === 'web' && videoUri
                  ? React.createElement('video', {
                      src: videoUri, controls: true, autoPlay: true,
                      style: { width: '100%', borderRadius: 12, backgroundColor: '#000', display: 'block' },
                    })
                  : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 블랙리스트 등록 확인 */}
      <Modal visible={blacklistConfirm} transparent animationType="fade" onRequestClose={() => setBlacklistConfirm(false)}>
        <View style={st.confirmOverlay}>
          <View style={st.confirmBox}>
            <Text style={st.confirmTitle}>블랙리스트 등록</Text>
            <Text style={st.confirmMsg}>{trainer.name} 트레이너를{'\n'}블랙리스트에 등록하시겠습니까?</Text>
            <View style={st.confirmBtns}>
              <TouchableOpacity style={st.confirmCancel} onPress={() => setBlacklistConfirm(false)}>
                <Text style={st.confirmCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.confirmAction, { backgroundColor: COLORS.error }]}
                onPress={() => { blacklistTrainer(GYM_ID, trainer.id, trainer.name); setBlacklistConfirm(false); }}
              >
                <Text style={st.confirmActionText}>등록하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 블랙리스트 해제 확인 */}
      <Modal visible={removeConfirm} transparent animationType="fade" onRequestClose={() => setRemoveConfirm(false)}>
        <View style={st.confirmOverlay}>
          <View style={st.confirmBox}>
            <Text style={st.confirmTitle}>블랙리스트 해제</Text>
            <Text style={st.confirmMsg}>{trainer.name} 트레이너를{'\n'}블랙리스트에서 해제하시겠습니까?</Text>
            <View style={st.confirmBtns}>
              <TouchableOpacity style={st.confirmCancel} onPress={() => setRemoveConfirm(false)}>
                <Text style={st.confirmCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.confirmAction, { backgroundColor: COLORS.primary }]}
                onPress={() => { unblacklistTrainer(GYM_ID, trainer.id); setRemoveConfirm(false); }}
              >
                <Text style={st.confirmActionText}>해제하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 팔로워 / 팔로잉 모달 */}
      <Modal visible={followModal !== null} transparent animationType="slide" onRequestClose={() => setFollowModal(null)}>
        <TouchableWithoutFeedback onPress={() => setFollowModal(null)}>
          <View style={st.followOverlay}>
            <TouchableWithoutFeedback>
              <View style={st.followSheet}>
                <View style={st.followHandle} />
                <Text style={st.followTitle}>
                  {followModal === 'followers' ? `팔로워 ${followerCount}명` : `팔로잉 ${followingCount}명`}
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {(followModal === 'followers'
                    ? allLinks.filter(l => l.followeeId === trainer.id).map(l => resolveUser(l.followerId))
                    : allLinks.filter(l => l.followerId === trainer.id).map(l => resolveUser(l.followeeId))
                  ).map(user => (
                    <TouchableOpacity
                      key={user.id}
                      style={st.followUserRow}
                      activeOpacity={user.role === 'trainer' ? 0.7 : 1}
                      onPress={() => {
                        if (user.role === 'trainer' && user.id !== trainer.id) {
                          setFollowModal(null);
                          router.push(`/trainer/${user.id}` as any);
                        }
                      }}
                    >
                      <Image source={{ uri: user.avatar }} style={st.followUserAvatar} />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={st.followUserName}>{user.name}</Text>
                        <View style={[st.followRoleBadge, user.role === 'trainer' && st.followRoleBadgeTrainer]}>
                          <Text style={[st.followRoleText, user.role === 'trainer' && st.followRoleTextTrainer]}>
                            {user.role === 'trainer' ? '트레이너' : '회원'}
                          </Text>
                        </View>
                      </View>
                      {user.role === 'trainer' && user.id !== trainer.id && (
                        <MaterialCommunityIcons name="chevron-right" size={18} color="#ccc" />
                      )}
                    </TouchableOpacity>
                  ))}
                  {((followModal === 'followers' && followerCount === 0) || (followModal === 'following' && followingCount === 0)) && (
                    <View style={st.followEmpty}>
                      <Text style={st.followEmptyText}>
                        {followModal === 'followers' ? '아직 팔로워가 없습니다' : '아직 팔로잉이 없습니다'}
                      </Text>
                    </View>
                  )}
                  <View style={{ height: 24 }} />
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 신고 모달 */}
      <Modal visible={reportModal} transparent animationType="slide" onRequestClose={() => setReportModal(false)}>
        <TouchableWithoutFeedback onPress={() => setReportModal(false)}>
          <View style={st.followOverlay}>
            <TouchableWithoutFeedback>
              <View style={[st.followSheet, { maxHeight: '65%' }]}>
                <View style={st.followHandle} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <MaterialCommunityIcons name="flag-outline" size={20} color={COLORS.error} />
                  <View style={{ flex: 1 }}>
                    <Text style={[st.followTitle, { paddingHorizontal: 0, paddingVertical: 0, borderBottomWidth: 0 }]}>{trainer.name} 트레이너 신고</Text>
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>허위 신고 시 이용이 제한될 수 있습니다</Text>
                  </View>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {[
                    '부적절한 언행 또는 성희롱',
                    '허위 자격증·경력 기재',
                    '약속 불이행 (무단 노쇼)',
                    '과도한 광고·스팸',
                    '사기 또는 금전 갈취',
                    '기타',
                  ].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[st.followUserRow, reportReason === r && { backgroundColor: COLORS.primaryPale }]}
                      onPress={() => setReportReason(r)}
                      activeOpacity={0.7}
                    >
                      <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        borderWidth: 2, borderColor: reportReason === r ? COLORS.primary : COLORS.border,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {reportReason === r && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary }} />}
                      </View>
                      <Text style={[{ fontSize: 14, color: COLORS.text, flex: 1 }, reportReason === r && { fontWeight: '600', color: COLORS.primary }]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                  <View style={{ padding: 16, paddingTop: 8 }}>
                    <TouchableOpacity
                      style={[{
                        paddingVertical: 14, borderRadius: 14, alignItems: 'center',
                        backgroundColor: reportReason ? COLORS.error : '#F1F5F9',
                      }]}
                      disabled={!reportReason}
                      onPress={() => {
                        addReport({
                          reporterId: member?.id ?? '',
                          reporterName: member?.name ?? '회원',
                          targetType: 'trainer',
                          targetId: trainer.id,
                          targetName: trainer.name,
                          reason: reportReason,
                        });
                        setReportModal(false);
                        setReportReason('');
                        setReportDone(true);
                      }}
                    >
                      <Text style={[{ fontSize: 15, fontWeight: '700' }, { color: reportReason ? '#fff' : COLORS.textMuted }]}>신고 접수</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 신고 접수 완료 확인 */}
      <Modal visible={reportDone} transparent animationType="fade" onRequestClose={() => setReportDone(false)}>
        <View style={st.confirmOverlay}>
          <View style={st.confirmBox}>
            <Text style={{ fontSize: 40 }}>✅</Text>
            <Text style={st.confirmTitle}>신고가 접수되었습니다</Text>
            <Text style={st.confirmMsg}>운영팀이 검토 후 조치합니다.{'\n'}처리 상태는 [내정보 → 안전 및 보안 → 신고 내역]에서 확인할 수 있어요.</Text>
            <TouchableOpacity style={[st.confirmAction, { backgroundColor: COLORS.primary, width: '100%' }]} onPress={() => setReportDone(false)}>
              <Text style={st.confirmActionText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  // 히어로
  hero: { position: 'relative', width: '100%', height: HERO_H },
  heroImg: { width: '100%', height: HERO_H },

  // 그라데이션 레이어 (포토 위에 겹쳐서 아래로 갈수록 어두워지는 효과)
  heroGrad1: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: HERO_H * 0.75,
    backgroundColor: 'transparent',
  },
  heroGrad2: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: HERO_H * 0.5,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroGrad3: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: HERO_H * 0.38,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },

  heroTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 10,
  },
  heroIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 18, paddingBottom: 20, paddingTop: 12,
    gap: 6,
  },
  heroSpecRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  heroSpecChip: {
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(92,106,245,0.75)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  heroSpecText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  heroOverlayName: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  heroOverlayMeta2: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  heroOverlayRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroOverlayMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  // 기본 정보
  infoBlock: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18, gap: 10 },
  tagline: { fontSize: 14, color: COLORS.primary, fontWeight: '600', fontStyle: 'italic' },
  gymRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gymText: { fontSize: 13, color: '#888' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 0 },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statNum: { fontSize: 17, fontWeight: '800', color: '#111' },
  statLabel: { fontSize: 11, color: '#999' },
  statDivider: { width: 1, height: 28, backgroundColor: '#eee' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 10,
  },
  actionBtnOn: { backgroundColor: COLORS.primary },
  actionBtnOff: { backgroundColor: '#f2f2f2' },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  actionBtnTextOff: { color: '#888' },
  chatBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  chatBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  // 섹션
  sectionDivider: { height: 8, backgroundColor: '#f5f5f5' },
  section: { paddingHorizontal: 18, paddingVertical: 20, gap: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111' },

  // 태그
  tagScroll: { gap: 8, paddingBottom: 2 },
  tagPrimary: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.primary + '18',
  },
  tagPrimaryText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  tagSecondary: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f2f2f2',
  },
  tagSecondaryText: { fontSize: 13, color: '#555', fontWeight: '500' },

  // 소개
  bioText: { fontSize: 14, color: '#333', lineHeight: 22 },

  // 갤러리
  galleryThumb: { width: 110, height: 110, borderRadius: 10, backgroundColor: '#eee' },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },

  // 가격 카드
  priceCard: {
    flexDirection: 'row', borderWidth: 1, borderColor: '#eee',
    borderRadius: 14, overflow: 'hidden',
  },
  priceCardLeft: { flex: 1, alignItems: 'center', paddingVertical: 18, gap: 4 },
  priceCardMain: { fontSize: 22, fontWeight: '900', color: '#111' },
  priceCardLabel: { fontSize: 12, color: '#aaa' },
  priceCardSub: { fontSize: 11, color: '#bbb' },
  priceCardDivider: { width: 1, backgroundColor: '#eee', marginVertical: 16 },
  priceCardRight: { flex: 1, alignItems: 'center', paddingVertical: 18, gap: 4 },
  trialBadge: { backgroundColor: '#FFF3E0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  trialBadgeText: { fontSize: 11, fontWeight: '700', color: '#E65100' },
  triceCardTrial: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  priceNote: { fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: -6 },

  // 자격증
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  moreBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // 경력
  workItem: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  timelineCol: { alignItems: 'center', width: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#eee', marginTop: 4 },
  workContent: { flex: 1, paddingBottom: 16 },
  workGym: { fontSize: 15, fontWeight: '700', color: '#111' },
  workPosition: { fontSize: 13, color: COLORS.primary, marginTop: 2 },
  workPeriod: { fontSize: 12, color: '#999', marginTop: 2 },
  workDesc: { fontSize: 13, color: '#666', marginTop: 4, lineHeight: 18 },

  // 일정
  scheduleGrid: { gap: 10 },
  scheduleItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scheduleText: { fontSize: 14, color: '#333', fontWeight: '500' },
  scheduleTextMuted: { fontSize: 14, color: '#aaa' },

  // 헬스장
  gymItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  gymIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primary + '14', alignItems: 'center', justifyContent: 'center' },
  gymName: { fontSize: 14, fontWeight: '700', color: '#111' },
  gymAddr: { fontSize: 12, color: '#999', marginTop: 2 },


  // 리뷰
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sortRow: { flexDirection: 'row', gap: 6 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
  sortChipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sortChipText: { fontSize: 11, fontWeight: '600', color: '#888' },
  sortChipTextOn: { color: '#fff' },
  reviewCard: { borderBottomWidth: 1, borderBottomColor: '#f2f2f2', paddingBottom: 16, gap: 8 },
  reviewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' },
  reviewAvatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  reviewerName: { fontSize: 14, fontWeight: '700', color: '#111' },
  reviewStars: { color: '#FBBF24', fontSize: 13 },
  reviewDate: { fontSize: 11, color: '#bbb', marginTop: 2 },
  reviewComment: { fontSize: 13, color: '#333', lineHeight: 20 },
  reviewMedia: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#eee' },
  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: '#bbb' },

  // 블랙리스트
  blackBanner: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FCA5A5' },
  blackBannerText: { fontSize: 13, color: COLORS.error, fontWeight: '600' },
  blackBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1.5 },
  blackBtnActive: { backgroundColor: COLORS.error + '12', borderColor: COLORS.error },
  blackBtnInactive: { borderColor: '#ddd' },
  blackBtnText: { fontSize: 14, fontWeight: '700' },
  blackBtnTextActive: { color: COLORS.error },
  blackBtnTextInactive: { color: '#888' },

  // 하단 바
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, paddingBottom: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  bottomPriceWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  bottomPrice: { fontSize: 20, fontWeight: '900', color: '#111' },
  bottomPriceSub: { fontSize: 13, color: '#999' },
  bottomBtnRow: { flexDirection: 'row', gap: 8 },
  consultBtn: {
    borderWidth: 1.5, borderColor: '#0891B2', borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  consultBtnText: { fontSize: 14, fontWeight: '700', color: '#0891B2' },
  bottomBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: 22, paddingVertical: 14,
  },
  bottomBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // 사진 뷰어
  pvOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center' },
  pvCloseBtn: { position: 'absolute', top: 52, right: 18, zIndex: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  pvCounter: { position: 'absolute', top: 58, alignSelf: 'center', zIndex: 20 },
  pvCounterText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  pvDots: { flexDirection: 'row', justifyContent: 'center', gap: 7, paddingBottom: 48, paddingTop: 20 },
  pvDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  pvDotActive: { backgroundColor: '#fff' },

  // 동영상 모달
  vidOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center' },
  vidCloseBtn: { position: 'absolute', top: 52, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },

  // 확인 모달
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, gap: 14 },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' },
  confirmMsg: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancel: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: '#f2f2f2' },
  confirmCancelText: { color: '#888', fontWeight: '700' },
  confirmAction: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  confirmActionText: { color: '#fff', fontWeight: '800' },

  // 팔로우 모달
  followOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  followSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 8 },
  followHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  followTitle: { fontSize: 16, fontWeight: '700', color: '#111', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  followUserRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee', gap: 12 },
  followUserAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eee' },
  followUserName: { fontSize: 15, fontWeight: '600', color: '#111' },
  followRoleBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#f2f2f2' },
  followRoleBadgeTrainer: { backgroundColor: COLORS.primary + '15' },
  followRoleText: { fontSize: 11, fontWeight: '600', color: '#888' },
  followRoleTextTrainer: { color: COLORS.primary },
  followEmpty: { alignItems: 'center', paddingVertical: 40 },
  followEmptyText: { fontSize: 14, color: '#bbb' },
});
