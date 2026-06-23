import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useReportStore, ReportStatus } from '../store/reportStore';
import { useGymApplicationStore, GymAppStatus } from '../store/gymApplicationStore';
import { COLORS } from '../utils/constants';

const R_STATUS: Record<ReportStatus, string> = { '접수': '#F59E0B', '검토중': '#4F63F5', '조치완료': '#10B981', '반려': '#94A3B8' };
const A_STATUS: Record<GymAppStatus, string> = { '대기': '#F59E0B', '승인': '#10B981', '반려': '#EF4444' };

export default function OperatorConsole() {
  const router = useRouter();
  const reports = useReportStore((s) => s.reports);
  const setReportStatus = useReportStore((s) => s.setStatus);
  const applications = useGymApplicationStore((s) => s.applications);
  const setAppStatus = useGymApplicationStore((s) => s.setStatus);
  const [tab, setTab] = useState<'reports' | 'apps'>('reports');

  const pendingReports = reports.filter((r) => r.status === '접수' || r.status === '검토중').length;
  const pendingApps = applications.filter((a) => a.status === '대기').length;

  return (
    <SafeAreaView style={s.c}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.replace('/login' as any)} style={s.back}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={s.title}>운영자 콘솔</Text>
          <Text style={s.sub}>FLOWIN 플랫폼 관리 (데모)</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tab, tab === 'reports' && s.tabOn]} onPress={() => setTab('reports')}>
          <Text style={[s.tabText, tab === 'reports' && s.tabTextOn]}>신고 처리{pendingReports > 0 ? ` (${pendingReports})` : ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'apps' && s.tabOn]} onPress={() => setTab('apps')}>
          <Text style={[s.tabText, tab === 'apps' && s.tabTextOn]}>입점 심사{pendingApps > 0 ? ` (${pendingApps})` : ''}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {tab === 'reports' && (
          reports.length === 0 ? <Empty text="접수된 신고가 없습니다" /> :
          reports.map((r) => (
            <View key={r.id} style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.cardTitle}>{r.targetName}</Text>
                <View style={[s.badge, { backgroundColor: R_STATUS[r.status] + '1A' }]}>
                  <Text style={[s.badgeText, { color: R_STATUS[r.status] }]}>{r.status}</Text>
                </View>
              </View>
              <Text style={s.cardReason}>{r.reason}</Text>
              <Text style={s.cardMeta}>신고자 {r.reporterName} · {r.createdAt.slice(0, 10)}</Text>
              <View style={s.actionRow}>
                <ActBtn label="검토중" color="#4F63F5" onPress={() => setReportStatus(r.id, '검토중')} active={r.status === '검토중'} />
                <ActBtn label="조치완료" color="#10B981" onPress={() => setReportStatus(r.id, '조치완료')} active={r.status === '조치완료'} />
                <ActBtn label="반려" color="#94A3B8" onPress={() => setReportStatus(r.id, '반려')} active={r.status === '반려'} />
              </View>
            </View>
          ))
        )}

        {tab === 'apps' && (
          applications.length === 0 ? <Empty text="입점 신청이 없습니다" /> :
          applications.map((a) => (
            <View key={a.id} style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.cardTitle}>{a.gymName}</Text>
                <View style={[s.badge, { backgroundColor: A_STATUS[a.status] + '1A' }]}>
                  <Text style={[s.badgeText, { color: A_STATUS[a.status] }]}>{a.status}</Text>
                </View>
              </View>
              <Text style={s.cardReason}>대표 {a.ownerName} · 사업자 {a.businessNumber}</Text>
              <Text style={s.cardMeta}>{a.address}</Text>
              <Text style={s.cardMeta}>{a.phone} · 신청 {a.createdAt.slice(0, 10)}</Text>
              {a.status === '대기' ? (
                <View style={s.actionRow}>
                  <ActBtn label="승인" color="#10B981" onPress={() => setAppStatus(a.id, '승인')} />
                  <ActBtn label="반려" color="#EF4444" onPress={() => setAppStatus(a.id, '반려')} />
                </View>
              ) : (
                <Text style={[s.cardMeta, { color: A_STATUS[a.status], fontWeight: '700', marginTop: 6 }]}>
                  {a.status === '승인' ? '✓ 입점 승인됨' : '✕ 반려됨'} · 처리 완료
                </Text>
              )}
            </View>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActBtn({ label, color, onPress, active }: { label: string; color: string; onPress: () => void; active?: boolean }) {
  return (
    <TouchableOpacity style={[s.act, { borderColor: color }, active && { backgroundColor: color }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[s.actText, { color: active ? '#fff' : color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={s.empty}>
      <MaterialCommunityIcons name="check-circle-outline" size={40} color={COLORS.textMuted} />
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14, backgroundColor: '#0F172A' },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'center' },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 1 },

  tabRow: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  tabTextOn: { color: COLORS.primary },

  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, flex: 1 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  cardReason: { fontSize: 14, color: COLORS.text, marginTop: 2 },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  act: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  actText: { fontSize: 13, fontWeight: '800' },

  empty: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
