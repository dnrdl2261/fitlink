import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { usePackageStore } from '../../store/packageStore';
import { useOfferStore } from '../../store/offerStore';
import { formatPrice } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';
import { PackageContractStatus } from '../../types';

type FilterTab = 'all' | PackageContractStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'active', label: '이용 중' },
  { key: 'completed', label: '완료' },
  { key: 'expired', label: '만료' },
];

export default function MyPackagesScreen() {
  const router = useRouter();
  const { from } = useGlobalSearchParams<{ from?: string }>();
  const onBack = () => router.navigate((from === 'home' ? '/(member)/trainers' : '/(member)/more') as any);
  const { member } = useAuthStore();
  const memberId = member?.id ?? '';
  const { getMemberContracts } = usePackageStore();
  const allOffers = useOfferStore((s) => s.offers);
  const declineOffer = useOfferStore((s) => s.declineOffer);
  const pendingOffers = allOffers.filter((o) => o.memberId === memberId && o.status === '제안');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const handleDecline = (id: string) => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('이 제안을 거절할까요?')) declineOffer(id);
    } else { declineOffer(id); }
  };

  const allContracts = getMemberContracts(member?.id ?? '');
  const filtered = activeTab === 'all' ? allContracts : allContracts.filter((c) => c.status === activeTab);

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>내 패키지</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 탭 */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const count = tab.key === 'all' ? allContracts.length : allContracts.filter((c) => c.status === tab.key).length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
                {count > 0 && (
                  <Text style={activeTab === tab.key ? styles.tabCountActive : styles.tabCount}>
                    {' '}{count}
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* 트레이너 맞춤 재등록 제안 */}
        {pendingOffers.map((o) => {
          const discount = o.basePrice > 0 ? Math.max(0, Math.round((1 - o.pricePerSession / o.basePrice) * 100)) : 0;
          const total = o.pricePerSession * o.sessionCount;
          const baseTotal = o.basePrice * o.sessionCount;
          return (
            <View key={o.id} style={styles.offerCard}>
              <View style={styles.offerHead}>
                <MaterialCommunityIcons name="gift-outline" size={18} color={COLORS.primary} />
                <Text style={styles.offerHeadText}>트레이너 맞춤 재등록 제안</Text>
                {discount > 0 && (
                  <View style={styles.offerDiscBadge}><Text style={styles.offerDiscBadgeText}>{discount}% 할인</Text></View>
                )}
              </View>
              <Text style={styles.offerTrainer}>{o.trainerName} 트레이너</Text>
              <View style={styles.offerPriceRow}>
                <View style={styles.offerCountBox}>
                  <Text style={styles.offerCountNum}>{o.sessionCount}<Text style={styles.offerCountUnit}>회</Text></Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  {discount > 0 && <Text style={styles.offerBase}>{formatPrice(baseTotal)}</Text>}
                  <Text style={styles.offerTotal}>{formatPrice(total)}</Text>
                  <Text style={styles.offerPer}>{formatPrice(o.pricePerSession)}/회</Text>
                </View>
              </View>
              {!!o.memo && <Text style={styles.offerMemo}>“{o.memo}”</Text>}
              <View style={styles.offerBtnRow}>
                <TouchableOpacity style={styles.offerDecline} onPress={() => handleDecline(o.id)} activeOpacity={0.8}>
                  <Text style={styles.offerDeclineText}>거절</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.offerAccept}
                  onPress={() => router.push({ pathname: '/booking/new', params: { trainerId: o.trainerId, offerId: o.id, offerCount: String(o.sessionCount), offerPrice: String(o.pricePerSession) } } as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.offerAcceptText}>수락하고 등록</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={28} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>패키지가 없습니다</Text>
            <Text style={styles.emptyDesc}>
              {activeTab === 'all'
                ? '트레이너 프로필에서 패키지를 구매할 수 있습니다'
                : `${TABS.find(t => t.key === activeTab)?.label} 상태의 패키지가 없습니다`}
            </Text>
            {activeTab === 'all' && (
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.navigate('/(member)/trainers' as any)}
              >
                <Text style={styles.browseBtnText}>트레이너 찾기</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((contract) => {
            const remaining = contract.totalSessions - contract.usedSessions;
            const progressPct = (contract.usedSessions / contract.totalSessions) * 100;
            const daysLeft = contract.status === 'active'
              ? Math.max(0, Math.ceil((new Date(contract.expiresAt).getTime() - new Date(today).getTime()) / 86400000))
              : 0;
            const isExpiringSoon = contract.status === 'active' && daysLeft <= 14 && daysLeft > 0;

            const statusColor =
              contract.status === 'active' ? COLORS.primary :
              contract.status === 'completed' ? COLORS.textSecondary : COLORS.error;
            const statusLabel =
              contract.status === 'active' ? '이용 중' :
              contract.status === 'completed' ? '완료' : '만료';

            return (
              <View key={contract.id} style={[styles.contractCard, contract.status !== 'active' && styles.contractCardDim]}>
                <View style={[styles.contractCardBar, { backgroundColor: statusColor }]} />
                <View style={styles.contractCardInner}>
                {/* 카드 상단 */}
                <View style={styles.cardTop}>
                  <View style={styles.trainerBadge}>
                    <Text style={styles.trainerBadgeText}>{contract.trainerName[0]}</Text>
                  </View>
                  <View style={styles.cardTopInfo}>
                    <Text style={styles.trainerName}>{contract.trainerName} 트레이너</Text>
                    <Text style={styles.sessionCountText}>{contract.totalSessions}회권</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>

                {/* 진행 바 */}
                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.min(progressPct, 100)}%` as any }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {contract.usedSessions}회 사용 / 잔여 {remaining}회
                  </Text>
                </View>

                {/* 메타 정보 */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="calendar-clock" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>{contract.expiresAt} 만료</Text>
                  </View>
                  {contract.status === 'active' && (
                    <View style={[styles.metaItem, isExpiringSoon && styles.metaItemWarn]}>
                      <MaterialCommunityIcons
                        name="timer-outline"
                        size={14}
                        color={isExpiringSoon ? COLORS.error : COLORS.textSecondary}
                      />
                      <Text style={[styles.metaText, isExpiringSoon && { color: COLORS.error, fontWeight: '700' }]}>
                        {daysLeft}일 남음{isExpiringSoon ? ' ⚠️' : ''}
                      </Text>
                    </View>
                  )}
                </View>

                {/* 가격 & 예약 버튼 */}
                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.priceLabel}>구매가</Text>
                    <Text style={styles.priceValue}>{formatPrice(contract.totalPrice)}</Text>
                  </View>
                  {contract.status === 'active' && (
                    <TouchableOpacity
                      style={styles.bookBtn}
                      onPress={() => router.push({
                        pathname: '/booking/new',
                        params: { trainerId: contract.trainerId },
                      } as any)}
                    >
                      <Text style={styles.bookBtnText}>이 트레이너로 예약</Text>
                    </TouchableOpacity>
                  )}
                </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  pageHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backBtnText: { fontSize: 34, fontWeight: '300', color: COLORS.primary, lineHeight: 36 },
  pageTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary },
  tabCount: { fontSize: 12, color: COLORS.textSecondary },
  tabCountActive: { fontSize: 12, color: COLORS.primary },

  emptyWrap: {
    alignItems: 'center', paddingTop: 60, gap: 10,
  },
  emptyIconBox: { width: 68, height: 68, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  browseBtn: {
    marginTop: 8, backgroundColor: COLORS.primary,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12,
  },
  browseBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  contractCard: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 16,
    overflow: 'hidden', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  contractCardBar: { width: 4 },
  contractCardInner: { flex: 1, padding: 16, gap: 12 },
  contractCardDim: { opacity: 0.6 },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trainerBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  trainerBadgeText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  cardTopInfo: { flex: 1 },
  trainerName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sessionCountText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },

  progressWrap: { gap: 6 },
  progressTrack: {
    height: 8, borderRadius: 4, backgroundColor: COLORS.border, overflow: 'hidden',
  },
  progressFill: {
    height: 8, borderRadius: 4, backgroundColor: COLORS.primary,
  },
  progressText: { fontSize: 12, color: COLORS.textSecondary },

  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaItemWarn: {},
  metaText: { fontSize: 12, color: COLORS.textSecondary },

  cardBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12,
  },
  priceLabel: { fontSize: 12, color: COLORS.textSecondary },
  priceValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  bookBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  bookBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  offerCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1.5, borderColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 4, gap: 8,
  },
  offerHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  offerHeadText: { fontSize: 13, fontWeight: '800', color: COLORS.primary, flex: 1 },
  offerDiscBadge: { backgroundColor: COLORS.error, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  offerDiscBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  offerTrainer: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  offerPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.primary + '0E', borderRadius: 14, padding: 14 },
  offerCountBox: { width: 60, height: 60, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  offerCountNum: { fontSize: 20, fontWeight: '900', color: '#fff' },
  offerCountUnit: { fontSize: 12, fontWeight: '700', color: '#fff' },
  offerBase: { fontSize: 13, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  offerTotal: { fontSize: 20, fontWeight: '900', color: COLORS.primary, marginTop: 1 },
  offerPer: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  offerMemo: { fontSize: 13, color: COLORS.text, fontStyle: 'italic', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10 },
  offerBtnRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  offerDecline: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  offerDeclineText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  offerAccept: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  offerAcceptText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
