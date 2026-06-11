import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Image, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../utils/constants';

const FITNESS_GOALS = [
  '체중감량', '근육증가', '체력향상', '재활', '필라테스', '크로스핏', '요가', '스포츠퍼포먼스',
];

const GOAL_EMOJI: Record<string, string> = {
  체중감량: '🔥', 근육증가: '💪', 체력향상: '⚡', 재활: '🩹',
  필라테스: '🤸', 크로스핏: '🏋️', 요가: '🧘', 스포츠퍼포먼스: '🏅',
};

export default function MemberEditProfileScreen() {
  const router = useRouter();
  const { member, updateMember } = useAuthStore();
  if (!member) return null;

  const [profileImageUrl, setProfileImageUrl] = useState(
    member.profileImageUrl ?? 'https://picsum.photos/seed/member1/200/200'
  );
  const [name, setName] = useState(member.name);
  const [phone, setPhone] = useState(member.phone ?? '');

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
  const [fitnessGoals, setFitnessGoals] = useState<string[]>([...member.fitnessGoals]);
  const [locations, setLocations] = useState<string[]>(
    (member.preferredLocations ?? []).length > 0 ? [...member.preferredLocations] : ['']
  );

  const toggleGoal = (g: string) => {
    setFitnessGoals(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );
  };

  const addLocation = () => setLocations(prev => [...prev, '']);
  const updateLocation = (idx: number, val: string) => {
    const next = [...locations]; next[idx] = val; setLocations(next);
  };
  const removeLocation = (idx: number) =>
    setLocations(prev => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    updateMember({
      profileImageUrl,
      name: name.trim() || member.name,
      phone: phone.trim(),
      fitnessGoals,
      preferredLocations: locations.filter(l => l.trim()),
    });
    if (Platform.OS === 'web') {
      window.alert('수정이 완료되었습니다');
      router.replace('/(member)/profile' as any);
    } else {
      Alert.alert('수정 완료', '수정이 완료되었습니다', [
        { text: '확인', onPress: () => router.replace('/(member)/profile' as any) },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.replace('/(member)/profile' as any)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.navCancel}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>프로필 수정</Text>
        <TouchableOpacity onPress={handleSave} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.navSave}>저장</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* 프로필 사진 */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoWrapper} onPress={handlePickImage} activeOpacity={0.8}>
            <Image source={{ uri: profileImageUrl }} style={styles.profilePhoto} />
            <View style={styles.photoEditBadge}>
              <MaterialCommunityIcons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>사진을 눌러 변경하세요</Text>
        </View>

        {/* 기본 정보 */}
        <Text style={styles.groupLabel}>기본 정보</Text>
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>이름</Text>
            <TextInput
              style={styles.inputRight}
              value={name}
              onChangeText={setName}
              placeholder="이름"
              placeholderTextColor={COLORS.textSecondary}
              textAlign="right"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>이메일</Text>
            <Text style={styles.inputReadonly}>{member.email}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>전화번호</Text>
            <TextInput
              style={styles.inputRight}
              value={phone}
              onChangeText={setPhone}
              placeholder="010-0000-0000"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="phone-pad"
              textAlign="right"
            />
          </View>
        </View>

        {/* 운동 목표 */}
        <Text style={styles.groupLabel}>운동 목표</Text>
        <View style={styles.card}>
          <View style={styles.chipGrid}>
            {FITNESS_GOALS.map(g => {
              const active = fitnessGoals.includes(g);
              return (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleGoal(g)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipEmoji}>{GOAL_EMOJI[g]}</Text>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 선호 지역 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.groupLabel}>선호 지역</Text>
          <TouchableOpacity style={styles.addBtn} onPress={addLocation}>
            <MaterialCommunityIcons name="plus" size={14} color={COLORS.primary} />
            <Text style={styles.addBtnText}>추가</Text>
          </TouchableOpacity>
        </View>
        {locations.map((loc, idx) => (
          <View key={idx} style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={18} color={COLORS.primary} />
            <TextInput
              style={styles.locationInput}
              value={loc}
              onChangeText={v => updateLocation(idx, v)}
              placeholder="ex. 강남구, 마포구"
              placeholderTextColor={COLORS.textSecondary}
            />
            <TouchableOpacity
              onPress={() => removeLocation(idx)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}
        {locations.length === 0 && (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="map-marker-plus-outline" size={28} color={COLORS.border} />
            <Text style={styles.emptyText}>선호 지역을 추가하세요</Text>
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  navCancel: { fontSize: 16, color: COLORS.textSecondary },
  navTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  navSave: { fontSize: 16, fontWeight: '700', color: COLORS.primary },

  scroll: { paddingTop: 24, paddingHorizontal: 16 },

  photoSection: { alignItems: 'center', marginBottom: 28 },
  photoWrapper: { position: 'relative' },
  profilePhoto: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.border },
  photoEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary,
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
  inputReadonly: { fontSize: 14, color: COLORS.textSecondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginLeft: 16 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primaryPale, borderColor: COLORS.primary },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, marginLeft: 4,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: COLORS.primaryPale, marginBottom: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  locationInput: { flex: 1, fontSize: 14, color: COLORS.text },

  emptyCard: {
    alignItems: 'center', gap: 8, paddingVertical: 24,
    backgroundColor: COLORS.surface, borderRadius: 14, marginBottom: 20,
  },
  emptyText: { fontSize: 13, color: COLORS.textSecondary },
});
