import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { useAuthStore } from '../../store/authStore';
import { MOCK_TRAINERS } from '../../data/trainers';
import { COLORS } from '../../utils/constants';

const GYM  = '#2DD4BF';
const DARK = '#0F172A';
const SLATE = '#64748B';

export default function BlacklistScreen() {
  const { gymAdmin } = useAuthStore();
  const GYM_ID = gymAdmin?.gymId ?? 'gym_001';
  const { blacklistTrainer, unblacklistTrainer, getBlacklist } = useGymSlotStore();
  useGymSlotStore((s) => s.blacklists);

  const [addModal, setAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [removeTarget, setRemoveTarget] = useState<{ trainerId: string; trainerName: string } | null>(null);

  const blacklist = getBlacklist(GYM_ID);
  const blacklistedIds = new Set(blacklist.map((e) => e.trainerId));

  const filtered = MOCK_TRAINERS.filter(
    (t) =>
      !blacklistedIds.has(t.id) &&
      (search.trim() === '' ||
        t.name.includes(search.trim()) ||
        t.region.includes(search.trim()))
  );

  const handleAdd = (trainerId: string, trainerName: string) => {
    blacklistTrainer(GYM_ID, trainerId, trainerName);
  };

  const handleRemoveConfirm = () => {
    if (!removeTarget) return;
    unblacklistTrainer(GYM_ID, removeTarget.trainerId);
    setRemoveTarget(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 안내 배너 */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          블랙리스트에 등록된 트레이너는 이 헬스장의 슬롯을 예약할 수 없습니다.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* 등록 버튼 */}
        <TouchableOpacity style={styles.addBtn} onPress={() => { setSearch(''); setAddModal(true); }}>
          <Text style={styles.addBtnText}>+ 트레이너 블랙리스트 등록</Text>
        </TouchableOpacity>

        {/* 블랙리스트 목록 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>블랙리스트</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{blacklist.length}명</Text>
            </View>
          </View>

          {blacklist.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBox}>
                <MaterialCommunityIcons name="block-helper" size={36} color={SLATE} />
              </View>
              <Text style={styles.emptyTitle}>등록된 블랙리스트가 없습니다</Text>
              <Text style={styles.emptySub}>블랙리스트 등록 시 해당 트레이너의 슬롯 예약이 차단됩니다</Text>
            </View>
          ) : (
            blacklist.map((entry) => {
              const trainer = MOCK_TRAINERS.find((t) => t.id === entry.trainerId);
              return (
                <View key={entry.trainerId} style={styles.trainerCard}>
                  <View style={styles.trainerCardBar} />
                  <View style={styles.trainerCardInner}>
                    <View style={styles.avatarBox}>
                      <Text style={styles.avatarText}>
                        {entry.trainerName.slice(0, 1)}
                      </Text>
                    </View>
                    <View style={styles.trainerInfo}>
                      <Text style={styles.trainerName}>{entry.trainerName} 트레이너</Text>
                      {trainer && (
                        <Text style={styles.trainerSub}>
                          {trainer.region} · {trainer.specializations.slice(0, 2).join(', ')}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => setRemoveTarget({ trainerId: entry.trainerId, trainerName: entry.trainerName })}
                    >
                      <Text style={styles.removeBtnText}>해제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 해제 확인 모달 */}
      <Modal
        visible={!!removeTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setRemoveTarget(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>블랙리스트 해제</Text>
            <Text style={styles.confirmMsg}>
              <Text style={{ fontWeight: '800', color: COLORS.text }}>{removeTarget?.trainerName} 트레이너</Text>
              {`를\n블랙리스트에서 해제하시겠습니까?`}
            </Text>
            <Text style={styles.confirmSub}>해제 후 해당 트레이너는 이 헬스장의 슬롯을 다시 예약할 수 있습니다.</Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnCancel]}
                onPress={() => setRemoveTarget(null)}
              >
                <Text style={styles.confirmBtnCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnRemove]}
                onPress={handleRemoveConfirm}
              >
                <Text style={styles.confirmBtnRemoveText}>해제하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 트레이너 추가 모달 */}
      <Modal
        visible={addModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>트레이너 선택</Text>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="이름 또는 지역으로 검색"
              placeholderTextColor={COLORS.textSecondary}
              value={search}
              onChangeText={setSearch}
            />

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalList}>
              {filtered.length === 0 ? (
                <Text style={styles.modalEmptyText}>검색 결과가 없습니다</Text>
              ) : (
                filtered.map((trainer) => (
                  <View key={trainer.id} style={styles.modalTrainerRow}>
                    <View style={styles.trainerInfo}>
                      <Text style={styles.trainerName}>{trainer.name} 트레이너</Text>
                      <Text style={styles.trainerSub}>
                        {trainer.region} · {trainer.specializations.slice(0, 2).join(', ')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.modalAddBtn}
                      onPress={() => {
                        handleAdd(trainer.id, trainer.name);
                        setAddModal(false);
                      }}
                    >
                      <Text style={styles.modalAddBtnText}>등록</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  banner: {
    backgroundColor: COLORS.error + '18',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.error + '44',
    padding: 14,
  },
  bannerText: { fontSize: 13, color: COLORS.error, lineHeight: 18 },

  content: { padding: 16, gap: 14, paddingBottom: 40 },

  addBtn: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  countBadge: {
    backgroundColor: COLORS.error + '22',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.error },

  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyIconBox: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: DARK },
  emptySub: { fontSize: 13, color: '#94A3B8', fontWeight: '500', textAlign: 'center', paddingHorizontal: 16 },

  trainerCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  trainerCardBar: { width: 4, backgroundColor: COLORS.error },
  trainerCardInner: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.error + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.error },
  trainerInfo: { flex: 1, gap: 2 },
  trainerName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  trainerSub: { fontSize: 12, color: COLORS.textSecondary },

  removeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  removeBtnText: { color: COLORS.error, fontWeight: '700', fontSize: 13 },

  // 해제 확인 모달
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    gap: 14,
  },
  confirmTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  confirmMsg: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
  confirmSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
  confirmBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmBtnCancel: { backgroundColor: COLORS.surfaceElevated },
  confirmBtnCancelText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 15 },
  confirmBtnRemove: { backgroundColor: COLORS.error },
  confirmBtnRemoveText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // 트레이너 추가 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  modalClose: { fontSize: 18, color: COLORS.textSecondary, padding: 4 },

  searchInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  modalList: { maxHeight: 400 },
  modalEmptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },

  modalTrainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  modalAddBtn: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  modalAddBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
