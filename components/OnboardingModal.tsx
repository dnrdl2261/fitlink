import React, { useState, useRef } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  ScrollView, LayoutChangeEvent, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUiPrefStore } from '../store/uiPrefStore';
import { COLORS } from '../utils/constants';

const SLIDES = [
  {
    icon: 'map-marker-radius-outline',
    title: '내 주변 트레이너 찾기',
    desc: '위치를 기반으로 가까운 헬스장의\n전문 트레이너를 한눈에 만나보세요.',
  },
  {
    icon: 'calendar-check-outline',
    title: '간편하게 예약하고 관리',
    desc: '원하는 시간에 PT·상담을 예약하고\n남은 세션과 일정을 앱에서 바로 확인하세요.',
  },
  {
    icon: 'shield-check-outline',
    title: '안심 거래 시스템',
    desc: '세션 완료는 회원이 직접 확인합니다.\n안전하게 PT를 받아보세요.',
  },
] as const;

export default function OnboardingModal() {
  const { onboardingSeen, setOnboardingSeen } = useUiPrefStore();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);

  if (onboardingSeen) return null;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) setPage(p);
  };

  const goNext = () => {
    if (page < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
      setPage(page + 1);
    } else {
      setOnboardingSeen();
    }
  };

  const isLast = page === SLIDES.length - 1;

  return (
    <Modal visible transparent animationType="fade">
      <View style={st.backdrop}>
        <View style={st.card}>
          <TouchableOpacity style={st.skip} onPress={setOnboardingSeen} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={st.skipText}>건너뛰기</Text>
          </TouchableOpacity>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            onLayout={onLayout}
            scrollEventThrottle={16}
            style={st.scroll}
          >
            {SLIDES.map((s) => (
              <View key={s.title} style={[st.slide, { width }]}>
                <View style={st.iconCircle}>
                  <MaterialCommunityIcons name={s.icon as any} size={48} color={COLORS.primary} />
                </View>
                <Text style={st.title}>{s.title}</Text>
                <Text style={st.desc}>{s.desc}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={st.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[st.dot, i === page && st.dotActive]} />
            ))}
          </View>

          <TouchableOpacity style={st.nextBtn} onPress={goNext} activeOpacity={0.85}>
            <Text style={st.nextText}>{isLast ? '시작하기' : '다음'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 380, backgroundColor: COLORS.surface,
    borderRadius: 24, paddingVertical: 28, paddingHorizontal: 8, alignItems: 'center', overflow: 'hidden',
  },
  skip: { position: 'absolute', top: 16, right: 18, zIndex: 2 },
  skipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  scroll: { alignSelf: 'stretch' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16, paddingTop: 16 },
  iconCircle: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: COLORS.primaryPale, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  desc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },
  dots: { flexDirection: 'row', gap: 7, marginTop: 24, marginBottom: 20 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { width: 20, backgroundColor: COLORS.primary },
  nextBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    height: 52, alignSelf: 'stretch', marginHorizontal: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
