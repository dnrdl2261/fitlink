import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useMemberRecordStore } from '../../store/memberRecordStore';
import { useBookingStore } from '../../store/bookingStore';
import { COLORS } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';

export default function WorkoutLogScreen() {
  const router = useRouter();
  const { member } = useAuthStore();
  const mId = member?.id ?? '';
  const allRecords = useMemberRecordStore((s) => s.records);
  const records = allRecords
    .filter((x) => x.memberId === mId && x.shared)
    .sort((a, b) => (a.date !== b.date ? b.date.localeCompare(a.date) : b.createdAt.localeCompare(a.createdAt)));

  const { getMyBookings } = useBookingStore();
  const mine = getMyBookings(mId).filter((b) => b.type !== 'consultation');
  const used = mine.reduce((s, b) => s + b.usedSessions, 0);
  const total = mine.reduce((s, b) => s + b.totalSessions, 0);
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;

  return (
    <SafeAreaView style={s.c}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.navigate('/(member)/more' as any)} style={s.back}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={s.title}>내 운동 기록</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* 진도 요약 */}
        <View style={s.summary}>
          <View style={s.summaryIcon}>
            <MaterialCommunityIcons name="chart-line-variant" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.summaryLabel}>총 진행</Text>
            <Text style={s.summaryVal}>{used} / {total} 세션 완료</Text>
          </View>
          {total > 0 && <Text style={s.summaryPct}>{pct}%</Text>}
        </View>
        {total > 0 && (
          <View style={s.track}><View style={[s.fill, { width: `${pct}%` as any }]} /></View>
        )}

        <Text style={s.sectionLabel}>수업 일지</Text>
        {records.length === 0 ? (
          <View style={s.empty}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={40} color={COLORS.textMuted} />
            <Text style={s.emptyT}>공유된 운동 기록이 없습니다</Text>
            <Text style={s.emptySub}>트레이너가 수업 일지를 공개하면 여기에 표시돼요.</Text>
          </View>
        ) : (
          records.map((r) => (
            <View key={r.id} style={s.item}>
              <View style={s.itemBar} />
              <View style={{ flex: 1 }}>
                <View style={s.itemHead}>
                  <Text style={s.itemDate}>{formatDate(r.date)}</Text>
                  <Text style={s.itemTrainer}>{r.trainerName} 트레이너</Text>
                </View>
                <Text style={s.itemContent}>{r.content}</Text>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  summaryIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary },
  summaryVal: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  summaryPct: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  track: { height: 8, borderRadius: 4, backgroundColor: COLORS.border, overflow: 'hidden', marginTop: 10 },
  fill: { height: 8, borderRadius: 4, backgroundColor: COLORS.primary },

  sectionLabel: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, marginTop: 22, marginBottom: 10 },
  item: { flexDirection: 'row', gap: 10, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  itemBar: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: COLORS.primary },
  itemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  itemDate: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  itemTrainer: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  itemContent: { fontSize: 14, color: COLORS.text, lineHeight: 21 },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 50 },
  emptyT: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 30, lineHeight: 19 },
});
