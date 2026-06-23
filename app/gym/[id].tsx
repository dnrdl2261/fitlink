import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGymById } from '../../hooks/useFilteredGyms';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { usePartnerStore } from '../../store/partnerStore';
import { useBookingStore } from '../../store/bookingStore';
import { useReviewStore } from '../../store/reviewStore';
import { useReportStore } from '../../store/reportStore';
import { MOCK_TRAINERS } from '../../data/trainers';
import { MOCK_GYM_ADMINS } from '../../data/users';
import { formatDistance } from '../../utils/distance';
import { formatPrice } from '../../utils/formatters';
import { COLORS, DAY_LABELS } from '../../utils/constants';
import StarRating from '../../components/StarRating';
import TrainerCard from '../../components/TrainerCard';

const GYM_REPORT_REASONS = [
  '허위 시설·정보 기재',
  '환불·요금 분쟁',
  '위생·안전 문제',
  '부적절한 응대',
  '사기 또는 금전 갈취',
  '기타',
];

export default function GymDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const isTrainer = from === 'trainer';
  const gym = useGymById(id);
  const [activeImg, setActiveImg] = useState(0);
  const [partnerModal, setPartnerModal] = useState<'hidden' | 'confirm' | 'done' | 'already' | 'pending'>('hidden');
  const { favoriteGyms, toggleFavorite } = useGymSlotStore();
  const isFav = gym ? favoriteGyms.includes(gym.id) : false;
  const { trainer, member } = useAuthStore();
  const { getOrCreate } = useChatStore();
  const { applyToGym, isPartner, hasActiveRequest } = usePartnerStore();
  const { getMyBookings } = useBookingStore();
  const { getGymReviews, hasReviewedGym } = useReviewStore();
  const { addReport } = useReportStore();
  const [reportModal, setReportModal] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const isAlreadyPartner = trainer && gym ? isPartner(gym.id, trainer.id, gym.partnerTrainerIds) : false;
  const isPending = trainer && gym ? hasActiveRequest(gym.id, trainer.id) : false;

  const gymReviews = gym ? getGymReviews(gym.id) : [];

  const hasCompletedBookingAtGym = useMemo(() => {
    if (!member || !gym) return false;
    const myBookings = getMyBookings(member.id);
    return myBookings.some(
      (b) => b.status === 'completed' && gym.partnerTrainerIds.includes(b.trainerId)
    );
  }, [member, gym]);

  const canWriteGymReview = member && hasCompletedBookingAtGym && gym
    ? !hasReviewedGym(gym.id, member.id)
    : false;

  const handlePartnerApply = () => {
    if (!gym) return;
    if (isAlreadyPartner) { setPartnerModal('already'); return; }
    if (isPending) { setPartnerModal('pending'); return; }
    setPartnerModal('confirm');
  };

  const handleGymChat = () => {
    if (!trainer || !gym) return;
    const gymAdmin = MOCK_GYM_ADMINS.find((a) => a.gymId === gym.id);
    const adminId = gym.adminUserId;
    const adminName = gymAdmin?.name ?? `${gym.name} 관리자`;
    const convId = getOrCreate(
      'trainer-gym',
      { id: trainer.id, name: trainer.name, role: 'trainer' },
      { id: adminId, name: adminName, role: 'gym_admin' }
    );
    router.push(`/chat/${convId}` as any);
  };

  const submitReport = (reason: string) => {
    if (!gym) return;
    addReport({
      reporterId: member?.id ?? '',
      reporterName: member?.name ?? '회원',
      targetType: 'gym',
      targetId: gym.id,
      targetName: gym.name,
      reason,
    });
    setReportModal(false);
    setReportDone(true);
  };

  if (!gym) {
    return (
      <View style={styles.notFound}>
        <Text>헬스장 정보를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const partnerTrainers = MOCK_TRAINERS.filter((t) =>
    gym.partnerTrainerIds.includes(t.id)
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 이미지 슬라이더 */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: gym.images[activeImg] }} style={styles.mainImage} />
<View style={styles.imageDots}>
            {gym.images.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setActiveImg(i)}>
                <View style={[styles.dot, activeImg === i && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
          {gym.isPartner && (
            <View style={styles.partnerBadge}>
              <Text style={styles.partnerText}>FLOWIN 파트너</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.favOverlayBtn}
            onPress={() => toggleFavorite(gym.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.favOverlayIcon, isFav && styles.favOverlayIconActive]}>
              {isFav ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 기본 정보 */}
        <View style={styles.section}>
          <Text style={styles.gymName}>{gym.name}</Text>
          <Text style={styles.address}>📍 {gym.address}</Text>
          {gym.distance !== undefined && (
            <Text style={styles.distance}>현재 위치에서 {formatDistance(gym.distance)}</Text>
          )}
          <StarRating rating={gym.rating} reviewCount={gym.reviewCount} size="medium" />
          <Text style={styles.description}>{gym.description}</Text>
          <Text style={styles.phone}>📞 {gym.phoneNumber}</Text>
          {!isTrainer && (
            <TouchableOpacity style={styles.reportLink} onPress={() => setReportModal(true)}>
              <Text style={styles.reportLinkText}>🚩 이 헬스장 신고하기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 시설 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시설 및 서비스</Text>
          <View style={styles.facilityGrid}>
            {gym.facilities.map((f) => (
              <View key={f} style={styles.facilityItem}>
                <Text style={styles.facilityEmoji}>{getFacilityEmoji(f)}</Text>
                <Text style={styles.facilityName}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 운영 시간 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>운영 시간</Text>
          {gym.operatingHours.map((h) => (
            <View key={h.dayOfWeek} style={styles.hourRow}>
              <Text style={styles.dayLabel}>{DAY_LABELS[h.dayOfWeek]}요일</Text>
              <Text style={styles.hourValue}>
                {h.openTime} ~ {h.closeTime}
              </Text>
              {h.ptAvailable && (
                <View style={styles.ptBadge}>
                  <Text style={styles.ptText}>PT가능</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* 이용 요금 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시설 이용료 (PT 세션 시)</Text>
          {gym.pricing.map((p) => (
            <View key={p.sessionType} style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>{p.label}</Text>
              <Text style={styles.pricingValue}>{formatPrice(p.facilityFee)}</Text>
            </View>
          ))}
          <Text style={styles.pricingNote}>* 위 금액은 헬스장 시설 이용료이며 트레이너 PT 비용은 별도입니다</Text>
        </View>

        {/* 이용 규칙 */}
        {gym.usageRules && gym.usageRules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>이용 규칙</Text>
            {gym.usageRules.map((rule, idx) => (
              <View key={idx} style={styles.ruleItem}>
                <Text style={styles.ruleBullet}>•</Text>
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 소속 트레이너 */}
        {partnerTrainers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>이 헬스장의 파트너 트레이너</Text>
            {partnerTrainers.map((t) => (
              <TrainerCard
                key={t.id}
                trainer={t}
                onPress={() => router.push(`/trainer/${t.id}`)}
              />
            ))}
          </View>
        )}

        {/* 리뷰 섹션 */}
        <View style={styles.section}>
          <View style={styles.reviewHeader}>
            <Text style={styles.sectionTitle}>리뷰 ({gymReviews.length})</Text>
            {canWriteGymReview && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/review/gym-write' as any,
                    params: { gymId: gym.id, gymName: gym.name },
                  })
                }
              >
                <Text style={styles.reviewWriteBtn}>리뷰 작성</Text>
              </TouchableOpacity>
            )}
            {member && hasCompletedBookingAtGym && !canWriteGymReview && (
              <Text style={styles.reviewWrittenLabel}>✓ 리뷰 작성 완료</Text>
            )}
          </View>
          {gymReviews.length === 0 ? (
            <Text style={styles.reviewEmpty}>아직 리뷰가 없습니다.</Text>
          ) : (
            gymReviews.map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewItemHeader}>
                  <Text style={styles.reviewerName}>{review.memberName}</Text>
                  <Text style={styles.reviewDate}>{review.createdAt}</Text>
                </View>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Text key={s} style={[styles.reviewStar, review.rating >= s && styles.reviewStarActive]}>★</Text>
                  ))}
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))
          )}
        </View>

        {/* 예약 버튼 */}
        {isTrainer && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.chatBtn} onPress={handleGymChat}>
              <Text style={styles.chatBtnText}>💬 채팅</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.partnerBtn} onPress={handlePartnerApply}>
              <Text style={styles.partnerBtnText}>🤝 파트너신청</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() =>
                router.push({ pathname: '/(trainer)/slots', params: { gymId: gym.id } } as any)
              }
            >
              <Text style={styles.bookBtnText}>예약하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 파트너 신청 모달 */}
      <Modal visible={partnerModal !== 'hidden'} transparent animationType="fade" onRequestClose={() => setPartnerModal('hidden')}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPartnerModal('hidden')}>
          <View style={styles.modalBox}>
            {partnerModal === 'already' && (
              <>
                <Text style={styles.modalEmoji}>🤝</Text>
                <Text style={styles.modalTitle}>이미 파트너입니다</Text>
                <Text style={styles.modalBody}>{gym.name}의 파트너 트레이너로{'\n'}이미 등록되어 있습니다.</Text>
                <TouchableOpacity style={styles.modalSingleBtn} onPress={() => setPartnerModal('hidden')}>
                  <Text style={styles.modalSingleBtnText}>확인</Text>
                </TouchableOpacity>
              </>
            )}
            {partnerModal === 'pending' && (
              <>
                <Text style={styles.modalEmoji}>⏳</Text>
                <Text style={styles.modalTitle}>신청 검토 중</Text>
                <Text style={styles.modalBody}>{gym.name}에 이미 파트너 신청을{'\n'}보낸 상태입니다.{'\n\n'}헬스장 관리자의 승인 또는 거절{'\n'}이후에 다시 신청할 수 있습니다.</Text>
                <TouchableOpacity style={styles.modalSingleBtn} onPress={() => setPartnerModal('hidden')}>
                  <Text style={styles.modalSingleBtnText}>확인</Text>
                </TouchableOpacity>
              </>
            )}
            {partnerModal === 'confirm' && (
              <>
                <Text style={styles.modalEmoji}>🏋️</Text>
                <Text style={styles.modalTitle}>파트너 신청</Text>
                <Text style={styles.modalBody}>{gym.name}에 파트너 트레이너로{'\n'}신청하시겠습니까?{'\n\n'}신청 후 헬스장 관리자의 승인이 필요합니다.</Text>
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPartnerModal('hidden')}>
                    <Text style={styles.modalCancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmBtn}
                    onPress={() => {
                      if (trainer && gym) {
                        applyToGym({
                          gymId: gym.id, gymName: gym.name,
                          trainerId: trainer.id, trainerName: trainer.name,
                          trainerTagline: trainer.tagline,
                          trainerSpecializations: trainer.trainingGoals,
                        });
                      }
                      setPartnerModal('done');
                    }}
                  >
                    <Text style={styles.modalConfirmText}>신청하기</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {partnerModal === 'done' && (
              <>
                <Text style={styles.modalEmoji}>✅</Text>
                <Text style={styles.modalTitle}>신청 완료</Text>
                <Text style={styles.modalBody}>파트너 신청이 접수되었습니다.{'\n'}헬스장에서 검토 후 연락드립니다.</Text>
                <TouchableOpacity style={styles.modalSingleBtn} onPress={() => setPartnerModal('hidden')}>
                  <Text style={styles.modalSingleBtnText}>확인</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 헬스장 신고 - 사유 선택 */}
      <Modal visible={reportModal} transparent animationType="fade" onRequestClose={() => setReportModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setReportModal(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>🚩</Text>
            <Text style={styles.modalTitle}>{gym.name} 신고</Text>
            <Text style={styles.modalBody}>신고 사유를 선택하세요.{'\n'}허위 신고 시 이용이 제한될 수 있습니다.</Text>
            {GYM_REPORT_REASONS.map((r) => (
              <TouchableOpacity key={r} style={styles.reasonBtn} onPress={() => submitReport(r)}>
                <Text style={styles.reasonBtnText}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 신고 접수 완료 */}
      <Modal visible={reportDone} transparent animationType="fade" onRequestClose={() => setReportDone(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setReportDone(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>✅</Text>
            <Text style={styles.modalTitle}>신고가 접수되었습니다</Text>
            <Text style={styles.modalBody}>운영팀이 검토 후 조치합니다.{'\n'}처리 상태는 [내정보 → 안전 및 보안 → 신고 내역]에서 확인할 수 있어요.</Text>
            <TouchableOpacity style={styles.modalSingleBtn} onPress={() => setReportDone(false)}>
              <Text style={styles.modalSingleBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function getFacilityEmoji(facility: string): string {
  const map: Record<string, string> = {
    샤워실: '🚿', 주차장: '🅿️', 락커룸: '🔒', 요가스튜디오: '🧘',
    필라테스: '🤸', 수영장: '🏊', 사우나: '♨️', 스쿼시: '🏸',
    카페테리아: '☕', 어린이놀이터: '🎡',
  };
  return map[facility] ?? '✅';
}

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageContainer: { position: 'relative' },
  mainImage: { width: '100%', height: 250, backgroundColor: COLORS.border },
  imageDots: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: '#fff' },
  partnerBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  partnerText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  favOverlayBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favOverlayIcon: { fontSize: 22, color: 'rgba(255,255,255,0.85)' },
  favOverlayIconActive: { color: '#FFD700' },
  section: {
    backgroundColor: COLORS.surface,
    margin: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  gymName: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  address: { fontSize: 14, color: COLORS.textSecondary },
  distance: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  description: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  phone: { fontSize: 14, color: COLORS.textSecondary },
  facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  facilityItem: { alignItems: 'center', width: '22%' },
  facilityEmoji: { fontSize: 24, marginBottom: 4 },
  facilityName: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  dayLabel: { fontSize: 13, color: COLORS.text, width: 48, fontWeight: '600' },
  hourValue: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  ptBadge: {
    backgroundColor: 'rgba(74,222,128,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ptText: { fontSize: 10, color: COLORS.success, fontWeight: '700' },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pricingLabel: { fontSize: 14, color: COLORS.text },
  pricingValue: { fontSize: 14, color: COLORS.secondary, fontWeight: '700' },
  pricingNote: { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic' },
  ruleItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  ruleBullet: { fontSize: 14, color: COLORS.primary, lineHeight: 22, fontWeight: '700' },
  ruleText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 22 },
  actionRow: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 16, marginBottom: 16,
  },
  chatBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
  },
  chatBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  partnerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: COLORS.primaryPale,
  },
  partnerBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  bookBtn: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewWriteBtn: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  reviewWrittenLabel: { fontSize: 13, color: COLORS.textSecondary },
  reviewEmpty: { fontSize: 14, color: COLORS.textSecondary, paddingVertical: 8 },
  reviewItem: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderSubtle,
    gap: 4,
  },
  reviewItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewerName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  reviewDate: { fontSize: 12, color: COLORS.textSecondary },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewStar: { fontSize: 14, color: COLORS.border },
  reviewStarActive: { color: '#FFB300' },
  reviewComment: { fontSize: 13, color: COLORS.text, lineHeight: 20 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    width: 300, backgroundColor: '#fff', borderRadius: 20,
    padding: 24, alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  modalEmoji: { fontSize: 40, marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  modalBody: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6, width: '100%' },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border,
  },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', backgroundColor: COLORS.secondary,
  },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  modalSingleBtn: {
    marginTop: 6, width: '100%', paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', backgroundColor: COLORS.secondary,
  },
  modalSingleBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  reportLink: { marginTop: 10, alignSelf: 'flex-start' },
  reportLinkText: { fontSize: 13, fontWeight: '600', color: COLORS.error },
  reasonBtn: {
    width: '100%', paddingVertical: 13, borderRadius: 12, marginTop: 4,
    alignItems: 'center', backgroundColor: COLORS.background,
  },
  reasonBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
});
