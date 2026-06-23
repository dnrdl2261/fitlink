import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, SafeAreaView, Alert, Platform, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { useMemberRecordStore } from '../../store/memberRecordStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useOfferStore } from '../../store/offerStore';
import { useChatStore } from '../../store/chatStore';
import { formatPrice, formatDate } from '../../utils/formatters';

const D = {
  bg: '#EEF2F9', surface: '#FFFFFF', primary: '#4F63F5',
  primaryGlow: 'rgba(79,99,245,0.12)', text: '#0F172A',
  textSec: '#64748B', textMuted: '#94A3B8', border: '#E2E8F0',
  success: '#10B981', error: '#EF4444',
};

const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

export default function MemberDetailScreen() {
  const router = useRouter();
  const { memberId, memberName } = useLocalSearchParams<{ memberId: string; memberName: string }>();
  const mId = memberId ?? '';
  const mName = memberName ?? '회원';

  const { trainer } = useAuthStore();
  const trainerId = trainer?.id ?? '';
  const { bookings } = useBookingStore();
  const { getRecords, addRecord, removeRecord } = useMemberRecordStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const addOffer = useOfferStore((s) => s.addOffer);
  const getOrCreate = useChatStore((s) => s.getOrCreate);

  const [draft, setDraft] = useState('');

  const basePrice = trainer?.sessionPrice ?? 60000;
  const [offerModal, setOfferModal] = useState(false);
  const [offerCount, setOfferCount] = useState(10);
  const [offerPriceStr, setOfferPriceStr] = useState(String(basePrice));
  const [offerMemo, setOfferMemo] = useState('');
  const [offerSent, setOfferSent] = useState(false);
  const offerPriceN = Number(offerPriceStr) || 0;
  const offerDiscount = basePrice > 0 ? Math.max(0, Math.round((1 - offerPriceN / basePrice) * 100)) : 0;

  const summary = useMemo(() => {
    const mine = bookings.filter((b) => b.trainerId === trainerId && b.memberId === mId && b.type !== 'consultation');
    const totalSessions = mine.reduce((s, b) => s + b.totalSessions, 0);
    const usedSessions = mine.reduce((s, b) => s + b.usedSessions, 0);
    const remaining = mine.reduce((s, b) => s + b.remainingSessions, 0);
    const totalAmount = mine.reduce((s, b) => s + b.totalAmount, 0);
    const isActive = mine.some((b) => b.status === 'active');
    return { totalSessions, usedSessions, remaining, totalAmount, isActive, count: mine.length };
  }, [bookings, trainerId, mId]);

  const records = getRecords(trainerId, mId);

  const handleAdd = () => {
    const content = draft.trim();
    if (!content) return;
    addRecord({ trainerId, memberId: mId, date: TODAY, content });
    setDraft('');
  };

  const handleDelete = (id: string) => {
    const apply = () => removeRecord(id);
    if (Platform.OS === 'web') {
      if (window.confirm('이 기록을 삭제할까요?')) apply();
      return;
    }
    Alert.alert('기록 삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: apply },
    ]);
  };

  const handleProposal = () => {
    const apply = () => {
      addNotification({
        type: 'trainer_proposal',
        title: 'PT 예약 제안이 도착했어요',
        body: `${trainer?.name ?? ''} 트레이너가 ${mName}님께 PT 예약을 제안했어요. 트레이너 프로필에서 예약을 진행해보세요.`,
        targetRole: 'member',
        userId: mId,
        meta: { trainerId },
      });
      if (Platform.OS === 'web') window.alert('예약 제안을 보냈습니다.');
      else Alert.alert('전송 완료', '예약 제안을 보냈습니다.');
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`${mName}님께 PT 예약을 제안할까요?`)) apply();
      return;
    }
    Alert.alert('예약 제안', `${mName}님께 PT 예약을 제안할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '제안 보내기', onPress: apply },
    ]);
  };

  const openOffer = () => {
    setOfferCount(10);
    setOfferPriceStr(String(basePrice));
    setOfferMemo('');
    setOfferSent(false);
    setOfferModal(true);
  };

  const sendOffer = () => {
    if (offerCount <= 0 || offerPriceN <= 0) return;
    addOffer({
      trainerId,
      trainerName: trainer?.name ?? '트레이너',
      memberId: mId,
      memberName: mName,
      sessionCount: offerCount,
      pricePerSession: offerPriceN,
      basePrice,
      memo: offerMemo.trim(),
    });
    addNotification({
      type: 'trainer_proposal',
      title: '🎁 트레이너 맞춤 재등록 제안',
      body: `${trainer?.name ?? ''} 트레이너가 ${offerCount}회 ${offerPriceN.toLocaleString()}원/회 재등록을 제안했어요. 내 패키지에서 확인하세요.`,
      targetRole: 'member',
      userId: mId,
      meta: { trainerId },
    });
    setOfferSent(true);
  };

  const handleMessage = () => {
    if (!trainer) return;
    const convId = getOrCreate(
      'member-trainer',
      { id: mId, name: mName, role: 'member' },
      { id: trainer.id, name: trainer.name, role: 'trainer' },
    );
    router.push(`/chat/${convId}` as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.navigate('/(trainer)/members' as any)}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>회원 상세</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        {/* 회원 요약 */}
        <View style={styles.card}>
          <View style={styles.memberTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{mName.slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{mName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: summary.isActive ? '#10B98118' : '#64748B12' }]}>
                <Text style={[styles.statusText, { color: summary.isActive ? D.success : D.textSec }]}>
                  {summary.isActive ? '활성 회원' : '비활성'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{summary.usedSessions}/{summary.totalSessions}</Text>
              <Text style={styles.statLabel}>완료 세션</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: D.primary }]}>{summary.remaining}회</Text>
              <Text style={styles.statLabel}>잔여 세션</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{formatPrice(summary.totalAmount)}</Text>
              <Text style={styles.statLabel}>총 결제</Text>
            </View>
          </View>
        </View>

        {/* 액션: 예약 제안 / 메시지 */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={handleProposal} activeOpacity={0.85}>
            <MaterialCommunityIcons name="calendar-heart" size={17} color="#fff" />
            <Text style={styles.actionPrimaryText}>예약 제안</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionGhost]} onPress={handleMessage} activeOpacity={0.85}>
            <MaterialCommunityIcons name="message-text-outline" size={17} color={D.primary} />
            <Text style={styles.actionGhostText}>메시지</Text>
          </TouchableOpacity>
        </View>

        {/* 맞춤 재등록 제안 */}
        <TouchableOpacity style={styles.reRegBtn} onPress={openOffer} activeOpacity={0.9}>
          <MaterialCommunityIcons name="gift-outline" size={18} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.reRegBtnText}>맞춤 재등록 제안 보내기</Text>
            <Text style={styles.reRegBtnSub}>
              {summary.remaining === 0 && summary.count > 0
                ? '세션을 모두 마쳤어요 · 재등록 시기입니다'
                : '횟수·가격을 직접 정해 제안 (할인 가능)'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#fff" />
        </TouchableOpacity>

        {/* 운동 기록 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>운동 기록 · 메모</Text>
          <Text style={styles.sectionSub}>세션 진도, 중량, 특이사항을 기록하세요. 회원에게는 보이지 않습니다.</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="예) 스쿼트 60kg 5x5, 무릎 컨디션 양호"
              placeholderTextColor={D.textMuted}
              multiline
            />
            <TouchableOpacity
              style={[styles.addBtn, !draft.trim() && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!draft.trim()}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {records.length === 0 ? (
            <View style={styles.recEmpty}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={28} color={D.textMuted} />
              <Text style={styles.recEmptyText}>아직 기록이 없습니다</Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 4 }}>
              {records.map((r) => (
                <View key={r.id} style={styles.recItem}>
                  <View style={styles.recBar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recDate}>{formatDate(r.date)}</Text>
                    <Text style={styles.recContent}>{r.content}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(r.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={D.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* 맞춤 재등록 제안 모달 */}
      <Modal visible={offerModal} transparent animationType="slide" onRequestClose={() => setOfferModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOfferModal(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHandle} />
            {offerSent ? (
              <View style={styles.sentBox}>
                <Text style={{ fontSize: 40 }}>🎁</Text>
                <Text style={styles.sentTitle}>제안을 보냈어요</Text>
                <Text style={styles.sentSub}>{mName}님이 '내 패키지'에서 확인하고 수락할 수 있어요.</Text>
                <TouchableOpacity style={styles.sentBtn} onPress={() => setOfferModal(false)}>
                  <Text style={styles.sentBtnText}>확인</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>맞춤 재등록 제안</Text>
                <Text style={styles.modalSub}>{mName}님께 보낼 횟수와 1회 가격을 정하세요.</Text>

                <Text style={styles.fieldLabel}>횟수</Text>
                <View style={styles.countChips}>
                  {[5, 10, 20, 30, 40].map((c) => (
                    <TouchableOpacity key={c} style={[styles.countChip, offerCount === c && styles.countChipOn]} onPress={() => setOfferCount(c)} activeOpacity={0.8}>
                      <Text style={[styles.countChipText, offerCount === c && styles.countChipTextOn]}>{c}회</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>1회 가격 (정상가 {formatPrice(basePrice)})</Text>
                <TextInput
                  style={styles.priceInput}
                  value={offerPriceStr}
                  onChangeText={(t) => setOfferPriceStr(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder={String(basePrice)}
                  placeholderTextColor={D.textMuted}
                />

                <View style={styles.calcBox}>
                  {offerDiscount > 0 && (
                    <View style={styles.calcRow}><Text style={styles.calcLabel}>할인</Text><Text style={styles.calcDisc}>{offerDiscount}% ↓</Text></View>
                  )}
                  <View style={styles.calcRow}><Text style={styles.calcLabel}>총 결제</Text><Text style={styles.calcTotal}>{formatPrice(offerPriceN * offerCount)}</Text></View>
                  <Text style={styles.calcPer}>{offerCount}회 × {formatPrice(offerPriceN)}</Text>
                </View>

                <Text style={styles.fieldLabel}>메모 (선택)</Text>
                <TextInput
                  style={styles.memoInput}
                  value={offerMemo}
                  onChangeText={setOfferMemo}
                  placeholder="예) 재등록 감사 할인 🙏"
                  placeholderTextColor={D.textMuted}
                  multiline
                />

                <TouchableOpacity style={[styles.sendBtn, offerPriceN <= 0 && styles.sendBtnOff]} onPress={sendOffer} disabled={offerPriceN <= 0} activeOpacity={0.9}>
                  <Text style={styles.sendBtnText}>제안 보내기</Text>
                </TouchableOpacity>
                <View style={{ height: 8 }} />
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border,
  },
  backBtn: { width: 24, alignItems: 'flex-start' },
  backText: { fontSize: 30, fontWeight: '300', color: D.primary, marginTop: -4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: D.text },

  card: {
    backgroundColor: D.surface, borderRadius: 18, padding: 16, gap: 12,
    borderWidth: 1, borderColor: D.border,
  },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: D.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: D.primary },
  memberName: { fontSize: 18, fontWeight: '800', color: D.text, marginBottom: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },

  statRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: D.bg, borderRadius: 14, paddingVertical: 12 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: D.border },
  statVal: { fontSize: 15, fontWeight: '900', color: D.text },
  statLabel: { fontSize: 11, color: D.textSec, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 14 },
  actionPrimary: { backgroundColor: D.primary },
  actionPrimaryText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  actionGhost: { backgroundColor: D.surface, borderWidth: 1.5, borderColor: D.primary },
  actionGhostText: { fontSize: 14, fontWeight: '800', color: D.primary },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: D.text },
  sectionSub: { fontSize: 12, color: D.textSec, marginTop: -6 },
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: D.bg, borderRadius: 12, borderWidth: 1, borderColor: D.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: D.text,
  },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: D.primary, alignItems: 'center', justifyContent: 'center' },
  addBtnDisabled: { backgroundColor: D.border },

  recEmpty: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  recEmptyText: { fontSize: 13, color: D.textMuted },
  recItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: D.bg, borderRadius: 12, padding: 12 },
  recBar: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: D.primary },
  recDate: { fontSize: 12, fontWeight: '700', color: D.primary, marginBottom: 3 },
  recContent: { fontSize: 14, color: D.text, lineHeight: 20 },

  reRegBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: D.primary, borderRadius: 16, padding: 16 },
  reRegBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  reRegBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, maxHeight: '88%' },
  modalHandle: { width: 40, height: 4, borderRadius: 9999, backgroundColor: D.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: D.text },
  modalSub: { fontSize: 13, color: D.textSec, marginTop: 4, marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: D.text, marginTop: 14, marginBottom: 8 },
  countChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: D.border, backgroundColor: '#fff' },
  countChipOn: { borderColor: D.primary, backgroundColor: D.primaryGlow },
  countChipText: { fontSize: 14, fontWeight: '700', color: D.textSec },
  countChipTextOn: { color: D.primary },
  priceInput: { borderWidth: 1, borderColor: D.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '700', color: D.text, backgroundColor: '#F8FAFC' },
  calcBox: { backgroundColor: D.primaryGlow, borderRadius: 14, padding: 14, marginTop: 12, gap: 4 },
  calcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calcLabel: { fontSize: 13, color: D.textSec, fontWeight: '600' },
  calcDisc: { fontSize: 14, fontWeight: '800', color: D.error },
  calcTotal: { fontSize: 20, fontWeight: '900', color: D.primary },
  calcPer: { fontSize: 12, color: D.textMuted },
  memoInput: { borderWidth: 1, borderColor: D.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: D.text, backgroundColor: '#F8FAFC', minHeight: 48, maxHeight: 100 },
  sendBtn: { marginTop: 18, paddingVertical: 15, borderRadius: 14, backgroundColor: D.primary, alignItems: 'center' },
  sendBtnOff: { backgroundColor: D.border },
  sendBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  sentBox: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  sentTitle: { fontSize: 18, fontWeight: '800', color: D.text },
  sentSub: { fontSize: 13, color: D.textSec, textAlign: 'center', lineHeight: 19 },
  sentBtn: { marginTop: 8, width: '100%', paddingVertical: 14, borderRadius: 14, backgroundColor: D.primary, alignItems: 'center' },
  sentBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
