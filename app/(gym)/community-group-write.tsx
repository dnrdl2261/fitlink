import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, Platform,
  KeyboardAvoidingView, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../utils/constants';
import { GroupCat, GROUP_CATS, GROUP_CAT_COLOR } from '../../data/community';
import { useCommunityStore } from '../../store/communityStore';
import { useAuthStore } from '../../store/authStore';

const WRITE_CATS = GROUP_CATS.filter((c) => c !== '전체') as Exclude<GroupCat, '전체'>[];

export default function CommunityGroupWriteScreen() {
  const router = useRouter();
  const { t, from } = useLocalSearchParams<{ t: string; from?: string }>();
  const { gymAdmin } = useAuthStore();
  const { addGroup } = useCommunityStore();

  const [category, setCategory] = useState<Exclude<GroupCat, '전체'> | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [maxMembersStr, setMaxMembersStr] = useState('20');
  const [coverImage, setCoverImage] = useState<string | null>(null);

  const canSubmit = !!category && name.trim().length > 0 && description.trim().length > 0 && location.trim().length > 0;

  const pickCoverImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
      aspect: [16, 9],
      allowsEditing: true,
    });
    if (!result.canceled) {
      setCoverImage(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const max = parseInt(maxMembersStr) || 20;
    addGroup({
      category: category!,
      name: name.trim(),
      description: description.trim(),
      location: location.trim(),
      maxMembers: max,
      imageUrl: coverImage ?? undefined,
    });

    if (Platform.OS === 'web') {
      alert('모임이 개설됐습니다!');
    } else {
      Alert.alert('완료', '모임이 개설됐습니다!');
    }
    router.navigate({ pathname: '/(gym)/community', params: from ? { from } : {} } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.navigate({ pathname: '/(gym)/community', params: from ? { from } : {} } as any)} style={styles.headerBtn}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>모임 만들기</Text>
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>개설</Text>
          </TouchableOpacity>
        </View>

        <ScrollView key={t} style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* 1. 카테고리 */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>카테고리</Text>
              <Text style={styles.required}>*</Text>
              {!category && <Text style={styles.labelHint}>모임 성격에 맞는 분류를 선택해주세요</Text>}
            </View>
            <View style={styles.catGrid}>
              {WRITE_CATS.map((cat) => {
                const color = GROUP_CAT_COLOR[cat] ?? '#888';
                const selected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, { borderColor: color }, selected && { backgroundColor: color }]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.catChipText, { color: selected ? '#fff' : color }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 2. 모임 이름 */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>모임 이름</Text>
              <Text style={styles.required}>*</Text>
              <View style={styles.labelSpacer} />
              <Text style={styles.charCount}>{name.length}/50</Text>
            </View>
            <TextInput
              style={styles.lineInput}
              placeholder="모임 이름을 입력하세요"
              placeholderTextColor={COLORS.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={50}
            />
          </View>

          {/* 3. 모임 소개 */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>모임 소개</Text>
              <Text style={styles.required}>*</Text>
              <View style={styles.labelSpacer} />
              <Text style={styles.charCount}>{description.length}/1000</Text>
            </View>
            <TextInput
              style={styles.areaInput}
              placeholder="모임을 소개해주세요.&#10;활동 내용, 일정, 참여 조건 등을 적어주세요."
              placeholderTextColor={COLORS.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
          </View>

          {/* 4. 커버 이미지 */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>커버 이미지</Text>
              <Text style={styles.optionalLabel}>선택</Text>
            </View>
            <TouchableOpacity style={styles.coverPicker} onPress={pickCoverImage} activeOpacity={0.8}>
              {coverImage ? (
                <>
                  <Image source={{ uri: coverImage }} style={styles.coverPreview} resizeMode="cover" />
                  <View style={styles.coverEditOverlay}>
                    <MaterialCommunityIcons name="pencil-circle" size={32} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.coverEditText}>사진 변경</Text>
                  </View>
                </>
              ) : (
                <View style={styles.coverPlaceholder}>
                  <MaterialCommunityIcons name="image-plus" size={36} color={COLORS.textSecondary} />
                  <Text style={styles.coverPlaceholderText}>커버 사진 추가</Text>
                  <Text style={styles.coverPlaceholderSub}>모임을 대표하는 사진을 선택해주세요</Text>
                </View>
              )}
            </TouchableOpacity>
            {coverImage && (
              <TouchableOpacity onPress={() => setCoverImage(null)} style={styles.removeCoverBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.removeCoverText}>이미지 삭제</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 5. 활동 지역 */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>활동 지역</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <TextInput
              style={styles.lineInput}
              placeholder="예: 강남구, 서울 전체, 전국"
              placeholderTextColor={COLORS.textSecondary}
              value={location}
              onChangeText={setLocation}
              maxLength={30}
            />
            <Text style={styles.fieldHint}>오프라인 활동이 있는 경우 주요 지역을 입력해주세요</Text>
          </View>

          {/* 6. 최대 인원 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>최대 인원</Text>
            <View style={styles.memberRow}>
              {[10, 20, 30, 50, 100].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.memberChip, maxMembersStr === String(n) && styles.memberChipActive]}
                  onPress={() => setMaxMembersStr(String(n))}
                >
                  <Text style={[styles.memberChipText, maxMembersStr === String(n) && styles.memberChipTextActive]}>
                    {n}명
                  </Text>
                </TouchableOpacity>
              ))}
              <TextInput
                style={styles.memberInput}
                value={maxMembersStr}
                onChangeText={(v) => setMaxMembersStr(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="직접"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <Text style={styles.fieldHint}>현재 선택: {maxMembersStr || '0'}명</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex1: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerBtn: { minWidth: 44 },
  cancelText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  submitBtn: {
    backgroundColor: '#2DD4BF',
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
  },
  submitBtnDisabled: { backgroundColor: COLORS.border },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  submitTextDisabled: { color: COLORS.textSecondary },

  scroll: { flex: 1 },

  section: {
    backgroundColor: COLORS.surface,
    marginTop: 12, paddingHorizontal: 16, paddingVertical: 16, gap: 12,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  required: { fontSize: 15, fontWeight: '700', color: '#E53935', lineHeight: 20 },
  optionalLabel: {
    fontSize: 11, fontWeight: '600', color: COLORS.textSecondary,
    backgroundColor: COLORS.background, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  labelHint: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 4, flex: 1 },
  labelSpacer: { flex: 1 },
  charCount: { fontSize: 12, color: COLORS.textSecondary },
  fieldHint: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  catChipText: { fontSize: 14, fontWeight: '700' },

  lineInput: {
    fontSize: 16, color: COLORS.text,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingVertical: 8,
  },

  areaInput: {
    fontSize: 15, color: COLORS.text, lineHeight: 24,
    minHeight: 160, backgroundColor: COLORS.background,
    borderRadius: 12, padding: 14,
  },

  coverPicker: {
    borderRadius: 12, overflow: 'hidden',
    backgroundColor: COLORS.background,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    height: 160,
  },
  coverPreview: { width: '100%', height: '100%' },
  coverEditOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  coverEditText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  coverPlaceholderText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  coverPlaceholderSub: { fontSize: 12, color: COLORS.textSecondary },
  removeCoverBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  removeCoverText: { fontSize: 12, color: COLORS.textSecondary },

  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  memberChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  memberChipActive: { backgroundColor: '#2DD4BF', borderColor: '#2DD4BF' },
  memberChipText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  memberChipTextActive: { color: '#fff' },
  memberInput: {
    width: 60, paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    fontSize: 14, color: COLORS.text, textAlign: 'center',
    backgroundColor: COLORS.background,
  },
});
