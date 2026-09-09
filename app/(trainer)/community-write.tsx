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
import { useCommunityStore } from '../../store/communityStore';
import { useAuthStore } from '../../store/authStore';
import { uploadMedia, isLocalUri, canUpload } from '../../utils/upload';
import { notify } from '../../utils/alert';
import VideoPlayer from '../../components/VideoPlayer';

const MAX_IMAGES = 5;

// "#오운완 #스쿼트" → ['오운완', '스쿼트'] (#·공백·쉼표로 구분, 중복 제거)
const parseTags = (raw: string) =>
  Array.from(new Set(raw.split(/[s,#]+/).map((t) => t.trim()).filter(Boolean)));

export default function CommunityWriteScreen() {
  const router = useRouter();
  const { t, from, mode } = useLocalSearchParams<{ t: string; from?: string; mode?: string }>();
  const { trainer } = useAuthStore();
  const { addPost } = useCommunityStore();

  const [tagText, setTagText] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<'image' | 'video'>(mode === 'video' ? 'video' : 'image');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  // 캐러셀 한 장 폭. 앱이 430px 컨테이너라 창 크기로 재면 어긋난다.
  const [stageW, setStageW] = useState(0);

  const hashtags = parseTags(tagText);
  // 사진이나 동영상 없이는 글을 올릴 수 없다
  const hasMedia = mediaType === 'image' ? images.length > 0 : !!videoUri;
  const canSubmit =
    hashtags.length > 0 && title.trim().length > 0 && content.trim().length > 0 && hasMedia;

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

  const handleSubmit = async () => {
    if (!canSubmit) return;
    // 첨부 사진을 Storage에 올린다(로컬 uri를 그대로 저장하면 남에게 안 보인다).
    let imgUrl = images[0];
    if (isLocalUri(imgUrl) && canUpload(trainer?.id)) {
      const up = await uploadMedia(imgUrl, 'posts', trainer!.id);
      if (!up) { notify('사진 업로드 실패', '사진을 저장하지 못했습니다.'); return; }
      imgUrl = up;
    }

    // 동영상도 Storage에 올린다. 예전엔 videoUri를 버리고 picsum 랜덤 사진으로 대체해서,
    // 사용자가 올린 영상이 사라지고 엉뚱한 이미지가 표시됐다.
    let vidUrl: string | undefined;
    if (mediaType === 'video' && videoUri) {
      if (!canUpload(trainer?.id)) { notify('동영상 업로드 불가', '로그인 후 이용해주세요.'); return; }
      const upv = await uploadMedia(videoUri, 'posts', trainer!.id);
      if (!upv) { notify('동영상 업로드 실패', '동영상을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.'); return; }
      vidUrl = upv;
    }
    addPost({
      hashtags,
      title: title.trim(),
      content: content.trim(),
      author: trainer?.name ?? '익명',
      authorId: trainer?.id,
      authorAvatar: trainer?.profileImageUrl,
      location: trainer?.address?.district ?? '알 수 없음',
      imageUrl: mediaType === 'video' ? undefined : imgUrl,
      isVideo: mediaType === 'video',
      videoUrl: vidUrl,
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

        {/* 고정 미디어 무대 — 글을 쓰는 동안 스크롤해도 사라지지 않는다 */}
        <View style={styles.stage} onLayout={(e) => setStageW(e.nativeEvent.layout.width)}>
          {mediaType === 'video' ? (
            videoUri ? (
              <>
                <VideoPlayer uri={videoUri} isPlaying muted />
                <TouchableOpacity
                  style={styles.stageRemove}
                  onPress={() => setVideoUri(null)}
                  accessibilityRole="button"
                  accessibilityLabel="동영상 삭제"
                >
                  <MaterialCommunityIcons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.stagePick} onPress={pickVideo}>
                <MaterialCommunityIcons name="video-plus" size={34} color={COLORS.textSecondary} />
                <Text style={styles.stagePickText}>동영상 추가</Text>
                <Text style={styles.stagePickSub}>스토리 탭에 노출됩니다</Text>
              </TouchableOpacity>
            )
          ) : images.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {images.map((uri, idx) => (
                <View key={uri + idx} style={[styles.stagePage, { width: stageW }]}>
                  <Image source={{ uri }} style={styles.stageImg} resizeMode="contain" />
                  <TouchableOpacity
                    style={styles.stageRemove}
                    onPress={() => removeImage(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`사진 ${idx + 1} 삭제`}
                  >
                    <MaterialCommunityIcons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.stageCount}>
                    <Text style={styles.stageCountText}>{idx + 1}/{images.length}</Text>
                  </View>
                </View>
              ))}
              {images.length < MAX_IMAGES && (
                <TouchableOpacity style={[styles.stagePage, { width: stageW }]} onPress={pickImages}>
                  <MaterialCommunityIcons name="image-plus" size={34} color={COLORS.textSecondary} />
                  <Text style={styles.stagePickText}>사진 추가</Text>
                  <Text style={styles.stagePickSub}>{images.length}/{MAX_IMAGES}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            <TouchableOpacity style={styles.stagePick} onPress={pickImages}>
              <MaterialCommunityIcons name="image-plus" size={34} color={COLORS.textSecondary} />
              <Text style={styles.stagePickText}>사진 추가</Text>
              <Text style={styles.stagePickSub}>최대 {MAX_IMAGES}장</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 유형 토글 — 무대 바로 아래 고정 */}
        <View style={styles.typeBar}>
          <TouchableOpacity
            style={[styles.mediaTypeBtn, styles.typeBtnSlim, mediaType === 'image' && styles.mediaTypeBtnActive]}
            onPress={() => { setMediaType('image'); setVideoUri(null); }}
          >
            <MaterialCommunityIcons name="image-multiple" size={16} color={mediaType === 'image' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.mediaTypeText, mediaType === 'image' && styles.mediaTypeTextActive]}>사진</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mediaTypeBtn, styles.typeBtnSlim, mediaType === 'video' && styles.mediaTypeBtnActive]}
            onPress={() => { setMediaType('video'); setImages([]); }}
          >
            <MaterialCommunityIcons name="video" size={16} color={mediaType === 'video' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.mediaTypeText, mediaType === 'video' && styles.mediaTypeTextActive]}>동영상</Text>
          </TouchableOpacity>
          {!hasMedia && <Text style={styles.typeHint}>사진 또는 동영상을 1개 이상 올려주세요</Text>}
        </View>

        <ScrollView key={t} style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* 해시태그 */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>해시태그</Text>
              <Text style={styles.required}>*</Text>
              {hashtags.length === 0 && <Text style={styles.labelHint}>최소 1개 입력해주세요</Text>}
              <View style={styles.labelSpacer} />
              <Text style={styles.charCount}>{hashtags.length}개</Text>
            </View>
            <TextInput
              style={styles.titleInput}
              placeholder="#오운완 #스쿼트 (띄어쓰기로 구분)"
              placeholderTextColor={COLORS.textSecondary}
              value={tagText}
              onChangeText={setTagText}
              autoCapitalize="none"
            />
            {hashtags.length > 0 && (
              <View style={styles.tagPreview}>
                {hashtags.map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
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
    paddingHorizontal: 16, paddingVertical: 8,
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

  tagPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.primaryPale,
  },
  tagChipText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

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

  mediaTypeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  mediaTypeBtnActive: { borderColor: COLORS.secondary, backgroundColor: COLORS.secondary + '10' },
  mediaTypeText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  mediaTypeTextActive: { color: COLORS.secondary },


  stage: { height: 220, backgroundColor: '#0f0f10' },
  stagePage: { height: 220, alignItems: 'center', justifyContent: 'center', gap: 4 },
  stageImg: { width: '100%', height: '100%' },
  stagePick: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  stagePickText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  stagePickSub: { fontSize: 11, color: COLORS.textSecondary },
  stageRemove: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, padding: 5,
  },
  stageCount: {
    position: 'absolute', bottom: 10, right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  stageCountText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  typeBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  // flex: 1 은 flexBasis: 0% 까지 넣어서 버튼이 밑넓이를 못 가진다.
  // basis 를 auto 로 돌려놔야 글자 폭만큼 잡히고 세로로 안 쪼개진다.
  typeBtnSlim: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', paddingHorizontal: 14, paddingVertical: 7 },
  typeHint: { fontSize: 11, color: '#E53935', flex: 1, flexShrink: 1 },
});
