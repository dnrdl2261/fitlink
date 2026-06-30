import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, Platform,
  KeyboardAvoidingView, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../utils/constants';
import { useReviewStore } from '../../store/reviewStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

const MAX_IMAGES = 5;

const RATING_LABELS = ['', '별로예요', '그저 그래요', '좋아요', '아주 좋아요', '최고예요'];

export default function ReviewWriteScreen() {
  const router = useRouter();
  const { trainerId, trainerName, bookingId } = useLocalSearchParams<{
    trainerId: string;
    trainerName: string;
    bookingId: string;
  }>();
  const { member } = useAuthStore();
  const { addReview } = useReviewStore();
  const { addNotification } = useNotificationStore();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const canSubmit = rating > 0 && comment.trim().length > 0;

  const requestPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return false;
      }
    }
    return true;
  };

  const pickImages = async () => {
    if (!(await requestPermission())) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      const msg = `사진은 최대 ${MAX_IMAGES}장까지 추가할 수 있습니다.`;
      Platform.OS === 'web' ? alert(msg) : Alert.alert('알림', msg);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_IMAGES));
    }
  };

  const pickVideo = async () => {
    if (!(await requestPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
    });
    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit || !trainerId || !bookingId) return;
    const ts = Date.now();
    addReview({
      trainerId,
      trainerName: trainerName ?? '',
      bookingId,
      memberId: member?.id ?? 'member_001',
      memberName: member?.name ?? '회원',
      memberAvatar: member?.profileImageUrl,
      rating,
      comment: comment.trim(),
      media: [
        ...images.map((uri, i) => ({ id: `img_${ts}_${i}`, type: 'image' as const, uri })),
        ...(videoUri ? [{ id: `vid_${ts}`, type: 'video' as const, uri: videoUri }] : []),
      ],
    });
    addNotification({
      type: 'review_received', targetRole: 'trainer', userId: trainerId,
      title: '새 후기가 등록되었습니다',
      body: `${member?.name ?? '회원'}님이 ★${rating} 후기를 남겼습니다: "${comment.trim().slice(0, 30)}${comment.trim().length > 30 ? '...' : ''}"`,
    });
    const msg = '후기가 등록되었습니다!';
    if (Platform.OS === 'web') {
      alert(msg);
      router.back();
    } else {
      Alert.alert('완료', msg, [{ text: '확인', onPress: () => router.back() }]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerSideBtn}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{trainerName} 트레이너 후기</Text>
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>등록</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* 별점 */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingQuestion}>트레이너는 어떠셨나요?</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7} style={styles.starBtn}>
                  <Text style={[styles.starText, rating >= star && styles.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingLabel}>
              {rating > 0 ? RATING_LABELS[rating] : '별점을 선택해주세요'}
            </Text>
          </View>

          {/* 후기 내용 */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>후기 내용 <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.textInput}
              placeholder="PT 수업 경험을 자세히 알려주세요.&#10;(운동 방식, 트레이너의 설명, 효과 등)"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={5}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}자</Text>
          </View>

          {/* 미디어 첨부 */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>사진 · 동영상 첨부 <Text style={styles.optional}>(선택)</Text></Text>

            <View style={styles.mediaButtons}>
              <TouchableOpacity style={styles.mediaPickBtn} onPress={pickImages} activeOpacity={0.7}>
                <MaterialCommunityIcons name="image-plus" size={22} color={COLORS.primary} />
                <Text style={styles.mediaPickText}>사진 추가</Text>
                <Text style={styles.mediaPickCount}>{images.length}/{MAX_IMAGES}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaPickBtn, videoUri && styles.mediaPickBtnActive]}
                onPress={videoUri ? () => setVideoUri(null) : pickVideo}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={videoUri ? 'close-circle-outline' : 'video-plus'}
                  size={22}
                  color={videoUri ? COLORS.error : COLORS.primary}
                />
                <Text style={[styles.mediaPickText, videoUri && { color: COLORS.error }]}>
                  {videoUri ? '동영상 제거' : '동영상 추가'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 이미지 미리보기 */}
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewScroll} contentContainerStyle={styles.previewScrollContent}>
                {images.map((uri, idx) => (
                  <View key={idx} style={styles.imageThumbWrap}>
                    <Image source={{ uri }} style={styles.imageThumb} />
                    <TouchableOpacity
                      style={styles.thumbRemoveBtn}
                      onPress={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <MaterialCommunityIcons name="close-circle" size={22} color="#fff" />
                    </TouchableOpacity>
                    {idx === 0 && (
                      <View style={styles.thumbBadge}>
                        <Text style={styles.thumbBadgeText}>대표</Text>
                      </View>
                    )}
                  </View>
                ))}
                {images.length < MAX_IMAGES && (
                  <TouchableOpacity style={styles.addMoreBtn} onPress={pickImages} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="plus" size={28} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            {/* 동영상 미리보기 */}
            {videoUri && (
              <View style={styles.videoPreviewWrap}>
                <View style={styles.videoThumb}>
                  <MaterialCommunityIcons name="play-circle" size={44} color="rgba(255,255,255,0.9)" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.videoLabel}>동영상 첨부됨</Text>
                  <Text style={styles.videoSub}>탭하여 변경하거나 '동영상 제거' 버튼으로 삭제</Text>
                </View>
                <TouchableOpacity onPress={pickVideo} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="pencil-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
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
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerSideBtn: { minWidth: 48, paddingVertical: 4 },
  cancelText: { fontSize: 15, color: COLORS.textSecondary },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.text },
  submitBtn: {
    minWidth: 48, paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: COLORS.primary, borderRadius: 20, alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: COLORS.border },
  submitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  submitTextDisabled: { color: COLORS.textMuted },

  content: { padding: 16, gap: 14 },

  ratingSection: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  ratingQuestion: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  starRow: { flexDirection: 'row', gap: 8 },
  starBtn: { padding: 4 },
  starText: { fontSize: 40, color: COLORS.border },
  starActive: { color: '#FFB300' },
  ratingLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', height: 20 },

  sectionCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 16, gap: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  required: { color: COLORS.error },
  optional: { fontSize: 12, fontWeight: '400', color: COLORS.textMuted },
  textInput: {
    minHeight: 120, backgroundColor: COLORS.background,
    borderRadius: 10, padding: 12,
    fontSize: 14, color: COLORS.text, lineHeight: 22,
    borderWidth: 1, borderColor: COLORS.border,
  },
  charCount: { fontSize: 12, color: COLORS.textMuted, textAlign: 'right' },

  mediaButtons: { flexDirection: 'row', gap: 10 },
  mediaPickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  mediaPickBtnActive: { borderColor: COLORS.error + '60', backgroundColor: COLORS.error + '08' },
  mediaPickText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  mediaPickCount: { fontSize: 12, color: COLORS.textSecondary },

  previewScroll: { marginTop: 4 },
  previewScrollContent: { gap: 8, paddingVertical: 4 },
  imageThumbWrap: { position: 'relative', width: 90, height: 90 },
  imageThumb: { width: 90, height: 90, borderRadius: 10, backgroundColor: COLORS.surfaceElevated },
  thumbRemoveBtn: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 11,
  },
  thumbBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: COLORS.primary, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  thumbBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  addMoreBtn: {
    width: 90, height: 90, borderRadius: 10,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },

  videoPreviewWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1, borderColor: COLORS.border,
  },
  videoThumb: {
    width: 64, height: 64, borderRadius: 10,
    backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center',
  },
  videoLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  videoSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});
