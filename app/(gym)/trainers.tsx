import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, SafeAreaView, Modal, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TrainerCard from '../../components/TrainerCard';
import { MOCK_TRAINERS } from '../../data/trainers';
import { MOCK_GYMS } from '../../data/gyms';
import { useAuthStore } from '../../store/authStore';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { usePartnerStore } from '../../store/partnerStore';
import { useNotificationStore } from '../../store/notificationStore';
import { COLORS } from '../../utils/constants';
import { Trainer } from '../../types';

type Tab = 'partners' | 'requests' | 'blacklist';

export default function GymTrainersScreen() {
  const router = useRouter();
  const { gymAdmin } = useAuthStore();
  const gym = MOCK_GYMS.find(g => g.id === gymAdmin?.gymId);
  const GYM_ID = gymAdmin?.gymId ?? 'gym_001';
  const GYM_NAME = gym?.name ?? '';
  const staticPartnerIds = gym?.partnerTrainerIds ?? [];

  const { isBlacklisted, blacklistTrainer, unblacklistTrainer, getBlacklist } = useGymSlotStore();
  useGymSlotStore(s => s.blacklists);

  const allRequests = usePartnerStore(s => s.requests);
  const removedMap = usePartnerStore(s => s.removedPartnerIds);
  const { approve, reject, removePartner, inviteTrainer, cancelRequest } = usePartnerStore();
  const { addNotification } = useNotificationStore();

  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>('partners');

  // 알림(입점 신청)에서 진입 시 '신청·초대' 탭으로 전환
  useEffect(() => {
    if (tabParam === 'requests') setTab('requests');
  }, [tabParam]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');

  type ConfirmAction =
    | { kind: 'approve';     requestId: string; name: string }
    | { kind: 'reject';      requestId: string; name: string }
    | { kind: 'remove';      trainer: Trainer }
    | { kind: 'blacklist';   trainerId: string; trainerName: string }
    | { kind: 'unblacklist'; trainerId: string; trainerName: string }
    | { kind: 'done';        message: string; icon: string; iconColor: string };
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const partnerIds = useMemo(() => {
    const removed = removedMap[GYM_ID] ?? [];
    const approved = allRequests
      .filter(r => r.gymId === GYM_ID && r.status === 'approved')
      .map(r => r.trainerId);
    const base = staticPartnerIds.filter(id => !removed.includes(id));
    const extra = approved.filter(id => !base.includes(id));
    return [...base, ...extra];
  }, [allRequests, removedMap, GYM_ID, staticPartnerIds]);

  const pendingRequests = useMemo(() =>
    allRequests.filter(r => r.gymId === GYM_ID && r.status === 'pending'),
    [allRequests, GYM_ID]
  );

  const rawBlacklists = useGymSlotStore(s => s.blacklists);
  const blacklistEntries = useMemo(() => rawBlacklists[GYM_ID] ?? [], [rawBlacklists, GYM_ID]);

  const partnerTrainers = useMemo(() => {
    let list = MOCK_TRAINERS.filter(t => partnerIds.includes(t.id));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.trainingGoals ?? []).some(s => s.includes(q))
      );
    }
    return list;
  }, [partnerIds, searchQuery]);

  const invitableTrainers = useMemo(() => {
    const pendingIds = pendingRequests.map(r => r.trainerId);
    let list = MOCK_TRAINERS.filter(t =>
      !partnerIds.includes(t.id) && !pendingIds.includes(t.id)
    );
    if (inviteSearch.trim()) {
      const q = inviteSearch.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.trainingGoals ?? []).some(s => s.includes(q))
      );
    }
    return list;
  }, [partnerIds, pendingRequests, inviteSearch]);

  const handleRemovePartner = (trainer: Trainer) => {
    setConfirmAction({ kind: 'remove', trainer });
  };

  const handleApprove = (requestId: string, trainerName: string) => {
    setConfirmAction({ kind: 'approve', requestId, name: trainerName });
  };

  const handleReject = (requestId: string, trainerName: string) => {
    setConfirmAction({ kind: 'reject', requestId, name: trainerName });
  };

  const handleInvite = (trainer: Trainer) => {
    inviteTrainer({
      gymId: GYM_ID, gymName: GYM_NAME,
      trainerId: trainer.id, trainerName: trainer.name,
      trainerTagline: trainer.tagline, trainerSpecializations: trainer.trainingGoals,
    });
    addNotification({
      type: 'partner_invite', targetRole: 'trainer', userId: trainer.id,
      title: '헬스장 초대가 도착했습니다',
      body: `${GYM_NAME}에서 파트너 초대를 보냈습니다. 확인 후 수락해주세요.`,
    });
    setInviteModal(false);
  };

  const executeConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.kind === 'approve') {
      const req = allRequests.find(r => r.id === confirmAction.requestId);
      approve(confirmAction.requestId);
      if (req) addNotification({
        type: 'partner_approved', targetRole: 'trainer', userId: req.trainerId,
        title: '파트너 승인 완료',
        body: `${GYM_NAME}과(와)의 파트너 계약이 승인되었습니다.`,
      });
      setConfirmAction({ kind: 'done', icon: 'check-circle', iconColor: '#4F63F5', message: `${confirmAction.name} 트레이너가 파트너로 승인되었습니다.` });
    } else if (confirmAction.kind === 'reject') {
      const req = allRequests.find(r => r.id === confirmAction.requestId);
      reject(confirmAction.requestId);
      if (req) addNotification({
        type: 'partner_rejected', targetRole: 'trainer', userId: req.trainerId,
        title: '파트너 신청이 거절되었습니다',
        body: `${GYM_NAME}에서 파트너 신청을 거절했습니다.`,
      });
      setConfirmAction({ kind: 'done', icon: 'clipboard-check-outline', iconColor: '#64748B', message: `${confirmAction.name} 트레이너의 신청을 거절했습니다.` });
    } else if (confirmAction.kind === 'remove') {
      const name = confirmAction.trainer.name;
      removePartner(GYM_ID, confirmAction.trainer.id);
      setConfirmAction({ kind: 'done', icon: 'account-remove', iconColor: '#EF4444', message: `${name} 트레이너와의\n파트너 관계가 해제되었습니다.` });
    } else if (confirmAction.kind === 'blacklist') {
      blacklistTrainer(GYM_ID, confirmAction.trainerId, confirmAction.trainerName);
      setConfirmAction({ kind: 'done', icon: 'account-alert', iconColor: '#EF4444', message: `${confirmAction.trainerName} 트레이너를\n블랙리스트에 등록했습니다.` });
    } else if (confirmAction.kind === 'unblacklist') {
      unblacklistTrainer(GYM_ID, confirmAction.trainerId);
      setConfirmAction({ kind: 'done', icon: 'account-check', iconColor: '#4F63F5', message: `${confirmAction.trainerName} 트레이너를\n블랙리스트에서 해제했습니다.` });
    }
  };

  const applicationRequests = useMemo(() => pendingRequests.filter(r => r.type === 'application'), [pendingRequests]);
  const inviteRequests = useMemo(() => pendingRequests.filter(r => r.type === 'invite'), [pendingRequests]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 탭 바 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'partners' && styles.tabActive]}
          onPress={() => setTab('partners')}
        >
          <Text style={[styles.tabText, tab === 'partners' && styles.tabTextActive]}>
            파트너 {partnerTrainers.length}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'requests' && styles.tabActive]}
          onPress={() => setTab('requests')}
        >
          <View style={styles.tabLabelRow}>
            <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>신청·초대</Text>
            {pendingRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'blacklist' && styles.tabActiveRed]}
          onPress={() => setTab('blacklist')}
        >
          <View style={styles.tabLabelRow}>
            <Text style={[styles.tabText, tab === 'blacklist' && styles.tabTextRed]}>블랙리스트</Text>
            {blacklistEntries.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{blacklistEntries.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* ── 파트너 탭 ── */}
      {tab === 'partners' && (
        <>
          <View style={styles.searchRow}>
            <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="이름 또는 전문분야 검색"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <FlatList
            data={partnerTrainers}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <Text style={styles.listCount}>파트너 트레이너 {partnerTrainers.length}명</Text>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIconBox}>
                  <MaterialCommunityIcons name="account-off-outline" size={36} color="#64748B" />
                </View>
                <Text style={styles.emptyTitle}>
                  {searchQuery ? '검색 결과가 없습니다' : '등록된 파트너 트레이너가 없습니다'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const blacklisted = isBlacklisted(GYM_ID, item.id);
              return (
                <View style={styles.partnerRow}>
                  <View style={styles.partnerCardWrap}>
                    <TrainerCard trainer={item} onPress={() => router.push(`/trainer/${item.id}`)} />
                    {blacklisted && (
                      <View style={styles.blacklistBadge} pointerEvents="none">
                        <MaterialCommunityIcons name="alert-circle" size={11} color={COLORS.error} />
                        <Text style={styles.blacklistBadgeText}>블랙리스트</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.partnerActionRow}>
                    {blacklisted ? (
                      <TouchableOpacity
                        style={styles.unblacklistBtn}
                        onPress={() => setConfirmAction({ kind: 'unblacklist', trainerId: item.id, trainerName: item.name })}
                      >
                        <MaterialCommunityIcons name="account-check-outline" size={13} color="#7C3AED" />
                        <Text style={styles.unblacklistBtnText}>블랙리스트 해제</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.blacklistBtn}
                        onPress={() => setConfirmAction({ kind: 'blacklist', trainerId: item.id, trainerName: item.name })}
                      >
                        <MaterialCommunityIcons name="account-alert-outline" size={13} color={COLORS.error} />
                        <Text style={styles.blacklistBtnText}>블랙리스트</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemovePartner(item)}>
                      <MaterialCommunityIcons name="account-remove-outline" size={15} color={COLORS.error} />
                      <Text style={styles.removeBtnText}>해제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
          <TouchableOpacity style={styles.fab} onPress={() => { setInviteSearch(''); setInviteModal(true); }}>
            <MaterialCommunityIcons name="account-plus" size={22} color="#fff" />
            <Text style={styles.fabText}>트레이너 초대</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── 신청·초대 탭 ── */}
      {tab === 'requests' && (
        <ScrollView contentContainerStyle={styles.requestsContent} showsVerticalScrollIndicator={false}>
          {pendingRequests.length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyIconBox}>
                <MaterialCommunityIcons name="inbox-outline" size={36} color="#64748B" />
              </View>
              <Text style={styles.emptyTitle}>대기 중인 신청·초대가 없습니다</Text>
            </View>
          )}

          {/* 트레이너 입점 신청 */}
          {applicationRequests.length > 0 && (
            <>
              <Text style={styles.groupLabel}>입점 신청</Text>
              {applicationRequests.map(req => (
                <View key={req.id} style={styles.requestCard}>
                  <View style={[styles.reqCardBar, { backgroundColor: COLORS.primary }]} />
                  <View style={styles.reqCardInner}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarBlue}>
                      <MaterialCommunityIcons name="account" size={22} color={COLORS.primary} />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardName}>{req.trainerName} 트레이너</Text>
                      {req.trainerTagline && (
                        <Text style={styles.cardTagline}>{req.trainerTagline}</Text>
                      )}
                      <View style={styles.specRow}>
                        {req.trainerSpecializations?.map(s => (
                          <View key={s} style={styles.specChip}>
                            <Text style={styles.specChipText}>{s}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.metaDate}>신청일 {req.createdAt}</Text>
                    <TouchableOpacity
                      style={styles.profileLink}
                      onPress={() => router.push(`/trainer/${req.trainerId}`)}
                    >
                      <Text style={styles.profileLinkText}>프로필 보기</Text>
                      <MaterialCommunityIcons name="chevron-right" size={15} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleReject(req.id, req.trainerName)}
                    >
                      <Text style={styles.rejectBtnText}>거절</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleApprove(req.id, req.trainerName)}
                    >
                      <Text style={styles.approveBtnText}>승인</Text>
                    </TouchableOpacity>
                  </View>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* 보낸 초대 */}
          {inviteRequests.length > 0 && (
            <>
              <Text style={styles.groupLabel}>보낸 초대</Text>
              {inviteRequests.map(req => (
                <View key={req.id} style={styles.inviteSentCard}>
                  <View style={[styles.reqCardBar, { backgroundColor: COLORS.secondary }]} />
                  <View style={styles.reqCardInner}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarCoral}>
                      <MaterialCommunityIcons name="account" size={22} color={COLORS.secondary} />
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.inviteNameRow}>
                        <Text style={styles.cardName}>{req.trainerName} 트레이너</Text>
                        <View style={styles.pendingPill}>
                          <View style={styles.pendingDot} />
                          <Text style={styles.pendingPillText}>답변 대기</Text>
                        </View>
                      </View>
                      {req.trainerTagline && (
                        <Text style={[styles.cardTagline, { color: COLORS.secondary }]}>{req.trainerTagline}</Text>
                      )}
                      {req.trainerSpecializations && req.trainerSpecializations.length > 0 && (
                        <View style={styles.specRow}>
                          {req.trainerSpecializations.map(s => (
                            <View key={s} style={styles.specChipCoral}>
                              <Text style={styles.specChipCoralText}>{s}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.inviteFooter}>
                    <Text style={styles.metaDate}>초대일 {req.createdAt}</Text>
                    <TouchableOpacity style={styles.cancelLink} onPress={() => cancelRequest(req.id)}>
                      <MaterialCommunityIcons name="close-circle-outline" size={14} color={COLORS.error} />
                      <Text style={styles.cancelLinkText}>초대 취소</Text>
                    </TouchableOpacity>
                  </View>
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── 블랙리스트 탭 ── */}
      {tab === 'blacklist' && (
        <ScrollView contentContainerStyle={styles.requestsContent} showsVerticalScrollIndicator={false}>
          {/* 안내 배너 */}
          <View style={styles.blacklistBanner}>
            <MaterialCommunityIcons name="shield-alert-outline" size={16} color="#7C3AED" />
            <Text style={styles.blacklistBannerText}>
              블랙리스트 트레이너는 이 헬스장의 슬롯을 예약할 수 없습니다.
            </Text>
          </View>

          {blacklistEntries.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIconBox, { backgroundColor: '#F5F3FF' }]}>
                <MaterialCommunityIcons name="shield-check-outline" size={36} color="#7C3AED" />
              </View>
              <Text style={styles.emptyTitle}>블랙리스트가 비어 있습니다</Text>
              <Text style={styles.emptyText}>제한된 트레이너가 없습니다</Text>
            </View>
          ) : (
            <>
              <Text style={styles.groupLabel}>등록된 트레이너 {blacklistEntries.length}명</Text>
              {blacklistEntries.map(entry => {
                const trainer = MOCK_TRAINERS.find(t => t.id === entry.trainerId);
                return (
                  <View key={entry.trainerId} style={styles.blacklistCard}>
                    <View style={styles.blCardAccent} />
                    <View style={styles.blCardInner}>
                      <View style={styles.blCardLeft}>
                        <View style={styles.blAvatar}>
                          <Text style={styles.blAvatarText}>{entry.trainerName.charAt(0)}</Text>
                        </View>
                        <View style={styles.blInfo}>
                          <Text style={styles.blName}>{entry.trainerName} 트레이너</Text>
                          {trainer?.tagline ? (
                            <Text style={styles.blTagline} numberOfLines={1}>{trainer.tagline}</Text>
                          ) : null}
                          {(trainer?.trainingGoals ?? []).length > 0 && (
                            <View style={styles.blSpecRow}>
                              {(trainer?.trainingGoals ?? []).slice(0, 2).map(s => (
                                <View key={s} style={styles.blSpecChip}>
                                  <Text style={styles.blSpecText}>{s}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.blActions}>
                        {trainer && (
                          <TouchableOpacity
                            style={styles.blProfileBtn}
                            onPress={() => router.push(`/trainer/${entry.trainerId}`)}
                          >
                            <MaterialCommunityIcons name="account-eye-outline" size={13} color={COLORS.primary} />
                            <Text style={styles.blProfileBtnText}>프로필</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.blRemoveBtn}
                          onPress={() => setConfirmAction({ kind: 'unblacklist', trainerId: entry.trainerId, trainerName: entry.trainerName })}
                        >
                          <MaterialCommunityIcons name="account-check-outline" size={13} color="#7C3AED" />
                          <Text style={styles.blRemoveBtnText}>해제</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* 확인/결과 모달 */}
      <Modal
        visible={confirmAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmAction(null)}
      >
        <TouchableOpacity style={cfStyles.overlay} activeOpacity={1} onPress={() => setConfirmAction(null)}>
          <TouchableOpacity style={cfStyles.box} activeOpacity={1} onPress={() => {}}>
            {confirmAction?.kind === 'approve' && (
              <>
                <View style={[cfStyles.iconBox, { backgroundColor: '#ECFDF9' }]}>
                  <MaterialCommunityIcons name="account-check-outline" size={36} color="#4F63F5" />
                </View>
                <Text style={cfStyles.title}>입점 신청 승인</Text>
                <Text style={cfStyles.body}>{confirmAction.name} 트레이너를{'\n'}파트너로 승인하시겠습니까?</Text>
                <View style={cfStyles.btns}>
                  <TouchableOpacity style={cfStyles.cancelBtn} onPress={() => setConfirmAction(null)}>
                    <Text style={cfStyles.cancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={cfStyles.confirmBtn} onPress={executeConfirm}>
                    <Text style={cfStyles.confirmText}>승인</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {confirmAction?.kind === 'reject' && (
              <>
                <View style={[cfStyles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                  <MaterialCommunityIcons name="account-cancel-outline" size={36} color="#EF4444" />
                </View>
                <Text style={cfStyles.title}>신청 거절</Text>
                <Text style={cfStyles.body}>{confirmAction.name} 트레이너의{'\n'}입점 신청을 거절하시겠습니까?</Text>
                <View style={cfStyles.btns}>
                  <TouchableOpacity style={cfStyles.cancelBtn} onPress={() => setConfirmAction(null)}>
                    <Text style={cfStyles.cancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[cfStyles.confirmBtn, cfStyles.rejectConfirmBtn]} onPress={executeConfirm}>
                    <Text style={cfStyles.confirmText}>거절</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {confirmAction?.kind === 'remove' && (
              <>
                <View style={[cfStyles.iconBox, { backgroundColor: '#FFFBEB' }]}>
                  <MaterialCommunityIcons name="account-minus-outline" size={36} color="#F59E0B" />
                </View>
                <Text style={cfStyles.title}>파트너 해제</Text>
                <Text style={cfStyles.body}>{confirmAction.trainer.name} 트레이너를{'\n'}파트너에서 해제하시겠습니까?{'\n\n'}해제 시 해당 트레이너는 이 헬스장의 슬롯 예약이 불가능해집니다.</Text>
                <View style={cfStyles.btns}>
                  <TouchableOpacity style={cfStyles.cancelBtn} onPress={() => setConfirmAction(null)}>
                    <Text style={cfStyles.cancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[cfStyles.confirmBtn, cfStyles.rejectConfirmBtn]} onPress={executeConfirm}>
                    <Text style={cfStyles.confirmText}>해제</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {confirmAction?.kind === 'blacklist' && (
              <>
                <View style={[cfStyles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                  <MaterialCommunityIcons name="account-alert-outline" size={36} color="#EF4444" />
                </View>
                <Text style={cfStyles.title}>블랙리스트 등록</Text>
                <Text style={cfStyles.body}>
                  {confirmAction.trainerName} 트레이너를{'\n'}블랙리스트에 등록하시겠습니까?{'\n\n'}
                  <Text style={{ color: COLORS.error, fontWeight: '700' }}>등록 후 이 헬스장의 슬롯을 예약할 수 없게 됩니다.</Text>
                </Text>
                <View style={cfStyles.btns}>
                  <TouchableOpacity style={cfStyles.cancelBtn} onPress={() => setConfirmAction(null)}>
                    <Text style={cfStyles.cancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[cfStyles.confirmBtn, cfStyles.rejectConfirmBtn]} onPress={executeConfirm}>
                    <Text style={cfStyles.confirmText}>등록</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {confirmAction?.kind === 'unblacklist' && (
              <>
                <View style={[cfStyles.iconBox, { backgroundColor: '#F5F3FF' }]}>
                  <MaterialCommunityIcons name="account-check-outline" size={36} color="#7C3AED" />
                </View>
                <Text style={cfStyles.title}>블랙리스트 해제</Text>
                <Text style={cfStyles.body}>{confirmAction.trainerName} 트레이너를{'\n'}블랙리스트에서 해제하시겠습니까?</Text>
                <View style={cfStyles.btns}>
                  <TouchableOpacity style={cfStyles.cancelBtn} onPress={() => setConfirmAction(null)}>
                    <Text style={cfStyles.cancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[cfStyles.confirmBtn, { backgroundColor: '#7C3AED' }]} onPress={executeConfirm}>
                    <Text style={cfStyles.confirmText}>해제</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {confirmAction?.kind === 'done' && (
              <>
                <View style={[cfStyles.iconBox, { backgroundColor: confirmAction.iconColor + '18' }]}>
                  <MaterialCommunityIcons name={confirmAction.icon as any} size={36} color={confirmAction.iconColor} />
                </View>
                <Text style={cfStyles.body}>{confirmAction.message}</Text>
                <TouchableOpacity style={cfStyles.singleBtn} onPress={() => setConfirmAction(null)}>
                  <Text style={cfStyles.confirmText}>확인</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 트레이너 초대 모달 */}
      <Modal visible={inviteModal} animationType="slide" onRequestClose={() => setInviteModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalNavBar}>
            <View style={{ width: 36 }} />
            <Text style={styles.modalTitle}>트레이너 초대</Text>
            <TouchableOpacity onPress={() => setInviteModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchBox}>
            <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="이름 또는 전문분야로 검색"
              value={inviteSearch}
              onChangeText={setInviteSearch}
              placeholderTextColor={COLORS.textSecondary}
              autoFocus
            />
          </View>

          <FlatList
            data={invitableTrainers}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.inviteListContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIconBox}>
                  <MaterialCommunityIcons name="account-search-outline" size={36} color="#64748B" />
                </View>
                <Text style={styles.emptyTitle}>초대 가능한 트레이너가 없습니다</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.inviteListItem}>
                <View style={styles.inviteAvatar}>
                  <Text style={styles.inviteAvatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteItemName}>{item.name}</Text>
                  {item.tagline ? (
                    <Text style={styles.inviteItemTagline} numberOfLines={1}>{item.tagline}</Text>
                  ) : null}
                  <View style={styles.inviteSpecRow}>
                    {(item.trainingGoals ?? []).slice(0, 2).map(s => (
                      <View key={s} style={styles.inviteSpecChip}>
                        <Text style={styles.inviteSpecText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <TouchableOpacity style={styles.inviteItemBtn} onPress={() => handleInvite(item)}>
                  <MaterialCommunityIcons name="account-plus-outline" size={13} color="#fff" />
                  <Text style={styles.inviteItemBtnText}>초대</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#4F63F5' },
  tabActiveRed: { borderBottomColor: '#7C3AED' },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: '#4F63F5' },
  tabTextRed: { color: '#7C3AED', fontWeight: '700' },
  tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    backgroundColor: COLORS.error, borderRadius: 10,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },

  listContent: { paddingBottom: 100 },
  listCount: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },

  partnerRow: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  partnerCardWrap: { position: 'relative' },
  blacklistBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.error + '18', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.error + '44',
  },
  blacklistBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.error },
  partnerActionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 8, paddingHorizontal: 20, paddingBottom: 10,
  },
  blacklistBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: COLORS.error + '10',
    borderWidth: 1, borderColor: COLORS.error + '30',
  },
  blacklistBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.error },
  unblacklistBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#F5F3FF',
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  unblacklistBtnText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  removeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: COLORS.error + '12',
    borderWidth: 1, borderColor: COLORS.error + '30',
  },
  removeBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.error },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIconBox: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4, borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#4F63F5',
    paddingHorizontal: 18, paddingVertical: 13, borderRadius: 28,
    shadowColor: '#4F63F5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  fabText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // 신청·초대 탭
  requestsContent: { padding: 16 },
  groupLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    letterSpacing: 0.5, textTransform: 'uppercase',
    marginTop: 8, marginBottom: 10, marginLeft: 2,
  },

  // 입점 신청 카드
  requestCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  reqCardBar: { width: 4 },
  reqCardInner: { flex: 1, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatarBlue: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary + '14',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarCoral: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.secondary + '14',
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  cardName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardTagline: { fontSize: 12, color: COLORS.primary, fontStyle: 'italic' },
  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  specChip: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  specChipText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  specChipCoral: {
    backgroundColor: COLORS.secondary + '10',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  specChipCoralText: { fontSize: 11, fontWeight: '700', color: COLORS.secondary },

  cardMeta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 2,
  },
  metaDate: { fontSize: 12, color: COLORS.textSecondary },
  profileLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  profileLinkText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  approveBtn: { backgroundColor: '#4F63F5' },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  rejectBtn: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  rejectBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },

  // 보낸 초대 카드
  inviteSentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  inviteNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pendingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.warning + '35',
  },
  pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.warning },
  pendingPillText: { fontSize: 10, fontWeight: '700', color: COLORS.warning },
  inviteFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border,
  },
  cancelLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cancelLinkText: { fontSize: 13, fontWeight: '600', color: COLORS.error },

  // 블랙리스트 탭
  blacklistBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F3FF', borderRadius: 12,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  blacklistBannerText: { flex: 1, fontSize: 12, color: '#5B21B6', fontWeight: '600', lineHeight: 18 },

  blacklistCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14, marginBottom: 10, overflow: 'hidden',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: '#EDE9FE',
  },
  blCardAccent: { width: 4, backgroundColor: '#7C3AED' },
  blCardInner: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
  },
  blCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  blAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center',
  },
  blAvatarText: { fontSize: 18, fontWeight: '800', color: '#7C3AED' },
  blInfo: { flex: 1, gap: 3 },
  blName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  blTagline: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },
  blSpecRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 2 },
  blSpecChip: {
    backgroundColor: '#EDE9FE', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  blSpecText: { fontSize: 10, fontWeight: '600', color: '#7C3AED' },
  blActions: { alignItems: 'flex-end', gap: 6 },
  blProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7,
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  blProfileBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  blRemoveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7,
    backgroundColor: '#F5F3FF',
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  blRemoveBtnText: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },

  // 초대 모달
  modalContainer: { flex: 1, backgroundColor: '#F1F5F9' },
  modalNavBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  modalSearchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: 12, paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  modalSearchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  inviteListContent: { paddingHorizontal: 16, paddingBottom: 40 },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginLeft: 74,
  },
  inviteListItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, gap: 12,
  },
  inviteAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#4F63F5' + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  inviteAvatarText: { fontSize: 18, fontWeight: '700', color: '#4F63F5' },
  inviteInfo: { flex: 1, gap: 3 },
  inviteItemName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  inviteItemTagline: { fontSize: 12, color: COLORS.primary, fontStyle: 'italic' },
  inviteSpecRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 2 },
  inviteSpecChip: {
    backgroundColor: '#4F63F5' + '15',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  inviteSpecText: { fontSize: 11, fontWeight: '600', color: '#4F63F5' },
  inviteItemBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#4F63F5',
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
  },
  inviteItemBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});

const cfStyles = StyleSheet.create({
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
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', backgroundColor: '#4F63F5',
  },
  rejectConfirmBtn: { backgroundColor: COLORS.error },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  singleBtn: {
    marginTop: 6, width: '100%', paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', backgroundColor: '#4F63F5',
  },
});
