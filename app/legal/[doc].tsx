import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { LEGAL_DOCS } from '../../data/legal';

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const router = useRouter();
  const legal = LEGAL_DOCS[doc ?? ''] ?? LEGAL_DOCS.terms;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{legal.title}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.updated}>최종 개정일 {legal.updatedAt}</Text>
        {!!legal.intro && <Text style={s.intro}>{legal.intro}</Text>}
        {legal.sections.map((sec, i) => (
          <View key={i} style={s.section}>
            <Text style={s.heading}>{sec.heading}</Text>
            <Text style={s.body}>{sec.body}</Text>
          </View>
        ))}
        <Text style={s.disclaimer}>※ 본 문서는 표준 템플릿 기반 초안이며, 시행 전 법률 전문가의 검토가 필요합니다.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  scroll: { padding: 20, paddingBottom: 48, gap: 16 },
  updated: { fontSize: 12, color: COLORS.textSecondary },
  intro: { fontSize: 14, color: COLORS.text, lineHeight: 21 },
  section: { gap: 6 },
  heading: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  body: { fontSize: 13.5, color: COLORS.textSecondary, lineHeight: 21 },
  disclaimer: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 8 },
});
