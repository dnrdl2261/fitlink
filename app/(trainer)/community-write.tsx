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
import { FeedCat, FEED_CATS, CAT_COLOR } from '../../data/community';
import { useCommunityStore } from '../../store/communityStore';
import { useAuthStore } from '../../store/authStore';

const WRITE_CATS = FEED_CATS.filter((c) => c !== '전체') as Exclude<FeedCat, '전체'>[];
const MAX_IMAGES = 5;

export default function CommunityWriteScreen() {
  const router = useRouter();
  const { t, from } = useLocalSearchParams<{ t: string; from?: string }>();
  const { trainer } = useAuthStore();
  const { addPost } = useCommunityStore();

  const [category, setCategory] = useState<Exclude<FeedCat, '전체'> | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const canSubmit = !!category && title.trim().length > 0 && content.trim().length > 0;

  const pickImages = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }
    }
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      const msg = `사진은 최대 ${MAX_IMAGES}장까지 추가할 수 있습니다.`;
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('알림', msg);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, MAX_IMAGES));
    }
  };

  const pickVideo = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
    });
    if (!result.canceled) setVideoUri(result.assets[0].uri);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (mediaType === 'video' && !videoUri) {
      if (Platform.OS === 'web') { alert('동영상을 추가해주세요.'); }
      else { Alert.alert('알림', '동영상을 추가해주세요.'); }
      return;
    }
    addPost({
      category: category!,
      title: title.trim(),
      content: content.trim(),
      author: trainer?.name ?? '익명',
      authorId: trainer?.id,
      authorAvatar: trainer?.profileImageUrl,
      location: trainer?.address?.district ?? '알 수 없음',
      imageUrl: mediaType === 'video'
        ? `https://picsum.photos/seed/vid${Date.now()}/400/225`
        : images[0],
      isVideo: mediaType === 'video',
    });

    if (Platform.OS === 'web') {
      alert('게시글이 등록됐습니다!');
    } else {
      Alert.alert('완료', '게시글이 등록됐습니다!');
    }
    router.navigate({ pathname: '/(trainer)/community', params: from ? { from } : {} } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.navigate({ pathname: '/(trainer)/community', params: from ? { from } : {} } as any)} style={styles.headerBtn}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>글쓰기</Text>
            <View style={styles.authorChip}>
              <MaterialCommunityIcons name="account-circle" size={13} color={COLORS.textSecondary} />
              <Text style={styles.authorChipText}>
                {trainer?.name ?? '익명'} · {trainer?.address?.district ?? '위치 미설정'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>등록</Text>
          </TouchableOpacity>
        </View>

        <ScrollView key={t} style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* 카테고리 */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>카테고리</Text>
              <Text style={styles.required}>*</Text>
              {!category && <Text style={styles.labelHint}>분류를 선택해주세요</Text>}
            </View>
            <View style={styles.catGrid}>
              {WRITE_CATS.map((cat) => {
                const color = CAT_COLOR[cat] ?? '#888';
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

          {/* 제목 */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>제목</Text>
              <Text style={styles.required}>*</Text>
              <View style={styles.labelSpacer} />
              <Text style={styles.charCount}>{title.length}/100</Text>
            </View>
            <TextInput
              style={styles.titleInput}
              placeholder="제목을 입력하세요"
              placeholderTextColor={COLORS.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* 내용 */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>내용</Text>
              <Text style={styles.required}>*</Text>
              <View style={styles.labelSpacer} />
              <Text style={styles.charCount}>{content.length}/2000</Text>
            </View>
            <TextInput
              style={styles.contentInput}
              placeholder="내용을 입력하세요"
              placeholderTextColor={COLORS.textSecondary}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />
          </View>

          {/* 미디어 첨부 (통합) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>미디어 첨부</Text>
            <View style={styles.mediaTypeRow}>
              <TouchableOpacity
                style={[styles.mediaTypeBtn, mediaType === 'image' && styles.mediaTypeBtnActive]}
                onPress={() => { setMediaType('image'); setVideoUri(null); }}
              >
                <MaterialCommunityIcons
                  name="image-multiple" size={16}
                  color={mediaType === 'image' ? COLORS.secondary : COLORS.textSecondary}
                />
                <Text style={[styles.mediaTypeText, mediaType === 'image' && styles.mediaTypeTextActive]}>
                  사진 (최대 {MAX_IMAGES}장)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaTypeBtn, mediaType === 'video' && styles.mediaTypeBtnActive]}
                onPress={() => { setMediaType('video'); setImages([]); }}
              >
                <MaterialCommunityIcons
                  name="video" size={16}
                  color={mediaType === 'video' ? COLORS.secondary : COLORS.textSecondary}
                />
                <Text style={[styles.mediaTypeText, mediaType === 'video' && styles.mediaTypeTextActive]}>
                  동영상 (쇼츠)
                </Text>
              </TouchableOpacity>
            </View>

            {mediaType === 'image' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                <View style={styles.photoRow}>
                  {images.map((uri, idx) => (
                    <View key={uri + idx} style={styles.thumbWrap}>
                      <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(idx)}>
                        <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <TouchableOpacity style={styles.addMediaBtn} onPress={pickImages}>
                      <MaterialCommunityIcons name="image-plus" size={28} color={COLORS.textSecondary} />
                      <Text style={styles.addMediaText}>사진 추가</Text>
                      <Text style={styles.addMediaSub}>{images.length}/{MAX_IMAGES}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}

            {mediaType === 'video' && (
              <View style={styles.photoRow}>
                {videoUri ? (
                  <View style={styles.thumbWrap}>
                    <View style={styles.videoThumb}>
                      <MaterialCommunityIcons name="video-check" size={30} color={COLORS.secondary} />
                      <Text style={[styles.videoThumbText, { color: COLORS.secondary }]}>동영상 선택됨</Text>
                    </View>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => setVideoUri(null)}>
                      <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addMediaBtn} onPress={pickVideo}>
                    <MaterialCommunityIcons name="video-plus" size={28} color={COLORS.textSecondary} />
                    <Text style={styles.addMediaText}>동영상 추가</Text>
                    <Text style={styles.addMediaSub}>스토리 탭에 노출됩니다</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerBtn: { minWidth: 44 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  authorChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  authorChipText: { fontSize: 11, color: COLORS.textSecondary },
  cancelText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '500' },
  submitBtn: {
    backgroundColor: COLORS.secondary,
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
  labelHint: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 4 },
  labelSpacer: { flex: 1 },
  charCount: { fontSize: 12, color: COLORS.textSecondary },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  catChipText: { fontSize: 13, fontWeight: '700' },

  titleInput: {
    fontSize: 16, color: COLORS.text,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingVertical: 8,
  },

  contentInput: {
    fontSize: 15, color: COLORS.text, lineHeight: 24,
    minHeight: 200, backgroundColor: COLORS.background,
    borderRadius: 12, padding: 14,
  },

  mediaTypeRow: { flexDirection: 'row', gap: 10 },
  mediaTypeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  mediaTypeBtnActive: { borderColor: COLORS.secondary, backgroundColor: COLORS.secondary + '10' },
  mediaTypeText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  mediaTypeTextActive: { color: COLORS.secondary },

  photoScroll: { marginHorizontal: -16, paddingLeft: 16 },
  photoRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 90, height: 90, borderRadius: 10 },
  removeBtn: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
  },
  addMediaBtn: {
    width: 90, height: 90, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 3,
    backgroundColor: COLORS.background,
  },
  addMediaText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  addMediaSub: { fontSize: 10, color: COLORS.border },

  videoThumb: {
    width: 90, height: 90, borderRadius: 10,
    backgroundColor: COLORS.secondary + '15',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  videoThumbText: { fontSize: 10, fontWeight: '600' },
});
