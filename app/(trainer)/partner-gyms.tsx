import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, FlatList, StyleSheet, TextInput,
  TouchableOpacity, SafeAreaView, Modal, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { usePartnerStore } from '../../store/partnerStore';
import { useNotificationStore } from '../../store/notificationStore';
import { MOCK_GYM_ADMINS } from '../../data/users';
import { useMergedGyms } from '../../hooks/useFilteredGyms';
import { COLORS } from '../../utils/constants';
import { Gym } from '../../types';

type ConfirmAction =
  | { kind: 'cancelApply';    requestId: string; gymName: string }
  | { kind: 'removePartner';  gymId: string;     gymName: string }
  | { kind: 'declineInvite';  requestId: string; gymName: string };

const ACCENT = '#5B8DEF';

const STATUS_LABEL: Record<string, string> = {
  pending: '검토 중',
  approved: '승인됨',
  rejected: '거절됨',
};
const STATUS_COLOR: Record<string, string> = {
  pending: COLORS.warning,
  approved: COLORS.success,
  rejected: COLORS.error,
};

export default function PartnerGymsScreen() {
  const router = useRouter();
  const { trainer } = useAuthStore();
  const allRequests = usePartnerStore(s => s.requests);
  const removedPartnerIds = usePartnerStore(s => s.removedPartnerIds);
  const { applyToGym, cancelRequest, approve, removePartner } = usePartnerStore();
  const { addNotification } = useNotificationStore();
  const mergedGyms = useMergedGyms();

  const [applyModal, setApplyModal] = useState(false);
  const [applySearch, setApplySearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<{ city: string; district?: string } | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  if (!trainer) return null;

  const myRequests = useMemo(
    () => allRequests.filter(r => r.trainerId === trainer.id),
    [allRequests, trainer.id]
  );

  const approvedGymIds = useMemo(
    () => myRequests.filter(r => r.status === 'approved').map(r => r.gymId),
    [myRequests]
  );

  const allPartnerGymIds = useMemo(() => {
    const base = [...new Set([...trainer.partnerGymIds, ...approvedGymIds])];
    return base.filter(gymId => !(removedPartnerIds[gymId] ?? []).includes(trainer.id));
  }, [trainer.partnerGymIds, approvedGymIds, removedPartnerIds, trainer.id]);

  const partnerGyms = useMemo(
    () => mergedGyms.filter(g => allPartnerGymIds.includes(g.id)),
    [allPartnerGymIds, mergedGyms]
  );

  const activeRequests = useMemo(
    () => myRequests.filter(r => r.status === 'pending' || r.status === 'rejected'),
    [myRequests]
  );

  const invites = useMemo(
    () => myRequests.filter(r => r.type === 'invite' && r.status === 'pending'),
    [myRequests]
  );

  const pendingGymIds = useMemo(
    () => myRequests.filter(r => r.status === 'pending').map(r => r.gymId),
    [myRequests]
  );

  // 신청 가능한 헬스장 풀 (이미 파트너이거나 신청 대기 중인 곳 제외)
  const applyableBase = useMemo(
    () => mergedGyms.filter(g =>
      !allPartnerGymIds.includes(g.id) && !pendingGymIds.includes(g.id)
    ),
    [allPartnerGymIds, pendingGymIds, mergedGyms]
  );

  // 입력어에 대한 자동완성 후보 (지역 + 헬스장). 지역이 이미 선택된 경우 그 안에서만 헬스장 추천.
  const suggestions = useMemo(() => {
    const q = applySearch.trim();
    const empty = { regions: [] as { city: string; district?: string; label: string }[], gyms: [] as Gym[] };
    if (!q) return empty;
    const lq = q.toLowerCase();
    const pool = regionFilter
      ? applyableBase.filter(g => g.city === regionFilter.city && (!regionFilter.district || g.district === regionFilter.district))
      : applyableBase;

    const regionMap = new Map<string, { city: string; district?: string; label: string }>();
    if (!regionFilter) {
      applyableBase.forEach(g => {
        if (g.city.includes(q)) regionMap.set(g.city, { city: g.city, label: g.city });
        const cd = `${g.city} ${g.district}`;
        if (g.district.includes(q) || cd.includes(q))
          regionMap.set(cd, { city: g.city, district: g.district, label: cd });
      });
    }
    return {
      regions: Array.from(regionMap.values()).slice(0, 4),
      gyms: pool.filter(g => g.name.toLowerCase().includes(lq)).slice(0, 5),
    };
  }, [applyableBase, applySearch, regionFilter]);

  const applyableGyms = useMemo(() => {
    let list = applyableBase;
    if (regionFilter)
      list = list.filter(g =>
        g.city === regionFilter.city &&
        (!regionFilter.district || g.district === regionFilter.district)
      );
    if (applySearch.trim()) {
      const q = applySearch.toLowerCase();
      list = list.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.address.toLowerCase().includes(q) ||
        g.facilities.some(f => f.toLowerCase().includes(q))
      );
    }
    return list;
  }, [applyableBase, regionFilter, applySearch]);

  const handleApply = (gym: Gym) => {
    applyToGym({
      gymId: gym.id, gymName: gym.name,
      trainerId: trainer.id, trainerName: trainer.name,
      trainerTagline: trainer.tagline, trainerSpecializations: trainer.trainingGoals,
    });
    const gymAdminId = MOCK_GYM_ADMINS.find((a) => a.gymId === gym.id)?.id ?? '';
    if (gymAdminId) {
      addNotification({
        type: 'partner_request', targetRole: 'gym', userId: gymAdminId,
        title: '파트너 입점 신청이 도착했습니다',
        body: `${trainer.name} 트레이너가 입점을 신청했습니다. 검토 후 승인해주세요.`,
        meta: { trainerId: trainer.id },
      });
    }
    Alert.alert('신청 완료', `${gym.name}에 입점 신청을 보냈습니다.\n관리자 승인 후 파트너로 등록됩니다.`);
  };

  const handleCancelApply = (requestId: string, gymName: string) => {
    setConfirmAction({ kind: 'cancelApply', requestId, gymName });
  };

  const handleAcceptInvite = (requestId: string, gymName: string) => {
    const req = myRequests.find(r => r.id === requestId);
    approve(requestId);
    if (req) {
      const gymAdminId = MOCK_GYM_ADMINS.find((a) => a.gymId === req.gymId)?.id ?? '';
      if (gymAdminId) {
        addNotification({
          type: 'partner_approved', targetRole: 'gym', userId: gymAdminId,
          title: '초대가 수락되었습니다',
          body: `${trainer.name} 트레이너가 ${gymName} 초대를 수락했습니다. 파트너로 등록되었습니다.`,
        });
      }
    }
    Alert.alert('수락 완료', `${gymName}의 초대를 수락했습니다. 파트너로 등록되었습니다.`);
  };

  const handleDeclineInvite = (requestId: string, gymName: string) => {
    setConfirmAction({ kind: 'declineInvite', requestId, gymName });
  };

  const handleRemovePartner = (gymId: string, gymName: string) => {
    setConfirmAction({ kind: 'removePartner', gymId, gymName });
  };

  const executeConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.kind === 'cancelApply') {
      cancelRequest(confirmAction.requestId);
    } else if (confirmAction.kind === 'removePartner') {
      removePartner(confirmAction.gymId, trainer.id);
    } else if (confirmAction.kind === 'declineInvite') {
      const req = myRequests.find(r => r.id === confirmAction.requestId);
      cancelRequest(confirmAction.requestId);
      if (req) {
        const gymAdminId = MOCK_GYM_ADMINS.find((a) => a.gymId === req.gymId)?.id ?? '';
        if (gymAdminId) {
          addNotification({
            type: 'partner_rejected', targetRole: 'gym', userId: gymAdminId,
            title: '초대가 거절되었습니다',
            body: `${trainer.name} 트레이너가 ${confirmAction.gymName} 초대를 거절했습니다.`,
          });
        }
      }
    }
    setConfirmAction(null);
  };

  return (
    <SafeAreaView style={st.container}>

      {/* ── 헤더 ── */}
      <View style={st.header}>
        <TouchableOpacity
          onPress={() => router.navigate('/(trainer)/more' as any)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color={ACCENT} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>파트너 헬스장</Text>
          <Text style={st.headerSub}>
            {partnerGyms.length > 0 ? `${partnerGyms.length}곳 파트너 계약 중` : '파트너 헬스장을 추가해보세요'}
          </Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {/* ── 요약 배너 ── */}
      <View style={st.banner}>
        <View style={st.bannerItem}>
          <Text style={st.bannerNum}>{partnerGyms.length}</Text>
          <Text style={st.bannerLabel}>파트너</Text>
        </View>
        <View style={st.bannerDivider} />
        <View style={st.bannerItem}>
          <Text style={st.bannerNum}>{activeRequests.length}</Text>
          <Text style={st.bannerLabel}>신청 중</Text>
        </View>
        <View style={st.bannerDivider} />
        <View style={st.bannerItem}>
          <Text style={[st.bannerNum, invites.length > 0 && { color: COLORS.warning }]}>
            {invites.length}
          </Text>
          <Text style={st.bannerLabel}>받은 초대</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>

        {/* ── 받은 초대 ── */}
        {invites.length > 0 && (
          <View style={st.section}>
            <View style={st.sectionHeader}>
              <View style={[st.sectionIconBox, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="email-outline" size={14} color={COLORS.warning} />
              </View>
              <Text style={st.sectionTitle}>받은 초대</Text>
              <View style={st.sectionBadge}>
                <Text style={st.sectionBadgeText}>{invites.length}</Text>
              </View>
            </View>

            {invites.map(req => (
              <View key={req.id} style={st.inviteCard}>
                <View style={st.inviteTopRow}>
                  <View style={st.inviteIconBox}>
                    <MaterialCommunityIcons name="email-fast-outline" size={20} color={COLORS.warning} />
                  </View>
                  <View style={st.inviteInfo}>
                    <Text style={st.inviteGymName}>{req.gymName}</Text>
                    <Text style={st.inviteSub}>헬스장 측에서 입점 초대를 보냈습니다</Text>
                    <Text style={st.inviteDate}>{req.createdAt}</Text>
                  </View>
                </View>
                <View style={st.inviteActions}>
                  <TouchableOpacity
                    style={st.declineBtn}
                    onPress={() => handleDeclineInvite(req.id, req.gymName)}
                  >
                    <Text style={st.declineBtnText}>거절</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={st.acceptBtn}
                    onPress={() => handleAcceptInvite(req.id, req.gymName)}
                  >
                    <MaterialCommunityIcons name="check" size={14} color="#fff" />
                    <Text style={st.acceptBtnText}>수락하기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── 파트너 헬스장 ── */}
        <View style={st.section}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIconBox, { backgroundColor: ACCENT + '15' }]}>
              <MaterialCommunityIcons name="handshake-outline" size={14} color={ACCENT} />
            </View>
            <Text style={st.sectionTitle}>파트너 헬스장</Text>
            <Text style={st.sectionCount}>{partnerGyms.length}곳</Text>
          </View>

          {partnerGyms.length === 0 && (
            <View style={st.emptyBox}>
              <View style={st.emptyIconBox}>
                <MaterialCommunityIcons name="domain-off" size={32} color={COLORS.textMuted} />
              </View>
              <Text style={st.emptyTitle}>파트너 헬스장이 없습니다</Text>
              <Text style={st.emptySub}>아래 버튼으로 헬스장에 입점 신청하세요</Text>
            </View>
          )}

          {partnerGyms.map(gym => (
            <View key={gym.id} style={st.partnerCard}>
              <View style={st.partnerAccentBar} />
              <View style={st.partnerCardInner}>
                {/* 상단: 아이콘 + 정보 */}
                <View style={st.partnerTopRow}>
                  <View style={st.partnerIconBox}>
                    <MaterialCommunityIcons name="dumbbell" size={24} color={ACCENT} />
                  </View>
                  <View style={st.partnerInfo}>
                    <View style={st.partnerNameRow}>
                      <Text style={st.partnerGymName}>{gym.name}</Text>
                      <View style={st.partnerChip}>
                        <MaterialCommunityIcons name="handshake" size={10} color={ACCENT} />
                        <Text style={st.partnerChipText}>파트너</Text>
                      </View>
                    </View>
                    <Text style={st.partnerAddr} numberOfLines={1}>{gym.address}</Text>
                    <View style={st.partnerMeta}>
                      <MaterialCommunityIcons name="star" size={12} color={COLORS.warning} />
                      <Text style={st.partnerRating}>{gym.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                </View>

                {/* 구분선 */}
                <View style={st.partnerDivider} />

                {/* 하단: 액션 버튼 */}
                <View style={st.partnerActionRow}>
                  <TouchableOpacity
                    style={st.removeBtnInCard}
                    onPress={() => handleRemovePartner(gym.id, gym.name)}
                  >
                    <MaterialCommunityIcons name="link-off" size={12} color={COLORS.error} />
                    <Text style={st.removeBtnInCardText}>파트너 해제</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={st.slotBtn}
                    onPress={() => router.push({ pathname: '/(trainer)/slots', params: { gymId: gym.id } } as any)}
                  >
                    <MaterialCommunityIcons name="calendar-clock" size={14} color="#fff" />
                    <Text style={st.slotBtnText}>예약하기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ── 신청 현황 ── */}
        <View style={st.section}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIconBox, { backgroundColor: COLORS.primaryPale }]}>
              <MaterialCommunityIcons name="file-send-outline" size={14} color={ACCENT} />
            </View>
            <Text style={st.sectionTitle}>신청 현황</Text>
          </View>

          {activeRequests.length === 0 && (
            <View style={st.emptyBox}>
              <Text style={st.emptySub}>진행 중인 신청이 없습니다</Text>
            </View>
          )}

          {activeRequests.map(req => (
            <View key={req.id} style={st.requestCard}>
              <View style={[st.requestAccentBar, { backgroundColor: STATUS_COLOR[req.status] }]} />
              <View style={st.requestCardInner}>
                <View style={[st.requestIconBox, { backgroundColor: STATUS_COLOR[req.status] + '15' }]}>
                  <MaterialCommunityIcons name="dumbbell" size={18} color={STATUS_COLOR[req.status]} />
                </View>
                <View style={st.requestInfo}>
                  <Text style={st.requestGymName}>{req.gymName}</Text>
                  <Text style={st.requestDate}>신청일 {req.createdAt}</Text>
                </View>
                <View style={st.requestRight}>
                  <View style={[st.statusBadge, {
                    backgroundColor: STATUS_COLOR[req.status] + '15',
                    borderColor: STATUS_COLOR[req.status] + '40',
                  }]}>
                    <View style={[st.statusDot, { backgroundColor: STATUS_COLOR[req.status] }]} />
                    <Text style={[st.statusText, { color: STATUS_COLOR[req.status] }]}>
                      {STATUS_LABEL[req.status]}
                    </Text>
                  </View>
                  {req.status === 'pending' && (
                    <TouchableOpacity
                      style={st.cancelBtn}
                      onPress={() => handleCancelApply(req.id, req.gymName)}
                    >
                      <Text style={st.cancelBtnText}>취소</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={st.fab} onPress={() => { setApplySearch(''); setRegionFilter(null); setSuggestOpen(false); setApplyModal(true); }}>
        <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        <Text style={st.fabText}>새 헬스장 신청</Text>
      </TouchableOpacity>

      {/* ── 확인 모달 ── */}
      <Modal
        visible={confirmAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmAction(null)}
      >
        <TouchableOpacity style={cf.overlay} activeOpacity={1} onPress={() => setConfirmAction(null)}>
          <TouchableOpacity style={cf.box} activeOpacity={1} onPress={() => {}}>
            {confirmAction?.kind === 'removePartner' && (
              <>
                <View style={[cf.iconBox, { backgroundColor: '#FEF2F2' }]}>
                  <MaterialCommunityIcons name="link-off" size={36} color={COLORS.error} />
                </View>
                <Text style={cf.title}>파트너 해제</Text>
                <Text style={cf.body}>
                  {confirmAction.gymName}과의{'\n'}파트너 관계를 해제하시겠습니까?{'\n\n'}
                  <Text style={{ color: COLORS.error, fontWeight: '700' }}>해제 후 해당 헬스장의 슬롯 예약이 불가능해집니다.</Text>
                </Text>
                <View style={cf.btns}>
                  <TouchableOpacity style={cf.cancelBtn} onPress={() => setConfirmAction(null)}>
                    <Text style={cf.cancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[cf.confirmBtn, { backgroundColor: COLORS.error }]} onPress={executeConfirm}>
                    <Text style={cf.confirmText}>해제</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {confirmAction?.kind === 'cancelApply' && (
              <>
                <View style={[cf.iconBox, { backgroundColor: '#FFF7ED' }]}>
                  <MaterialCommunityIcons name="file-remove-outline" size={36} color={COLORS.warning} />
                </View>
                <Text style={cf.title}>신청 취소</Text>
                <Text style={cf.body}>{confirmAction.gymName}{'\n'}입점 신청을 취소하시겠습니까?</Text>
                <View style={cf.btns}>
                  <TouchableOpacity style={cf.cancelBtn} onPress={() => setConfirmAction(null)}>
                    <Text style={cf.cancelText}>아니오</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[cf.confirmBtn, { backgroundColor: COLORS.warning }]} onPress={executeConfirm}>
                    <Text style={cf.confirmText}>취소하기</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {confirmAction?.kind === 'declineInvite' && (
              <>
                <View style={[cf.iconBox, { backgroundColor: '#F8FAFC' }]}>
                  <MaterialCommunityIcons name="email-remove-outline" size={36} color={COLORS.textSecondary} />
                </View>
                <Text style={cf.title}>초대 거절</Text>
                <Text style={cf.body}>{confirmAction.gymName}의{'\n'}초대를 거절하시겠습니까?</Text>
                <View style={cf.btns}>
                  <TouchableOpacity style={cf.cancelBtn} onPress={() => setConfirmAction(null)}>
                    <Text style={cf.cancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[cf.confirmBtn, { backgroundColor: COLORS.error }]} onPress={executeConfirm}>
                    <Text style={cf.confirmText}>거절</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── 헬스장 신청 모달 ── */}
      <Modal visible={applyModal} animationType="slide" onRequestClose={() => setApplyModal(false)}>
        <SafeAreaView style={st.modalContainer}>
          <View style={st.modalNavBar}>
            <View style={{ width: 36 }} />
            <View>
              <Text style={st.modalTitle}>헬스장 신청</Text>
              <Text style={st.modalSubtitle}>입점할 헬스장을 선택하세요</Text>
            </View>
            <TouchableOpacity onPress={() => setApplyModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={st.searchZone}>
            <View style={st.modalSearchBox}>
              <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textSecondary} />
              <TextInput
                style={st.modalSearchInput}
                placeholder="지역·헬스장 이름·시설 검색"
                value={applySearch}
                onChangeText={(t) => { setApplySearch(t); setSuggestOpen(true); }}
                placeholderTextColor={COLORS.textSecondary}
                autoFocus
              />
              {applySearch.length > 0 && (
                <TouchableOpacity onPress={() => { setApplySearch(''); setSuggestOpen(false); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* 자동완성 추천 */}
            {suggestOpen && applySearch.trim().length > 0 && (suggestions.regions.length > 0 || suggestions.gyms.length > 0) && (
              <View style={st.suggestPanel}>
                {suggestions.regions.map(r => (
                  <TouchableOpacity
                    key={'r-' + r.label} style={st.suggestItem}
                    onPress={() => { setRegionFilter({ city: r.city, district: r.district }); setApplySearch(''); setSuggestOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color={ACCENT} />
                    <Text style={st.suggestText} numberOfLines={1}>{r.label}</Text>
                    <Text style={st.suggestTag}>지역</Text>
                  </TouchableOpacity>
                ))}
                {suggestions.gyms.map(g => (
                  <TouchableOpacity
                    key={'g-' + g.id} style={st.suggestItem}
                    onPress={() => { setApplySearch(g.name); setSuggestOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="dumbbell" size={16} color={ACCENT} />
                    <Text style={st.suggestText} numberOfLines={1}>{g.name}</Text>
                    <Text style={st.suggestTag}>헬스장</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* 선택된 지역 */}
          {regionFilter && (
            <View style={st.regionChipRow}>
              <View style={st.regionChip}>
                <MaterialCommunityIcons name="map-marker" size={13} color={ACCENT} />
                <Text style={st.regionChipText}>
                  {regionFilter.district ? `${regionFilter.city} ${regionFilter.district}` : regionFilter.city}
                </Text>
                <TouchableOpacity onPress={() => setRegionFilter(null)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <MaterialCommunityIcons name="close" size={14} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <FlatList
            data={applyableGyms}
            keyExtractor={item => item.id}
            contentContainerStyle={st.applyListContent}
            ItemSeparatorComponent={() => <View style={st.separator} />}
            ListEmptyComponent={
              <View style={st.emptyBox}>
                <MaterialCommunityIcons name="domain-off" size={44} color={COLORS.border} />
                <Text style={st.emptySub}>신청 가능한 헬스장이 없습니다</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={st.applyGymItem}>
                <View style={st.applyGymIcon}>
                  <MaterialCommunityIcons name="dumbbell" size={20} color={ACCENT} />
                </View>
                <View style={st.applyGymInfo}>
                  <Text style={st.applyGymName}>{item.name}</Text>
                  <Text style={st.applyGymAddress} numberOfLines={1}>{item.address}</Text>
                  <View style={st.applyGymMeta}>
                    <MaterialCommunityIcons name="star" size={12} color={COLORS.warning} />
                    <Text style={st.applyGymRating}>{item.rating.toFixed(1)}</Text>
                  </View>
                </View>
                <TouchableOpacity style={st.applyGymBtn} onPress={() => handleApply(item)}>
                  <MaterialCommunityIcons name="send-outline" size={13} color="#fff" />
                  <Text style={st.applyGymBtnText}>신청</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  // ── 헤더 ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },

  // ── 요약 배너 ──
  banner: {
    flexDirection: 'row',
    backgroundColor: ACCENT,
    paddingVertical: 14,
  },
  bannerItem: { flex: 1, alignItems: 'center', gap: 3 },
  bannerNum: { fontSize: 22, fontWeight: '900', color: '#fff' },
  bannerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  bannerDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },

  scroll: { padding: 16, gap: 4 },

  // ── 섹션 ──
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  sectionIconBox: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, flex: 1, letterSpacing: -0.2 },
  sectionCount: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  sectionBadge: {
    backgroundColor: COLORS.error, borderRadius: 10,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  sectionBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  // ── 빈 상태 ──
  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyIconBox: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary },

  // ── 받은 초대 카드 ──
  inviteCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: COLORS.warning + '50',
    gap: 12,
    shadowColor: COLORS.warning, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  inviteTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  inviteIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center',
  },
  inviteInfo: { flex: 1, gap: 3 },
  inviteGymName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  inviteSub: { fontSize: 12, color: '#92400E' },
  inviteDate: { fontSize: 11, color: COLORS.textSecondary },
  inviteActions: { flexDirection: 'row', gap: 8 },
  declineBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  declineBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  acceptBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 11, borderRadius: 10,
    backgroundColor: COLORS.warning,
  },
  acceptBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // ── 파트너 헬스장 카드 ──
  partnerCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16, marginBottom: 12,
    overflow: 'hidden',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: ACCENT + '20',
  },
  partnerAccentBar: { width: 4, backgroundColor: ACCENT },
  partnerCardInner: { flex: 1, padding: 14, gap: 11 },
  partnerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  partnerIconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: ACCENT + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  partnerInfo: { flex: 1, gap: 4 },
  partnerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  partnerGymName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  partnerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
    backgroundColor: ACCENT + '12',
    borderWidth: 1, borderColor: ACCENT + '30',
  },
  partnerChipText: { fontSize: 10, fontWeight: '800', color: ACCENT },
  partnerAddr: { fontSize: 12, color: COLORS.textSecondary },
  partnerMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  partnerRating: { fontSize: 12, fontWeight: '700', color: COLORS.warning },
  partnerDivider: { height: 1, backgroundColor: '#F1F5F9' },
  partnerActionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  removeBtnInCard: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: COLORS.error + '10',
    borderWidth: 1, borderColor: COLORS.error + '30',
  },
  removeBtnInCardText: { fontSize: 11, fontWeight: '700', color: COLORS.error },
  slotBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: ACCENT,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 2,
  },
  slotBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // ── 신청 현황 카드 ──
  requestCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14, marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  requestAccentBar: { width: 4 },
  requestCardInner: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    padding: 13, gap: 11,
  },
  requestIconBox: {
    width: 40, height: 40, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  requestInfo: { flex: 1, gap: 3 },
  requestGymName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  requestDate: { fontSize: 12, color: COLORS.textSecondary },
  requestRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 1,
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cancelBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    backgroundColor: COLORS.error + '10',
    borderWidth: 1, borderColor: COLORS.error + '30',
  },
  cancelBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.error },

  // ── FAB ──
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ACCENT,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28, shadowRadius: 6, elevation: 5,
  },
  fabText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // ── 신청 모달 ──
  modalContainer: { flex: 1, backgroundColor: '#F1F5F9' },
  modalNavBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  modalSubtitle: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 1 },
  modalSearchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12, paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  modalSearchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  searchZone: { position: 'relative', zIndex: 20 },
  suggestPanel: {
    position: 'absolute', top: 56, left: 12, right: 12, zIndex: 30,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 4, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 6,
  },
  suggestItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  suggestText: { flex: 1, fontSize: 14, color: COLORS.text },
  suggestTag: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  regionChipRow: { paddingHorizontal: 12, paddingBottom: 6 },
  regionChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    paddingLeft: 10, paddingRight: 8, paddingVertical: 6, borderRadius: 16,
    backgroundColor: ACCENT + '14', borderWidth: 1, borderColor: ACCENT + '40',
  },
  regionChipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  applyListContent: { paddingHorizontal: 16, paddingBottom: 40 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginLeft: 70 },
  applyGymItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  applyGymIcon: {
    width: 46, height: 46, borderRadius: 13,
    backgroundColor: ACCENT + '12', alignItems: 'center', justifyContent: 'center',
  },
  applyGymInfo: { flex: 1, gap: 3 },
  applyGymName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  applyGymAddress: { fontSize: 12, color: COLORS.textSecondary },
  applyGymMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  applyGymRating: { fontSize: 12, fontWeight: '600', color: COLORS.warning },
  applyGymBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: ACCENT,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
  },
  applyGymBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});

const cf = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  box: {
    width: 300, backgroundColor: '#fff', borderRadius: 20,
    padding: 24, alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  iconBox: {
    width: 68, height: 68, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  body: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  btns: { flexDirection: 'row', gap: 10, marginTop: 6, width: '100%' },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border,
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  confirmBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
  },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
