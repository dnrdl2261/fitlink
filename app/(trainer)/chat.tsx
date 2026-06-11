import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { formatChatTime } from '../../utils/formatters';
import { MOCK_GYMS } from '../../data/gyms';
import { COLORS } from '../../utils/constants';

const TRAINER = '#4F63F5';

export default function TrainerChatScreen() {
  const router = useRouter();
  const { trainer } = useAuthStore();
  const { getConversationsForUser, getMessages, getOrCreate } = useChatStore();
  useChatStore((s) => s.conversations);

  const [newModal, setNewModal] = useState(false);

  const myId = trainer?.id ?? '';
  const conversations = getConversationsForUser(myId);

  const openChat = (conversationId: string) => {
    router.push(`/chat/${conversationId}` as any);
  };

  const startWithGym = (gym: typeof MOCK_GYMS[number]) => {
    if (!trainer) return;
    // gym의 adminUserId를 상대방 ID로 사용
    const adminId = gym.adminUserId;
    const adminName = `${gym.name.split(' ')[0]}짐 관리자`;
    const convId = getOrCreate(
      'trainer-gym',
      { id: trainer.id, name: trainer.name, role: 'trainer' },
      { id: adminId, name: adminName, role: 'gym_admin' }
    );
    setNewModal(false);
    router.push(`/chat/${convId}` as any);
  };

  const chatGymIds = new Set(
    conversations
      .filter((c) => c.type === 'trainer-gym')
      .flatMap((c) => c.participants.map((p) => p.id))
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {conversations.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="chat-outline" size={32} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyText}>아직 대화가 없습니다</Text>
            <Text style={styles.emptySubText}>회원 또는 헬스장과 채팅을 시작하세요</Text>
          </View>
        )}
        {conversations.map((conv) => {
          const other = conv.participants.find((p) => p.id !== myId)!;
          const msgs = getMessages(conv.id);
          const last = msgs[msgs.length - 1];
          const unread = conv.unread[myId] ?? 0;
          const isGym = conv.type === 'trainer-gym';
          return (
            <TouchableOpacity key={conv.id} style={styles.convCard} onPress={() => openChat(conv.id)}>
              <View style={[styles.convCardBar, { backgroundColor: isGym ? '#2DD4BF' : TRAINER }]} />
              <View style={styles.convCardInner}>
                <View style={[styles.convAvatar, { backgroundColor: isGym ? '#2DD4BF22' : TRAINER + '22' }]}>
                  <MaterialCommunityIcons name={isGym ? 'dumbbell' : 'run-fast'} size={22} color={isGym ? '#2DD4BF' : TRAINER} />
                </View>
                <View style={styles.convInfo}>
                  <View style={styles.convTopRow}>
                    <View style={styles.convNameRow}>
                      <Text style={styles.convName}>{other.name}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: isGym ? '#2DD4BF22' : TRAINER + '22' }]}>
                        <Text style={[styles.typeBadgeText, { color: isGym ? '#2DD4BF' : TRAINER }]}>
                          {isGym ? '헬스장' : '회원'}
                        </Text>
                      </View>
                    </View>
                    {last && <Text style={styles.convTime}>{formatChatTime(last.timestamp)}</Text>}
                  </View>
                  <Text style={styles.convLast} numberOfLines={1}>
                    {last ? last.text : '새 대화를 시작하세요'}
                  </Text>
                </View>
                {unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{unread}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setNewModal(true)}>
        <Text style={styles.fabText}>+ 새 채팅</Text>
      </TouchableOpacity>

      {/* 헬스장 선택 모달 */}
      <Modal visible={newModal} transparent animationType="slide" onRequestClose={() => setNewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>헬스장 선택</Text>
              <TouchableOpacity onPress={() => setNewModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {MOCK_GYMS.map((gym) => {
                const alreadyChat = chatGymIds.has(gym.adminUserId);
                return (
                  <TouchableOpacity
                    key={gym.id}
                    style={styles.gymRow}
                    onPress={() => startWithGym(gym)}
                  >
                    <View style={[styles.gymAvatar, { backgroundColor: COLORS.gym + '22' }]}>
                      <Text style={{ fontSize: 18 }}>🏋️</Text>
                    </View>
                    <View style={styles.gymInfo}>
                      <Text style={styles.gymName}>{gym.name}</Text>
                      <Text style={styles.gymSub}>{gym.address}</Text>
                    </View>
                    {alreadyChat && (
                      <Text style={styles.existingLabel}>대화 중</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 10, paddingBottom: 80 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIconBox: { width: 68, height: 68, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyText: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySubText: { fontSize: 13, color: COLORS.textSecondary },

  convCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface, borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  convCardBar: { width: 4 },
  convCardInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  convAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  convInfo: { flex: 1, gap: 4 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  convName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  convTime: { fontSize: 11, color: COLORS.textSecondary },
  convLast: { fontSize: 13, color: COLORS.textSecondary },
  unreadBadge: {
    backgroundColor: COLORS.secondary, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  unreadText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  fab: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: COLORS.secondary, borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 13,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '75%', gap: 16,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  modalClose: { fontSize: 18, color: COLORS.textSecondary, padding: 4 },
  gymRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  gymAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  gymInfo: { flex: 1, gap: 2 },
  gymName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  gymSub: { fontSize: 12, color: COLORS.textSecondary },
  existingLabel: { fontSize: 12, color: COLORS.gym, fontWeight: '600' },
});
