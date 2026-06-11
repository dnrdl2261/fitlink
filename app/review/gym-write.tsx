import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../utils/constants';
import { useReviewStore } from '../../store/reviewStore';
import { useAuthStore } from '../../store/authStore';

const RATING_LABELS = ['', '별로예요', '그저 그래요', '좋아요', '아주 좋아요', '최고예요'];

export default function GymReviewWriteScreen() {
  const router = useRouter();
  const { gymId, gymName } = useLocalSearchParams<{ gymId: string; gymName: string }>();
  const { member } = useAuthStore();
  const { addGymReview } = useReviewStore();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const canSubmit = rating > 0 && comment.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit || !gymId) return;
    addGymReview({
      gymId,
      gymName: gymName ?? '',
      memberId: member?.id ?? 'member_001',
      memberName: member?.name ?? '회원',
      memberAvatar: member?.profileImageUrl,
      rating,
      comment: comment.trim(),
    });
    const msg = '헬스장 리뷰가 등록되었습니다!';
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

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerSideBtn}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{gymName} 리뷰</Text>
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>등록</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.ratingSection}>
            <Text style={styles.ratingQuestion}>헬스장은 어떠셨나요?</Text>
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

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>리뷰 내용 <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.textInput}
              placeholder="헬스장 이용 경험을 알려주세요.&#10;(시설, 청결도, 서비스 등)"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={5}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}자</Text>
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
  textInput: {
    minHeight: 120, backgroundColor: COLORS.background,
    borderRadius: 10, padding: 12,
    fontSize: 14, color: COLORS.text, lineHeight: 22,
    borderWidth: 1, borderColor: COLORS.border,
  },
  charCount: { fontSize: 12, color: COLORS.textMuted, textAlign: 'right' },
});
