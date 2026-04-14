import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MOCK_TRAINERS } from '../../data/trainers';
import { MOCK_GYMS } from '../../data/gyms';
import { formatPrice, formatRelativeDate } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';
import StarRating from '../../components/StarRating';
import CertificationBadge from '../../components/CertificationBadge';

export default function TrainerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const trainer = MOCK_TRAINERS.find((t) => t.id === id);

  if (!trainer) {
    return (
      <View style={styles.notFound}>
        <Text>트레이너 정보를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const partnerGyms = MOCK_GYMS.filter((g) => trainer.partnerGymIds.includes(g.id));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 프로필 헤더 */}
        <View style={styles.header}>
          <Image
            source={{ uri: trainer.profileImageUrl ?? 'https://picsum.photos/seed/default/200/200' }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{trainer.name} 트레이너</Text>
          <Text style={styles.experience}>{trainer.experienceYears}년 경력 · 총 {trainer.totalSessions.toLocaleString()}회 세션</Text>
          <StarRating rating={trainer.rating} reviewCount={trainer.reviewCount} size="large" />
          <View style={styles.specTags}>
            {trainer.specializations.map((s) => (
              <View key={s} style={styles.specTag}>
                <Text style={styles.specText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 소개 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>트레이너 소개</Text>
          <Text style={styles.bio}>{trainer.bio}</Text>
        </View>

        {/* 자격증 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>자격증 및 인증</Text>
          {trainer.certifications.map((cert) => (
            <CertificationBadge key={cert.id} cert={cert} />
          ))}
        </View>

        {/* 경력 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>경력 사항</Text>
          {trainer.workHistory.map((w, idx) => (
            <View key={w.id} style={styles.workItem}>
              <View style={styles.timeline}>
                <View style={styles.timelineDot} />
                {idx < trainer.workHistory.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.workContent}>
                <Text style={styles.workGym}>{w.gymName}</Text>
                <Text style={styles.workPosition}>{w.position}</Text>
                <Text style={styles.workPeriod}>
                  {w.startDate.slice(0, 7)} ~ {w.endDate ? w.endDate.slice(0, 7) : '현재'}
                </Text>
                {w.description && (
                  <Text style={styles.workDesc}>{w.description}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* 활동 헬스장 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>활동 가능 헬스장</Text>
          {partnerGyms.map((gym) => (
            <TouchableOpacity
              key={gym.id}
              style={styles.gymItem}
              onPress={() => router.push(`/gym/${gym.id}`)}
            >
              <Text style={styles.gymName}>{gym.name}</Text>
              <Text style={styles.gymAddress}>{gym.address}</Text>
              <Text style={styles.gymArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 리뷰 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>수강생 후기</Text>
          {trainer.reviews.map((rev) => (
            <View key={rev.id} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>{rev.reviewerName}</Text>
                <View style={styles.reviewRating}>
                  <Text style={styles.reviewStars}>
                    {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                  </Text>
                </View>
                <Text style={styles.reviewDate}>{formatRelativeDate(rev.createdAt)}</Text>
              </View>
              <Text style={styles.reviewComment}>{rev.comment}</Text>
            </View>
          ))}
        </View>

        {/* 예약 버튼 */}
        <View style={styles.bookingBox}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>1회 세션 비용</Text>
            <Text style={styles.priceValue}>{formatPrice(trainer.sessionPrice)}</Text>
          </View>
          <Text style={styles.priceNote}>+ 헬스장 시설 이용료 별도 (1만~1.8만원)</Text>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() =>
              router.push({
                pathname: '/booking/new',
                params: { trainerId: trainer.id, trainerName: trainer.name },
              })
            }
          >
            <Text style={styles.bookBtnText}>PT 예약하기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 10,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.border,
    marginBottom: 4,
  },
  name: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  experience: { fontSize: 13, color: COLORS.textSecondary },
  specTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  specTag: {
    backgroundColor: 'rgba(255,107,107,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  specText: { fontSize: 13, color: COLORS.secondary, fontWeight: '700' },
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
    gap: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  bio: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  workItem: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  timeline: { alignItems: 'center', width: 16 },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.border, marginTop: 4 },
  workContent: { flex: 1, paddingBottom: 16 },
  workGym: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  workPosition: { fontSize: 13, color: COLORS.primary, marginTop: 2 },
  workPeriod: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  workDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  gymItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  gymName: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },
  gymAddress: { fontSize: 12, color: COLORS.textSecondary },
  gymArrow: { fontSize: 20, color: COLORS.border, marginLeft: 8 },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  reviewRating: { flex: 1 },
  reviewStars: { color: '#FFB300', fontSize: 13 },
  reviewDate: { fontSize: 11, color: COLORS.textSecondary },
  reviewComment: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  bookingBox: {
    backgroundColor: COLORS.surface,
    margin: 12,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 15, color: COLORS.text },
  priceValue: { fontSize: 20, fontWeight: '800', color: COLORS.secondary },
  priceNote: { fontSize: 12, color: COLORS.textSecondary },
  bookBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  bookBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
