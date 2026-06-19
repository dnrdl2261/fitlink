import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Alert,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../utils/constants';
import { REGION_DATA } from '../../data/regions';
import { TrainingGoal, Certification, WorkHistory } from '../../types/trainer';

type MediaItem = { id: string; uri: string; type: 'photo' | 'video' };
const THUMB_SIZE = (Dimensions.get('window').width - 32 - 16 * 2 - 8 * 3) / 4;

// 회원 '운동 목적'(trainers.tsx SPEC_FILTERS / 수업 목적)과 동일한 키워드
const ALL_GOALS: TrainingGoal[] = [
  '다이어트', '체형교정', '근력향상', '기초체력', '바디프로필', '벌크업', '재활운동',
  '통증관리', '산전산후', '대회준비', '유연성증진', '웨딩케어', '선수레슨',
];

const CITIES = Object.keys(REGION_DATA);

export default function EditProfileScreen() {
  const router = useRouter();
  const { trainer, updateTrainer } = useAuthStore();

  if (!trainer) return null;

  const [profileImageUrl, setProfileImageUrl] = useState(trainer.profileImageUrl ?? '');
  const [tagline, setTagline] = useState(trainer.tagline ?? '');
  const [bio, setBio] = useState(trainer.bio);
  const [gender, setGender] = useState<'male' | 'female'>(trainer.gender);
  const [experienceYears, setExperienceYears] = useState(String(trainer.experienceYears));
  const [sessionPrice, setSessionPrice] = useState(String(trainer.sessionPrice));
  const [city, setCity] = useState(trainer.address?.city ?? '서울');
  const [district, setDistrict] = useState(trainer.address?.district ?? '');
  const [dong, setDong] = useState(trainer.address?.dong ?? '');
  const [goals, setGoals] = useState<TrainingGoal[]>([...(trainer.trainingGoals ?? [])]);
  const [certifications, setCertifications] = useState<Certification[]>(trainer.certifications.map(c => ({ ...c })));
  const [workHistory, setWorkHistory] = useState<WorkHistory[]>(trainer.workHistory.map(w => ({ ...w })));
  const [regionModal, setRegionModal] = useState(false);
  const [regionStep, setRegionStep] = useState<'city' | 'district' | 'dong'>('city');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => [
    ...(trainer.photos ?? []).map(p => ({ id: p.id, uri: p.uri, type: 'photo' as const })),
    ...(trainer.videos ?? []).map(v => ({ id: v.id, uri: v.uri, type: 'video' as const })),
  ]);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return false;
    }
    return true;
  };

  const handlePickMediaPhoto = async () => {
    if (!(await requestPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaItems(prev => [...prev, {
        id: `photo_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        uri: result.assets[0].uri,
        type: 'photo',
      }]);
    }
  };

  const handlePickMediaVideo = async () => {
    if (!(await requestPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaItems(prev => [...prev, {
        id: `video_${Date.now()}`,
        uri: result.assets[0].uri,
        type: 'video',
      }]);
    }
  };

  const removeMediaItem = (id: string) => {
    setMediaItems(prev => prev.filter(m => m.id !== id));
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }
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

  const toggleGoal = (g: TrainingGoal) => {
    if (goals.includes(g)) {
      setGoals(goals.filter(x => x !== g));
    } else if (goals.length < 2) {
      setGoals([...goals, g]);
    }
  };

  const handleSave = () => {
    if (!tagline.trim()) { Alert.alert('입력 오류', '한줄 소개를 입력해주세요.'); return; }
    if (goals.length === 0) { Alert.alert('입력 오류', '운동 목적을 1개 이상 선택해주세요.'); return; }
    updateTrainer({
      profileImageUrl,
      tagline: tagline.trim(),
      bio: bio.trim(),
      gender,
      experienceYears: parseInt(experienceYears) || 0,
      sessionPrice: parseInt(sessionPrice) || 0,
      address: { city, district, dong },
      trainingGoals: goals,
      certifications,
      workHistory,
      photos: mediaItems.filter(m => m.type === 'photo').map(({ id, uri }) => ({ id, uri })),
      videos: mediaItems.filter(m => m.type === 'video').map(({ id, uri }) => ({ id, uri })),
    });
    if (Platform.OS === 'web') {
      window.alert('수정이 완료되었습니다');
      router.replace('/(trainer)/profile' as any);
    } else {
      Alert.alert('수정이 완료되었습니다', '', [
        { text: '확인', onPress: () => router.replace('/(trainer)/profile' as any) },
      ]);
    }
  };

  const addCert = () => setCertifications([...certifications, { id: `cert_new_${Date.now()}`, name: '', issuer: '', issuedDate: '', verified: false }]);
  const updateCert = (idx: number, field: keyof Certification, value: string) => {
    const next = [...certifications]; next[idx] = { ...next[idx], [field]: value }; setCertifications(next);
  };
  const removeCert = (idx: number) => setCertifications(certifications.filter((_, i) => i !== idx));

  const addWork = () => setWorkHistory([...workHistory, { id: `work_new_${Date.now()}`, gymName: '', position: '', startDate: '', endDate: '' }]);
  const updateWork = (idx: number, field: keyof WorkHistory, value: string) => {
    const next = [...workHistory]; next[idx] = { ...next[idx], [field]: value }; setWorkHistory(next);
  };
  const removeWork = (idx: number) => setWorkHistory(workHistory.filter((_, i) => i !== idx));

  const regionLabel = [city, district, dong].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={styles.container}>
      {/* 네비게이션 바 */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.replace('/(trainer)/profile' as any)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
            <Image
              source={{ uri: profileImageUrl || 'https://picsum.photos/seed/default/200/200' }}
              style={styles.profilePhoto}
            />
            <View style={styles.photoEditBadge}>
              <MaterialCommunityIcons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>사진을 눌러 변경하세요</Text>
        </View>

        {/* ── 한줄 소개 ── */}
        <Text style={styles.groupLabel}>한줄 소개</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.taglineInput}
            value={tagline}
            onChangeText={setTagline}
            placeholder="임팩트 있는 한줄 소개를 입력하세요"
            placeholderTextColor={COLORS.textSecondary}
            maxLength={30}
          />
          <Text style={styles.charCount}>{tagline.length}/30</Text>
        </View>

        {/* ── 기본 정보 ── */}
        <Text style={styles.groupLabel}>기본 정보</Text>
        <View style={styles.card}>
          {/* 성별 */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>성별</Text>
            <View style={styles.genderWrap}>
              {(['male', 'female'] as const).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderPill, gender === g && styles.genderPillActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.genderPillText, gender === g && styles.genderPillTextActive]}>
                    {g === 'male' ? '남성' : '여성'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.divider} />

          {/* 경력 */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>경력</Text>
            <View style={styles.rowRight}>
              <TextInput
                style={styles.rowNumInput}
                value={experienceYears}
                onChangeText={setExperienceYears}
                keyboardType="number-pad"
                textAlign="right"
              />
              <Text style={styles.rowUnit}>년</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* 1회 가격 */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>1회 가격</Text>
            <View style={styles.rowRight}>
              <TextInput
                style={styles.rowNumInput}
                value={sessionPrice}
                onChangeText={setSessionPrice}
                keyboardType="number-pad"
                textAlign="right"
              />
              <Text style={styles.rowUnit}>원</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* 활동 지역 */}
          <TouchableOpacity style={styles.row} onPress={() => { setRegionStep('city'); setRegionModal(true); }} activeOpacity={0.6}>
            <Text style={styles.rowLabel}>활동 지역</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{regionLabel || '선택하세요'}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 트레이너 소개 ── */}
        <Text style={styles.groupLabel}>트레이너 소개</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.bioInput}
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="트레이너 소개글을 작성해주세요"
            placeholderTextColor={COLORS.textSecondary}
            textAlignVertical="top"
          />
        </View>

        {/* ── 소개 사진·동영상 ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.groupLabel}>소개 사진 · 동영상</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity style={styles.addBtn} onPress={handlePickMediaPhoto}>
              <MaterialCommunityIcons name="image-plus" size={14} color={COLORS.primary} />
              <Text style={styles.addBtnText}>사진</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handlePickMediaVideo}>
              <MaterialCommunityIcons name="video-plus" size={14} color={COLORS.primary} />
              <Text style={styles.addBtnText}>동영상</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.mediaGrid}>
          {mediaItems.map(item => (
            <View key={item.id} style={styles.mediaThumbnailWrap}>
              <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} />
              {item.type === 'video' && (
                <View style={styles.videoOverlay}>
                  <MaterialCommunityIcons name="play-circle" size={28} color="rgba(255,255,255,0.9)" />
                </View>
              )}
              <TouchableOpacity
                style={styles.mediaRemoveBtn}
                onPress={() => removeMediaItem(item.id)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {mediaItems.length === 0 && (
            <View style={styles.mediaEmpty}>
              <MaterialCommunityIcons name="image-plus" size={28} color={COLORS.border} />
              <Text style={styles.emptyText}>사진·동영상을 추가하세요</Text>
            </View>
          )}
        </View>

        {/* ── 운동 목적 ── */}
        <Text style={styles.groupLabel}>운동 목적 <Text style={styles.groupSub}>(최대 2개)</Text></Text>
        <View style={styles.card}>
          <View style={styles.chipGrid}>
            {ALL_GOALS.map(g => {
              const active = goals.includes(g);
              const disabled = !active && goals.length >= 2;
              return (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
                  onPress={() => !disabled && toggleGoal(g)}
                  activeOpacity={disabled ? 1 : 0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── 자격증 ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.groupLabel} >자격증</Text>
          <TouchableOpacity style={styles.addBtn} onPress={addCert}>
            <MaterialCommunityIcons name="plus" size={14} color={COLORS.primary} />
            <Text style={styles.addBtnText}>추가</Text>
          </TouchableOpacity>
        </View>
        {certifications.length === 0 && (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="certificate-outline" size={28} color={COLORS.border} />
            <Text style={styles.emptyText}>자격증을 추가해주세요</Text>
          </View>
        )}
        {certifications.map((cert, idx) => (
          <View key={cert.id} style={styles.card}>
            <View style={styles.itemHeader}>
              <MaterialCommunityIcons name="certificate-outline" size={15} color={COLORS.primary} />
              <Text style={styles.itemNum}>자격증 {idx + 1}</Text>
              <TouchableOpacity onPress={() => removeCert(idx)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="close" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.itemInputLarge}
              value={cert.name}
              onChangeText={v => updateCert(idx, 'name', v)}
              placeholder="자격증 이름"
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={styles.itemRow}>
              <TextInput
                style={[styles.itemInputSmall, { flex: 1 }]}
                value={cert.issuer}
                onChangeText={v => updateCert(idx, 'issuer', v)}
                placeholder="발급 기관"
                placeholderTextColor={COLORS.textSecondary}
              />
              <TextInput
                style={[styles.itemInputSmall, { width: 110 }]}
                value={cert.issuedDate}
                onChangeText={v => updateCert(idx, 'issuedDate', v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>
        ))}

        {/* ── 경력 사항 ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.groupLabel}>경력 사항</Text>
          <TouchableOpacity style={styles.addBtn} onPress={addWork}>
            <MaterialCommunityIcons name="plus" size={14} color={COLORS.primary} />
            <Text style={styles.addBtnText}>추가</Text>
          </TouchableOpacity>
        </View>
        {workHistory.length === 0 && (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="briefcase-outline" size={28} color={COLORS.border} />
            <Text style={styles.emptyText}>경력을 추가해주세요</Text>
          </View>
        )}
        {workHistory.map((w, idx) => (
          <View key={w.id} style={styles.card}>
            <View style={styles.itemHeader}>
              <MaterialCommunityIcons name="briefcase-outline" size={15} color={COLORS.secondary} />
              <Text style={[styles.itemNum, { color: COLORS.secondary }]}>경력 {idx + 1}</Text>
              <TouchableOpacity onPress={() => removeWork(idx)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="close" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.itemInputLarge}
              value={w.gymName}
              onChangeText={v => updateWork(idx, 'gymName', v)}
              placeholder="헬스장 / 기관명"
              placeholderTextColor={COLORS.textSecondary}
            />
            <TextInput
              style={styles.itemInputMid}
              value={w.position}
              onChangeText={v => updateWork(idx, 'position', v)}
              placeholder="직책 / 포지션"
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={styles.itemRow}>
              <TextInput
                style={[styles.itemInputSmall, { flex: 1 }]}
                value={w.startDate}
                onChangeText={v => updateWork(idx, 'startDate', v)}
                placeholder="시작 YYYY-MM"
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={styles.periodSep}>~</Text>
              <TextInput
                style={[styles.itemInputSmall, { flex: 1 }]}
                value={w.endDate ?? ''}
                onChangeText={v => updateWork(idx, 'endDate', v)}
                placeholder="종료 (없으면 현재)"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 지역 선택 모달 */}
      <Modal visible={regionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {regionStep === 'city' && <>
              <Text style={styles.modalTitle}>시 / 도</Text>
              <ScrollView>
                {CITIES.map(c => (
                  <TouchableOpacity key={c} style={styles.modalRow} onPress={() => { setCity(c); setDistrict(''); setDong(''); setRegionStep('district'); }}>
                    <Text style={[styles.modalRowText, city === c && styles.modalRowActive]}>{c}</Text>
                    {city === c && <MaterialCommunityIcons name="check" size={18} color={COLORS.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>}
            {regionStep === 'district' && <>
              <Text style={styles.modalTitle}>{city} · 구 / 군</Text>
              <ScrollView>
                {Object.keys(REGION_DATA[city] ?? {}).map(d => (
                  <TouchableOpacity key={d} style={styles.modalRow} onPress={() => { setDistrict(d); setDong(''); setRegionStep('dong'); }}>
                    <Text style={[styles.modalRowText, district === d && styles.modalRowActive]}>{d}</Text>
                    {district === d && <MaterialCommunityIcons name="check" size={18} color={COLORS.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>}
            {regionStep === 'dong' && <>
              <Text style={styles.modalTitle}>{district} · 동</Text>
              <ScrollView>
                {(REGION_DATA[city]?.[district] ?? []).map(d => (
                  <TouchableOpacity key={d} style={styles.modalRow} onPress={() => { setDong(d); setRegionModal(false); }}>
                    <Text style={[styles.modalRowText, dong === d && styles.modalRowActive]}>{d}</Text>
                    {dong === d && <MaterialCommunityIcons name="check" size={18} color={COLORS.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>}
            <TouchableOpacity style={styles.modalClose} onPress={() => setRegionModal(false)}>
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  /* 네비 바 */
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  navCancel: { fontSize: 16, color: COLORS.textSecondary },
  navTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  navSave: { fontSize: 16, fontWeight: '700', color: COLORS.primary },

  scroll: { paddingTop: 24, paddingHorizontal: 16 },

  /* 프로필 사진 */
  photoSection: { alignItems: 'center', marginBottom: 28 },
  photoWrapper: { position: 'relative' },
  profilePhoto: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.border },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  photoHint: { marginTop: 8, fontSize: 12, color: COLORS.textSecondary },

  /* 그룹 레이블 */
  groupLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, marginLeft: 4, letterSpacing: 0.3 },
  groupSub: { fontSize: 12, fontWeight: '400', color: COLORS.textSecondary },

  /* 공통 카드 */
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },

  /* 한줄 소개 */
  taglineInput: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    fontStyle: 'italic',
  },
  charCount: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'right', paddingHorizontal: 16, paddingBottom: 12 },

  /* 설정 row */
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowNumInput: { fontSize: 15, fontWeight: '600', color: COLORS.text, minWidth: 40, textAlign: 'right' },
  rowUnit: { fontSize: 14, color: COLORS.textSecondary },
  rowValue: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginLeft: 16 },

  /* 성별 토글 */
  genderWrap: { flexDirection: 'row', gap: 6 },
  genderPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  genderPillActive: { backgroundColor: COLORS.primary },
  genderPillText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  genderPillTextActive: { color: '#fff' },

  /* bio */
  bioInput: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    minHeight: 120,
    padding: 16,
    textAlignVertical: 'top',
  },

  /* 전문분야 칩 */
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipDisabled: { opacity: 0.3 },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#fff' },

  /* 섹션 헤더 (자격증/경력) */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginLeft: 4, marginRight: 0 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(91,95,214,0.1)',
    marginBottom: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  /* 빈 상태 */
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 20,
  },
  emptyText: { fontSize: 13, color: COLORS.textSecondary },

  /* 자격증/경력 카드 내부 */
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  itemNum: { fontSize: 13, fontWeight: '700', color: COLORS.primary, flex: 1 },
  itemInputLarge: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  itemInputMid: {
    fontSize: 13,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  itemInputSmall: { fontSize: 13, color: COLORS.textSecondary },
  periodSep: { fontSize: 13, color: COLORS.textSecondary },

  /* 소개 미디어 그리드 */
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  mediaThumbnailWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: 'visible',
  },
  mediaThumbnail: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    backgroundColor: COLORS.border,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
  },
  mediaEmpty: {
    flex: 1,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },

  /* 지역 모달 */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 16,
    maxHeight: '72%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, paddingHorizontal: 20, paddingVertical: 14 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  modalRowText: { fontSize: 15, color: COLORS.text },
  modalRowActive: { color: COLORS.primary, fontWeight: '700' },
  modalClose: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
});
