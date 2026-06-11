import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Modal, TextInput, Alert, Platform,
  PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { usePackageStore } from '../../store/packageStore';
import { useBookingStore } from '../../store/bookingStore';
import { formatPrice } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';
import { PackageProduct } from '../../types';

const SESSION_PRESETS = [10, 20, 30, 40, 50];
const VALID_PRESETS = [
  { label: '3개월', days: 90 },
  { label: '6개월', days: 180 },
  { label: '1년', days: 365 },
];

export default function PackageManageScreen() {
  const router = useRouter();
  const { trainer } = useAuthStore();
  const { products, contracts, addProduct, updateProduct, getTrainerProducts } = usePackageStore();
  const { getTrainerBookings } = useBookingStore();

  const myProducts = getTrainerProducts(trainer?.id ?? '');
  const myBuyers = getTrainerBookings(trainer?.id ?? '').filter((b) => b.status !== 'cancelled');

  const [addModal, setAddModal] = useState(false);
  const [sessionCount, setSessionCount] = useState(10);
  const [priceInput, setPriceInput] = useState('');
  const [validDays, setValidDays] = useState(90);
  const [validCustomMode, setValidCustomMode] = useState(false);
  const [validCustomInput, setValidCustomInput] = useState('');
  const [freePtCount, setFreePtCount] = useState(0);
  const [descInput, setDescInput] = useState('');

  const singlePrice = trainer?.sessionPrice ?? 0;

  const closeAddModal = () => {
    setAddModal(false);
    setValidCustomMode(false);
    setValidCustomInput('');
    setFreePtCount(0);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 8,
      onPanResponderRelease: (_, { dy }) => {
        if (dy > 60) {
          setAddModal(false);
          setValidCustomMode(false);
          setValidCustomInput('');
          setFreePtCount(0);
        }
      },
    })
  ).current;

  const handleAddProduct = () => {
    const totalPrice = parseInt(priceInput.replace(/,/g, ''), 10);
    if (!totalPrice || totalPrice <= 0) {
      if (Platform.OS === 'web') { alert('올바른 가격을 입력해주세요'); return; }
      Alert.alert('오류', '올바른 가격을 입력해주세요');
      return;
    }
    const originalPrice = singlePrice * sessionCount;
    const discountRate = originalPrice > 0
      ? Math.max(0, Math.round(((originalPrice - totalPrice) / originalPrice) * 100) / 100)
      : 0;
    addProduct({
      trainerId: trainer?.id ?? '',
      trainerName: trainer?.name ?? '',
      sessionCount,
      totalPrice,
      discountRate,
      validDays,
      freePtSessions: freePtCount > 0 ? freePtCount : undefined,
      description: descInput.trim() || undefined,
      isActive: true,
    });
    setAddModal(false);
    setPriceInput('');
    setDescInput('');
    setSessionCount(10);
    setValidDays(90);
    setValidCustomMode(false);
    setValidCustomInput('');
    setFreePtCount(0);
  };

  const handleToggle = (product: PackageProduct) => {
    updateProduct(product.id, { isActive: !product.isActive });
  };

  const activeBuyers = (productId: string) =>
    myBuyers.filter((b) => b.productId === productId && b.status === 'active').length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.navigate('/(trainer)/more' as any)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>패키지 관리</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 요약 카드 */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{myProducts.filter(p => p.isActive).length}</Text>
            <Text style={styles.summaryLabel}>판매 중</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{myBuyers.filter(b => b.status === 'active').length}</Text>
            <Text style={styles.summaryLabel}>활성 계약</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{myBuyers.length}</Text>
            <Text style={styles.summaryLabel}>총 구매</Text>
          </View>
        </View>

        {/* 패키지 목록 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>내 패키지 상품</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
              <Text style={styles.addBtnText}>추가</Text>
            </TouchableOpacity>
          </View>

          {myProducts.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="package-variant" size={40} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>등록된 패키지가 없습니다</Text>
              <Text style={styles.emptyDesc}>패키지를 추가하면 회원이 구매할 수 있습니다</Text>
            </View>
          ) : (
            myProducts.map((product) => {
              const originalPrice = singlePrice * product.sessionCount;
              const discountPct = Math.round(product.discountRate * 100);
              const buyers = activeBuyers(product.id);
              return (
                <View key={product.id} style={[styles.productCard, !product.isActive && styles.productCardInactive]}>
                  <View style={styles.productTop}>
                    <View style={styles.productTitleRow}>
                      <View style={[styles.sessionBadge, !product.isActive && styles.sessionBadgeInactive]}>
                        <Text style={[styles.sessionBadgeText, !product.isActive && styles.sessionBadgeTextInactive]}>
                          {product.sessionCount}회권
                        </Text>
                      </View>
                      {discountPct > 0 && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountBadgeText}>{discountPct}% 할인</Text>
                        </View>
                      )}
                      {!product.isActive && (
                        <View style={styles.inactiveBadge}>
                          <Text style={styles.inactiveBadgeText}>판매 중지</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleToggle(product)} style={styles.toggleBtn} activeOpacity={0.7}>
                      <View style={[styles.toggleTrack, product.isActive && styles.toggleTrackOn]}>
                        <View style={[styles.toggleThumb, product.isActive && styles.toggleThumbOn]} />
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.productPriceRow}>
                    <Text style={[styles.productPrice, !product.isActive && { color: COLORS.textSecondary }]}>
                      {formatPrice(product.totalPrice)}
                    </Text>
                    {originalPrice > product.totalPrice && (
                      <Text style={styles.originalPrice}>{formatPrice(originalPrice)}</Text>
                    )}
                  </View>

                  {product.description ? (
                    <Text style={styles.productDesc}>{product.description}</Text>
                  ) : null}

                  <View style={styles.productMeta}>
                    <Text style={styles.metaItem}>⏱ 유효기간 {product.validDays}일</Text>
                    <Text style={styles.metaItem}>👥 활성 구매자 {buyers}명</Text>
                    {!!product.freePtSessions && (
                      <Text style={[styles.metaItem, styles.freePtMeta]}>🎁 무료PT {product.freePtSessions}회</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* 구매자 목록 */}
        {myBuyers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>구매자 현황</Text>
            {myBuyers.map((booking) => {
              const statusColor =
                booking.status === 'active' ? COLORS.success :
                booking.status === 'completed' ? COLORS.textSecondary : COLORS.error;
              const statusLabel =
                booking.status === 'active' ? '이용 중' :
                booking.status === 'completed' ? '완료' : '취소';
              return (
                <View key={booking.id} style={styles.buyerRow}>
                  <View style={styles.buyerAvatar}>
                    <Text style={styles.buyerAvatarText}>{booking.memberName[0]}</Text>
                  </View>
                  <View style={styles.buyerInfo}>
                    <Text style={styles.buyerName}>{booking.memberName}</Text>
                    <Text style={styles.buyerDetail}>
                      {booking.totalSessions}회권 · 잔여 {booking.remainingSessions}회
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* 패키지 추가 모달 */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={closeAddModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeAddModal} activeOpacity={1} />
          <View style={styles.modalSheet}>
            <View style={styles.modalDragHeader} {...panResponder.panHandlers}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>새 패키지 추가</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.fieldLabel}>회 수</Text>
              <View style={styles.presetRow}>
                {SESSION_PRESETS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.presetBtn, sessionCount === n && styles.presetBtnActive]}
                    onPress={() => setSessionCount(n)}
                  >
                    <Text style={[styles.presetBtnText, sessionCount === n && styles.presetBtnTextActive]}>
                      {n}회
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setSessionCount(c => Math.max(1, c - 1))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepperBtnText}>－</Text>
                </TouchableOpacity>
                <View style={styles.stepperDisplay}>
                  <Text style={styles.stepperDisplayText}>{sessionCount}회</Text>
                  <Text style={styles.stepperDisplaySub}>1 ~ 100회 설정 가능</Text>
                </View>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setSessionCount(c => Math.min(100, c + 1))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepperBtnText}>＋</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>총 판매가</Text>
              {singlePrice > 0 && (
                <Text style={styles.fieldHint}>
                  정가 {formatPrice(singlePrice * sessionCount)} ({sessionCount}회 × {formatPrice(singlePrice)})
                </Text>
              )}
              <TextInput
                style={styles.textInput}
                placeholder="예: 720000"
                value={priceInput}
                onChangeText={setPriceInput}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={styles.fieldLabel}>유효기간</Text>
              <View style={styles.presetRow}>
                {VALID_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.days}
                    style={[styles.presetBtn, !validCustomMode && validDays === p.days && styles.presetBtnActive]}
                    onPress={() => { setValidDays(p.days); setValidCustomMode(false); }}
                  >
                    <Text style={[styles.presetBtnText, !validCustomMode && validDays === p.days && styles.presetBtnTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.presetBtn, validCustomMode && styles.presetBtnActive]}
                  onPress={() => { setValidCustomMode(true); setValidCustomInput(String(validDays)); }}
                >
                  <Text style={[styles.presetBtnText, validCustomMode && styles.presetBtnTextActive]}>직접입력</Text>
                </TouchableOpacity>
              </View>
              {validCustomMode && (
                <View style={styles.customDaysRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="예: 120"
                    value={validCustomInput}
                    onChangeText={(text) => {
                      setValidCustomInput(text);
                      const d = parseInt(text, 10);
                      if (!isNaN(d) && d > 0) setValidDays(d);
                    }}
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.textSecondary}
                    autoFocus
                  />
                  <Text style={styles.customDaysUnit}>일</Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>
                무료 PT <Text style={styles.fieldLabelOpt}>(선택)</Text>
              </Text>
              <View style={styles.presetRow}>
                {([0, 1, 2, 3] as const).map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.presetBtn, freePtCount === n && styles.freePtBtnActive]}
                    onPress={() => setFreePtCount(n)}
                  >
                    <Text style={[styles.presetBtnText, freePtCount === n && styles.freePtBtnTextActive]}>
                      {n === 0 ? '없음' : `${n}회`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>메모 (선택)</Text>
              <TextInput
                style={[styles.textInput, { height: 72, textAlignVertical: 'top' }]}
                placeholder="패키지 설명이나 특이사항"
                value={descInput}
                onChangeText={setDescInput}
                multiline
                placeholderTextColor={COLORS.textSecondary}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeAddModal}>
                  <Text style={styles.cancelBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleAddProduct}>
                  <Text style={styles.confirmBtnText}>추가하기</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  backBtnText: { fontSize: 34, fontWeight: '300', color: COLORS.secondary, lineHeight: 36 },
  pageTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  summaryRow: {
    flexDirection: 'row', gap: 10, padding: 16,
  },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 14, alignItems: 'center', gap: 4,
  },
  summaryNum: { fontSize: 22, fontWeight: '800', color: COLORS.secondary },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary },

  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.secondary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  emptyCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 36, alignItems: 'center', gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 4 },
  emptyDesc: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  productCard: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 10, gap: 8,
  },
  productCardInactive: { opacity: 0.55 },
  productTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  sessionBadge: {
    backgroundColor: COLORS.secondary + '18', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  sessionBadgeInactive: { backgroundColor: COLORS.border },
  sessionBadgeText: { fontSize: 14, fontWeight: '800', color: COLORS.secondary },
  sessionBadgeTextInactive: { color: COLORS.textSecondary },

  discountBadge: {
    backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  discountBadgeText: { fontSize: 11, fontWeight: '700', color: '#D97706' },

  inactiveBadge: {
    backgroundColor: COLORS.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  inactiveBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },

  toggleBtn: { padding: 4 },
  toggleTrack: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: COLORS.border, justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleTrackOn: { backgroundColor: COLORS.secondary },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  productPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productPrice: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  originalPrice: { fontSize: 13, color: COLORS.textSecondary, textDecorationLine: 'line-through' },

  productDesc: { fontSize: 13, color: COLORS.textSecondary },
  productMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { fontSize: 12, color: COLORS.textSecondary },

  buyerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 8,
  },
  buyerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  buyerAvatarText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  buyerInfo: { flex: 1 },
  buyerName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  buyerDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '85%', paddingBottom: 8,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  modalDragHeader: { paddingBottom: 2 },
  modalTitle: {
    fontSize: 17, fontWeight: '700', color: COLORS.text,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalScroll: { paddingHorizontal: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  fieldLabelOpt: { fontSize: 12, fontWeight: '400', color: COLORS.textSecondary },
  fieldHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  presetRow: { flexDirection: 'row', gap: 8 },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  stepperBtn: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 22, fontWeight: '300', color: COLORS.secondary, lineHeight: 26 },
  stepperDisplay: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.secondary + '10', borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.secondary + '30', paddingVertical: 8,
  },
  stepperDisplayText: { fontSize: 18, fontWeight: '800', color: COLORS.secondary },
  stepperDisplaySub: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },

  customDaysRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  customDaysUnit: { fontSize: 15, fontWeight: '600', color: COLORS.text },

  freePtBtnActive: { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.10)' },
  freePtBtnTextActive: { color: '#10B981', fontWeight: '800' },
  freePtMeta: { color: '#10B981', fontWeight: '600' },
  presetBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  presetBtnActive: { borderColor: COLORS.secondary, backgroundColor: COLORS.secondary + '12' },
  presetBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  presetBtnTextActive: { color: COLORS.secondary, fontWeight: '800' },
  textInput: {
    backgroundColor: COLORS.background, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.text,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: COLORS.secondary,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
