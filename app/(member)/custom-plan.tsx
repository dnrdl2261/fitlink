import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, Image, useWindowDimensions, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MOCK_TRAINERS } from '../../data/trainers';
import { useTrainerStore } from '../../store/trainerStore';
import { useMergedGyms } from '../../hooks/useFilteredGyms';
import { Gym } from '../../types';
import { COLORS } from '../../utils/constants';
import { formatPrice } from '../../utils/formatters';

// ── 설문 단계 정의 ──────────────────────────────────────────
const STEPS = [
  {
    id: 'goal' as const,
    emoji: '🎯',
    title: '운동 목적이\n무엇인가요?',
    subtitle: '해당하는 항목을 모두 선택해 주세요',
    options: [
      '다이어트', '벌크업', '린매스업', '바디프로필',
      '기초체력', '근력향상', '체형교정', '재활운동',
      '산전산후', '웨딩케어', '대회준비', '실버운동',
      '통증관리', '유연성증진',
    ],
  },
  {
    id: 'exercise' as const,
    emoji: '🏋️',
    title: '관심 있는\n운동 종목은요?',
    subtitle: '원하는 종목을 모두 선택해 주세요',
    options: [
      '웨이트트레이닝', '보디빌딩', '파워리프팅',
      '기구필라테스', '매트필라테스', '요가',
      '크로스핏', '기능성운동', '스트레칭',
      '맨몸운동', '재활운동', '통증운동', '시니어운동',
    ],
  },
  {
    id: 'style' as const,
    emoji: '💡',
    title: '선호하는\n트레이닝 스타일은?',
    subtitle: '원하는 스타일을 모두 선택해 주세요',
    options: [
      '식단밀착관리', '멘탈케어', '스파르타',
      '동기부여형', '이론중심', '자세분석',
      '고강도훈련', '저강도훈련', '재활특화',
      '움직임개선', '홈트레이닝가이드', '생활습관교정',
    ],
  },
  {
    id: 'convenience' as const,
    emoji: '✅',
    title: '원하는\n수업 조건이 있나요?',
    subtitle: '편의 조건을 모두 선택해 주세요',
    options: [
      '새벽수업', '심야수업', '주말수업',
      '유동적스케줄', '주차가능', '샤워시설',
      '운동복제공', '개인락커', '예약제운영',
    ],
  },
];

type StepId = typeof STEPS[number]['id'];
type Selections = Record<StepId, string[]>;

function getPrimaryGym(trainer: typeof MOCK_TRAINERS[0], gyms: Gym[]) {
  return gyms.find(g => trainer.partnerGymIds.includes(g.id))?.name ?? null;
}

// 매칭 점수 계산
function calcScore(trainer: typeof MOCK_TRAINERS[0], selections: Selections): number {
  let score = 0;
  const goalMatches = selections.goal.filter(g => trainer.trainingGoals?.includes(g as any)).length;
  const exMatches   = selections.exercise.filter(e => trainer.exerciseTypes?.includes(e as any)).length;
  const styleMatches = selections.style.filter(s => trainer.trainingStyles?.includes(s as any)).length;
  const convMatches = selections.convenience.filter(c => trainer.conveniences?.includes(c as any)).length;
  score = goalMatches * 3 + exMatches * 2 + styleMatches * 2 + convMatches * 1;
  return score;
}

function calcMatchPct(trainer: typeof MOCK_TRAINERS[0], selections: Selections): number {
  const total =
    selections.goal.length * 3 +
    selections.exercise.length * 2 +
    selections.style.length * 2 +
    selections.convenience.length * 1;
  if (total === 0) return 0;
  return Math.min(100, Math.round((calcScore(trainer, selections) / total) * 100));
}

