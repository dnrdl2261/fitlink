import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGymById } from '../../hooks/useFilteredGyms';
import { MOCK_TRAINERS } from '../../data/trainers';
import { formatDistance } from '../../utils/distance';
import { formatPrice } from '../../utils/formatters';
import { COLORS, DAY_LABELS } from '../../utils/constants';
import StarRating from '../../components/StarRating';
import TrainerCard from '../../components/TrainerCard';

export default function GymDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const gym = useGymById(id);
  const [activeImg, setActiveImg] = useState(0);

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
              <Text style={styles.partnerText}>FollowFit 파트너</Text>
            </View>
          )}
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

        {/* 예약 버튼 */}
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() =>
            router.push({ pathname: '/booking/new', params: { gymId: gym.id, gymName: gym.name } })
          }
        >
          <Text style={styles.bookBtnText}>이 헬스장에서 PT 예약하기</Text>
        </TouchableOpacity>
      </ScrollView>
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
  bookBtn: {
    backgroundColor: COLORS.primary,
    margin: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
