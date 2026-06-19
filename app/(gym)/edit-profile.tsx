import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Image, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { useGymProfileStore } from '../../store/gymProfileStore';
import { MOCK_GYMS } from '../../data/gyms';
import { COLORS } from '../../utils/constants';
import { FacilityTag, PricingTier } from '../../types';

const ALL_FACILITIES: FacilityTag[] = [
  '샤워실', '주차장', '락커룸', '요가스튜디오',
  '필라테스', '수영장', '사우나', '스쿼시', '카페테리아', '어린이놀이터',
];

const FACILITY_EMOJI: Record<FacilityTag, string> = {
  샤워실: '🚿', 주차장: '🅿️', 락커룸: '🔒', 요가스튜디오: '🧘',
  필라테스: '🤸', 수영장: '🏊', 사우나: '♨️', 스쿼시: '🏸',
  카페테리아: '☕', 어린이놀이터: '🎡',
};

export default function GymEditProfileScreen() {
  const router = useRouter();
  const { gymAdmin, updateGymAdmin } = useAuthStore();
  const { updateProfile, getEdits } = useGymProfileStore();

  const baseGym = MOCK_GYMS.find(g => g.id === gymAdmin?.gymId);
  if (!gymAdmin || !baseGym) return null;

  const savedEdits = getEdits(baseGym.id);
  const gym = { ...baseGym, ...savedEdits };

  // 관리자 정보
  const [adminName, setAdminName] = useState(gymAdmin.name);
  const [profileImageUrl, setProfileImageUrl] = useState(
    gymAdmin.profileImageUrl ?? gym.images[0] ?? 'https://picsum.photos/seed/gym1/200/200'
  );

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImageUrl(result.assets[0].uri);
    }
  };

  // 헬스장 기본 정보
  const [gymName, setGymName] = useState(gym.name);
  const [phoneNumber, setPhoneNumber] = useState(gym.phoneNumber);
  const [description, setDescription] = useState(gym.description);

  // 시설
  const [facilities, setFacilities] = useState<FacilityTag[]>([...gym.facilities]);

  // 이용 요금
  const [pricing, setPricing] = useState<PricingTier[]>(
    gym.pricing.map(p => ({ ...p }))
  );

  // 이용 규칙
  const [rules, setRules] = useState<string[]>(
    (gym.usageRules ?? []).length > 0 ? [...(gym.usageRules ?? [])] : ['']
  );

  const toggleFacility = (f: FacilityTag) => {
    setFacilities(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  const updatePricingFee = (idx: number, value: string) => {
    const next = [...pricing];
    next[idx] = { ...next[idx], facilityFee: parseInt(value.replace(/\D/g, '')) || 0 };
    setPricing(next);
  };

  const addRule = () => setRules(prev => [...prev, '']);
  const updateRule = (idx: number, value: string) => {
    const next = [...rules]; next[idx] = value; setRules(next);
  };
  const removeRule = (idx: number) => setRules(prev => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    updateGymAdmin({ name: adminName.trim() || gymAdmin.name, profileImageUrl });
    updateProfile(baseGym.id, {
      name: gymName.trim() || baseGym.name,
      phoneNumber: phoneNumber.trim() || baseGym.phoneNumber,
      description: description.trim() || baseGym.description,
      facilities,
      pricing,
      usageRules: rules.filter(r => r.trim()),
    });
    if (Platform.OS === 'web') {
      window.alert('수정이 완료되었습니다');
      router.replace('/(gym)/profile' as any);
    } else {
      Alert.alert('수정 완료', '수정이 완료되었습니다', [
        { text: '확인', onPress: () => router.replace('/(gym)/profile' as any) },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 네비게이션 바 */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.replace('/(gym)/profile' as any)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.navCancel}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>프로필 수정</Text>
        <TouchableOpacity onPress={handleSave} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.navSave}>저장</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── 프로필 사진 ── */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoWrapper} onPress={handlePickImage} activeOpacity={0.8}>
            <Image source={{ uri: profileImageUrl }} style={styles.profilePhoto} />
            <View style={styles.photoEditBadge}>
              <MaterialCommunityIcons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>사진을 눌러 변경하세요</Text>
        </View>

        {/* ── 관리자 정보 ── */}
        <Text style={styles.groupLabel}>관리자 정보</Text>
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>관리자명</Text>
            <TextInput
              style={styles.inputRight}
              value={adminName}
              onChangeText={setAdminName}
              placeholder="관리자 이름"
              placeholderTextColor={COLORS.textSecondary}
              textAlign="right"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>이메일</Text>
            <Text style={styles.inputReadonly}>{gymAdmin.email}</Text>
          </View>
        </View>

        {/* ── 헬스장 기본 정보 ── */}
        <Text style={styles.groupLabel}>헬스장 기본 정보</Text>
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>헬스장명</Text>
            <TextInput
              style={styles.inputRight}
              value={gymName}
              onChangeText={setGymName}
              placeholder="헬스장 이름"
              placeholderTextColor={COLORS.textSecondary}
              textAlign="right"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>전화번호</Text>
            <TextInput
              style={styles.inputRight}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="02-0000-0000"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="phone-pad"
              textAlign="right"
            />
          </View>
        </View>

        {/* ── 헬스장 소개 ── */}
        <Text style={styles.groupLabel}>헬스장 소개</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.bioInput}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="헬스장 소개글을 입력하세요"
            placeholderTextColor={COLORS.textSecondary}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}자</Text>
        </View>

        {/* ── 시설 및 서비스 ── */}
        <Text style={styles.groupLabel}>시설 및 서비스</Text>
        <View style={styles.card}>
          <View style={styles.chipGrid}>
            {ALL_FACILITIES.map(f => {
              const active = facilities.includes(f);
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleFacility(f)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipEmoji}>{FACILITY_EMOJI[f]}</Text>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── 이용 요금 ── */}
        <Text style={styles.groupLabel}>시설 이용료 (PT 세션 시)</Text>
        <View style={styles.card}>
          {pricing.map((p, idx) => (
            <React.Fragment key={p.sessionType}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>{p.label}</Text>
                <View style={styles.priceRight}>
                  <TextInput
                    style={styles.priceInput}
                    value={p.facilityFee ? String(p.facilityFee) : ''}
                    onChangeText={v => updatePricingFee(idx, v)}
                    keyboardType="number-pad"
                    textAlign="right"
                    placeholder="0"
                    placeholderTextColor={COLORS.textSecondary}
                  />
                  <Text style={styles.priceUnit}>원</Text>
                </View>
              </View>
              {idx < pricing.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── 이용 규칙 ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.groupLabel}>이용 규칙</Text>
          <TouchableOpacity style={styles.addBtn} onPress={addRule}>
            <MaterialCommunityIcons name="plus" size={14} color={'#4F63F5'} />
            <Text style={styles.addBtnText}>추가</Text>
          </TouchableOpacity>
        </View>
        {rules.map((rule, idx) => (
          <View key={idx} style={styles.ruleRow}>
            <View style={styles.ruleDot} />
            <TextInput
              style={styles.ruleInput}
              value={rule}
              onChangeText={v => updateRule(idx, v)}
              placeholder="이용 규칙을 입력하세요"
              placeholderTextColor={COLORS.textSecondary}
              multiline
            />
            <TouchableOpacity
              onPress={() => removeRule(idx)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}
        {rules.length === 0 && (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="format-list-bulleted" size={28} color={COLORS.border} />
            <Text style={styles.emptyText}>이용 규칙을 추가하세요</Text>
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  navCancel: { fontSize: 16, color: COLORS.textSecondary },
  navTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  navSave: { fontSize: 16, fontWeight: '700', color: '#4F63F5' },

  scroll: { paddingTop: 24, paddingHorizontal: 16 },

  photoSection: { alignItems: 'center', marginBottom: 28 },
  photoWrapper: { position: 'relative' },
  profilePhoto: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.border },
  photoEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#4F63F5',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.background,
  },
  photoHint: { marginTop: 8, fontSize: 12, color: COLORS.textSecondary },

  groupLabel: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    marginBottom: 8, marginLeft: 4, letterSpacing: 0.3,
  },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  inputLabel: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  inputRight: {
    flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500',
    textAlign: 'right', marginLeft: 12,
  },
  inputReadonly: {
    fontSize: 14, color: COLORS.textSecondary, fontWeight: '400',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginLeft: 16 },

  bioInput: {
    fontSize: 14, color: COLORS.text, lineHeight: 22,
    minHeight: 100, padding: 16, textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12, color: COLORS.textSecondary,
    textAlign: 'right', paddingHorizontal: 16, paddingBottom: 10,
  },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: '#4F63F5' + '15', borderColor: '#4F63F5' },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#4F63F5' },

  priceRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceInput: {
    fontSize: 15, fontWeight: '600', color: COLORS.text,
    minWidth: 80, textAlign: 'right',
  },
  priceUnit: { fontSize: 14, color: COLORS.textSecondary },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, marginLeft: 4, marginRight: 0,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#4F63F5' + '15', marginBottom: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#4F63F5' },

  ruleRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  ruleDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#4F63F5', marginTop: 7,
  },
  ruleInput: {
    flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20,
  },

  emptyCard: {
    alignItems: 'center', gap: 8, paddingVertical: 24,
    backgroundColor: COLORS.surface, borderRadius: 14, marginBottom: 20,
  },
  emptyText: { fontSize: 13, color: COLORS.textSecondary },
});
