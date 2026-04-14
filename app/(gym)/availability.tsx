import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { MOCK_GYMS } from '../../data/gyms';
import { formatPrice } from '../../utils/formatters';
import { COLORS, DAY_LABELS } from '../../utils/constants';

export default function AvailabilityScreen() {
  const gym = MOCK_GYMS.find((g) => g.id === 'gym_001')!;
  const [ptEnabled, setPtEnabled] = useState(
    gym.operatingHours.reduce((acc, h) => ({ ...acc, [h.dayOfWeek]: h.ptAvailable }), {} as Record<number, boolean>)
  );

  const handleToggle = (dayOfWeek: number) => {
    const newVal = !ptEnabled[dayOfWeek];
    setPtEnabled((prev) => ({ ...prev, [dayOfWeek]: newVal }));
    Alert.alert(
      'PT 설정 변경',
      `${DAY_LABELS[dayOfWeek]}요일 PT ${newVal ? '허용' : '불허용'}으로 변경되었습니다.`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 운영 시간 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>운영 시간 및 PT 가용 설정</Text>
          <Text style={styles.sectionNote}>* 실제 운영 시간 변경은 고객센터를 통해 요청하세요</Text>
          {gym.operatingHours.map((h) => (
            <View key={h.dayOfWeek} style={styles.dayRow}>
              <Text style={styles.dayLabel}>{DAY_LABELS[h.dayOfWeek]}요일</Text>
              <Text style={styles.hourRange}>{h.openTime} ~ {h.closeTime}</Text>
              <TouchableOpacity
                style={[styles.ptToggle, ptEnabled[h.dayOfWeek] ? styles.ptToggleOn : styles.ptToggleOff]}
                onPress={() => handleToggle(h.dayOfWeek)}
              >
                <Text style={styles.ptToggleText}>
                  {ptEnabled[h.dayOfWeek] ? 'PT ON' : 'PT OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* 가격 정책 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시설 이용료 설정</Text>
          {gym.pricing.map((p) => (
            <View key={p.sessionType} style={styles.priceRow}>
              <View style={styles.priceInfo}>
                <Text style={styles.priceLabel}>{p.label}</Text>
                <Text style={styles.priceType}>{p.sessionType}</Text>
              </View>
              <View style={styles.priceValueBox}>
                <Text style={styles.priceValue}>{formatPrice(p.facilityFee)}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => Alert.alert('가격 수정', '가격 정책 수정은 고객센터를 통해 요청하세요.\n📞 1588-0000')}
          >
            <Text style={styles.editBtnText}>가격 수정 요청</Text>
          </TouchableOpacity>
        </View>

        {/* 시설 태그 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>등록된 시설</Text>
          <View style={styles.facilityGrid}>
            {gym.facilities.map((f) => (
              <View key={f} style={styles.facilityTag}>
                <Text style={styles.facilityText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => Alert.alert('시설 추가', '시설 정보 수정은 고객센터를 통해 요청하세요.\n📞 1588-0000')}
          >
            <Text style={styles.editBtnText}>시설 수정 요청</Text>
          </TouchableOpacity>
        </View>

        {/* 파트너 트레이너 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>파트너 트레이너 ({gym.partnerTrainerIds.length}명)</Text>
          <Text style={styles.sectionNote}>
            파트너 트레이너 추가/제거는 고객센터를 통해 요청하세요.
          </Text>
          {gym.partnerTrainerIds.map((tid) => (
            <View key={tid} style={styles.trainerRow}>
              <View style={styles.trainerAvatar}>
                <Text style={{ fontSize: 20 }}>💪</Text>
              </View>
              <Text style={styles.trainerId}>트레이너 ID: {tid}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  section: {
    backgroundColor: COLORS.surface,
    margin: 12,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  sectionNote: { fontSize: 12, color: COLORS.textSecondary },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  dayLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text, width: 50 },
  hourRange: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  ptToggle: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  ptToggleOn: { backgroundColor: COLORS.gym },
  ptToggleOff: { backgroundColor: COLORS.surfaceElevated },
  ptToggleText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  priceInfo: {},
  priceLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  priceType: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  priceValueBox: {
    backgroundColor: 'rgba(45,212,191,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceValue: { fontSize: 15, fontWeight: '800', color: COLORS.gym },
  editBtn: {
    borderWidth: 1,
    borderColor: COLORS.gym,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  editBtnText: { color: COLORS.gym, fontWeight: '700', fontSize: 14 },
  facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  facilityTag: {
    backgroundColor: 'rgba(45,212,191,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  facilityText: { fontSize: 13, color: COLORS.gym, fontWeight: '600' },
  trainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  trainerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(45,212,191,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerId: { fontSize: 14, color: COLORS.textSecondary },
});