function getMatchedTags(trainer: typeof MOCK_TRAINERS[0], selections: Selections): string[] {
  return [
    ...selections.goal.filter(g => trainer.trainingGoals?.includes(g as any)),
    ...selections.exercise.filter(e => trainer.exerciseTypes?.includes(e as any)),
    ...selections.style.filter(s => trainer.trainingStyles?.includes(s as any)),
  ].slice(0, 4);
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
export default function CustomPlanScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const PHOTO_W = Math.round((width - 48) * 0.38);

  const [stepIdx, setStepIdx] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selections, setSelections] = useState<Selections>({
    goal: [], exercise: [], style: [], convenience: [],
  });

  const currentStep = STEPS[stepIdx];
  const mergedGyms = useMergedGyms();
  const allTrainers = useTrainerStore((s) => s.trainers);

  const toggle = (stepId: StepId, item: string) => {
    setSelections(prev => {
      const cur = prev[stepId];
      return {
        ...prev,
        [stepId]: cur.includes(item) ? cur.filter(x => x !== item) : [...cur, item],
      };
    });
  };

  const handleNext = () => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(s => s + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleBack = () => {
    if (showResult) { setShowResult(false); return; }
    if (stepIdx > 0) { setStepIdx(s => s - 1); return; }
    router.navigate('/(member)/trainers' as any);
  };

  const recommended = useMemo(() => {
    if (!showResult) return [];
    const totalSelected =
      selections.goal.length + selections.exercise.length +
      selections.style.length + selections.convenience.length;

    if (totalSelected === 0) {
      // 아무것도 선택 안 했으면 평점순
      return [...allTrainers].sort((a, b) => b.rating - a.rating).slice(0, 10);
    }

    return [...allTrainers]
      .map(t => ({ trainer: t, score: calcScore(t, selections), pct: calcMatchPct(t, selections) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || b.trainer.rating - a.trainer.rating)
      .slice(0, 10)
      .map(x => x.trainer);
  }, [showResult, selections, allTrainers]);

  // ── 결과 화면 ────────────────────────────────────────────
  if (showResult) {
    return (
      <SafeAreaView style={s.root}>
        {/* 헤더 */}
        <View style={s.header}>
          <TouchableOpacity onPress={handleBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>추천 트레이너</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* 결과 요약 */}
          <View style={s.resultSummary}>
            <Text style={s.resultSummaryEmoji}>🎉</Text>
            <Text style={s.resultSummaryTitle}>
              {recommended.length > 0
                ? `${recommended.length}명의 트레이너를 찾았어요!`
                : '조건에 맞는 트레이너가 없어요'}
            </Text>
            <Text style={s.resultSummaryDesc}>
              선택하신 조건을 기반으로{'\n'}가장 잘 맞는 트레이너를 추천해 드려요
            </Text>
          </View>

          {/* 선택 요약 태그 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.selectedTagScroll}>
            {[...selections.goal, ...selections.exercise, ...selections.style, ...selections.convenience].map(tag => (
              <View key={tag} style={s.selectedTag}>
                <Text style={s.selectedTagText}>{tag}</Text>
              </View>
            ))}
            {[...selections.goal, ...selections.exercise, ...selections.style, ...selections.convenience].length === 0 && (
              <View style={s.selectedTag}>
                <Text style={s.selectedTagText}>조건 없음 · 평점순</Text>
              </View>
            )}
          </ScrollView>

          {/* 트레이너 카드 목록 */}
          {recommended.map((t, rank) => {
            const pct = calcMatchPct(t, selections);
            const matchedTags = getMatchedTags(t, selections);
            const gym = getPrimaryGym(t, mergedGyms);

            return (
              <TouchableOpacity
                key={t.id}
                style={s.resultCard}
                activeOpacity={0.9}
                onPress={() => router.push(`/trainer/${t.id}`)}
              >
                {/* 순위 뱃지 */}
                {rank < 3 && (
                  <View style={[s.rankBadge, rank === 0 && s.rankBadgeGold, rank === 1 && s.rankBadgeSilver, rank === 2 && s.rankBadgeBronze]}>
                    <Text style={s.rankBadgeText}>{rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉'}</Text>
                  </View>
                )}

                {/* 사진 */}
                {t.profileImageUrl ? (
                  <Image source={{ uri: t.profileImageUrl }} style={[s.resultPhoto, { width: PHOTO_W, height: PHOTO_W * 1.25 }]} resizeMode="cover" />
                ) : (
                  <View style={[s.resultPhoto, { width: PHOTO_W, height: PHOTO_W * 1.25, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
                    <MaterialCommunityIcons name="account" size={48} color="#9CA3AF" />
                  </View>
                )}

                {/* 정보 */}
                <View style={s.resultInfo}>
                  <View style={s.resultTopRow}>
                    <Text style={s.resultName}>{t.name} 선생님</Text>
                    {pct > 0 && (
                      <View style={[s.matchBadge, pct >= 70 && s.matchBadgeHigh]}>
                        <Text style={[s.matchBadgeText, pct >= 70 && s.matchBadgeTextHigh]}>
                          {pct}% 매칭
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={s.resultMetaRow}>
                    <MaterialCommunityIcons name="star" size={12} color="#FBBF24" />
                    <Text style={s.resultMeta}>{t.rating.toFixed(1)} ({t.reviewCount})</Text>
                    <Text style={s.resultMetaDot}>·</Text>
                    <Text style={s.resultMeta}>경력 {t.experienceYears}년</Text>
                  </View>

                  {gym && (
                    <View style={s.resultGymRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={11} color="#bbb" />
                      <Text style={s.resultGymText} numberOfLines={1}>{gym}</Text>
                    </View>
                  )}

                  {/* 매칭된 태그 */}
                  {matchedTags.length > 0 && (
                    <View style={s.matchedTagRow}>
                      {matchedTags.map(tag => (
                        <View key={tag} style={s.matchedTag}>
                          <Text style={s.matchedTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={s.resultPrice}>{formatPrice(t.sessionPrice)}/회</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {recommended.length === 0 && (
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>🔍</Text>
              <Text style={s.emptyText}>조건을 바꿔서 다시 검색해 보세요</Text>
              <TouchableOpacity style={s.retryBtn} onPress={() => { setShowResult(false); setStepIdx(0); }}>
                <Text style={s.retryBtnText}>다시 선택하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 설문 화면 ────────────────────────────────────────────
  const selectedInStep = selections[currentStep.id];

  return (
    <SafeAreaView style={s.root}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>맞춤플랜</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 진행바 */}
      <View style={s.progressWrap}>
        {STEPS.map((st, i) => (
          <View
            key={st.id}
            style={[
              s.progressSegment,
              i <= stepIdx ? s.progressSegmentOn : s.progressSegmentOff,
            ]}
          />
        ))}
      </View>

      {/* 질문 */}
      <View style={s.questionBlock}>
        <Text style={s.stepEmoji}>{currentStep.emoji}</Text>
        <Text style={s.stepCount}>{stepIdx + 1} / {STEPS.length}</Text>
        <Text style={s.stepTitle}>{currentStep.title}</Text>
        <Text style={s.stepSubtitle}>{currentStep.subtitle}</Text>
      </View>

      {/* 선택지 */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.chipGrid}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep.options.map(option => {
          const selected = selectedInStep.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[s.chip, selected && s.chipOn]}
              onPress={() => toggle(currentStep.id, option)}
              activeOpacity={0.75}
            >
              {selected && (
                <MaterialCommunityIcons name="check" size={13} color="#fff" />
              )}
              <Text style={[s.chipText, selected && s.chipTextOn]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={s.bottomBar}>
        {selectedInStep.length > 0 && (
          <Text style={s.selectedCount}>{selectedInStep.length}개 선택됨</Text>
        )}
        <View style={s.bottomBtns}>
          <TouchableOpacity
            style={s.skipBtn}
            onPress={handleNext}
          >
            <Text style={s.skipBtnText}>건너뛰기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.nextBtn, selectedInStep.length === 0 && s.nextBtnDim]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={s.nextBtnText}>
              {stepIdx === STEPS.length - 1 ? '트레이너 찾기' : '다음'}
            </Text>
            <MaterialCommunityIcons
              name={stepIdx === STEPS.length - 1 ? 'magnify' : 'arrow-right'}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },

  // 진행바
  progressWrap: { flexDirection: 'row', gap: 4, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  progressSegmentOn: { backgroundColor: COLORS.primary },
  progressSegmentOff: { backgroundColor: '#eee' },

  // 질문
  questionBlock: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8, gap: 6 },
  stepEmoji: { fontSize: 36, marginBottom: 4 },
  stepCount: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  stepTitle: { fontSize: 26, fontWeight: '800', color: '#111', lineHeight: 34 },
  stepSubtitle: { fontSize: 14, color: '#888', marginTop: 4 },

  // 선택지 그리드
  chipGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 10,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 24, borderWidth: 1.5, borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14, color: '#555', fontWeight: '500' },
  chipTextOn: { color: '#fff', fontWeight: '700' },

  // 하단 바
  bottomBar: {
    paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee',
    gap: 10,
  },
  selectedCount: { fontSize: 12, color: COLORS.primary, fontWeight: '600', textAlign: 'center' },
  bottomBtns: { flexDirection: 'row', gap: 10 },
  skipBtn: {
    paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#e0e0e0',
    alignItems: 'center', justifyContent: 'center',
  },
  skipBtnText: { fontSize: 14, color: '#999', fontWeight: '500' },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  nextBtnDim: { opacity: 0.6 },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // 결과 화면
  resultSummary: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24, gap: 8 },
  resultSummaryEmoji: { fontSize: 44 },
  resultSummaryTitle: { fontSize: 20, fontWeight: '800', color: '#111', textAlign: 'center' },
  resultSummaryDesc: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },

  selectedTagScroll: { paddingHorizontal: 16, paddingBottom: 16, gap: 8, flexWrap: 'nowrap' },
  selectedTag: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, backgroundColor: COLORS.primary + '15',
  },
  selectedTagText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  // 결과 카드
  resultCard: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 14,
    borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#eee',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  rankBadge: {
    position: 'absolute', top: 8, left: 8, zIndex: 10,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  rankBadgeGold: { backgroundColor: 'rgba(255,215,0,0.85)' },
  rankBadgeSilver: { backgroundColor: 'rgba(192,192,192,0.85)' },
  rankBadgeBronze: { backgroundColor: 'rgba(205,127,50,0.85)' },
  rankBadgeText: { fontSize: 14 },

  resultPhoto: { borderRadius: 0 },
  resultInfo: { flex: 1, padding: 12, gap: 5, justifyContent: 'center' },
  resultTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  resultName: { fontSize: 15, fontWeight: '800', color: '#111', flex: 1 },
  matchBadge: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
    backgroundColor: '#f2f2f2',
  },
  matchBadgeHigh: { backgroundColor: COLORS.primary + '18' },
  matchBadgeText: { fontSize: 11, fontWeight: '700', color: '#888' },
  matchBadgeTextHigh: { color: COLORS.primary },

  resultMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultMeta: { fontSize: 12, color: '#888' },
  resultMetaDot: { fontSize: 12, color: '#ccc' },
  resultGymRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  resultGymText: { fontSize: 11, color: '#bbb', flex: 1 },

  matchedTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  matchedTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#f0f4ff' },
  matchedTagText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },

  resultPrice: { fontSize: 14, fontWeight: '800', color: '#111', marginTop: 2 },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 15, color: '#888' },
  retryBtn: {
    marginTop: 8, backgroundColor: COLORS.primary,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
