import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { formatChatTime } from '../../utils/formatters';
import { MOCK_TRAINERS } from '../../data/trainers';
import { COLORS } from '../../utils/constants';

const MEMBER = '#0057FF';

export default function MemberChatScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const { member } = useAuthStore();
  const { getConversationsForUser, getMessages, getOrCreate } = useChatStore();
  useChatStore((s) => s.conversations);

  const [newModal, setNewModal] = useState(false);

  const myId = member?.id ?? '';
  const conversations = getConversationsForUser(myId);

  const openChat = (conversationId: string) => {
    router.push(`/chat/${conversationId}` as any);
  };

  const startNew = (trainerId: string, trainerName: string) => {
    if (!member) return;
    const convId = getOrCreate(
      'member-trainer',
      { id: member.id, name: member.name, role: 'member' },
      { id: trainerId, name: trainerName, role: 'trainer' }
    );
    setNewModal(false);
    router.push(`/chat/${convId}` as any);
  };

  const alreadyChatting = new Set(
    conversations.flatMap((c) => c.participants.map((p) => p.id))
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {conversations.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="chat-outline" size={28} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.emptyText}>아직 대화가 없습니다</Text>
            <Text style={styles.emptySubText}>트레이너와 채팅을 시작해보세요</Text>
          </View>
        )}
        {conversations.map((conv) => {
          const other = conv.participants.find((p) => p.id !== myId)!;
          const msgs = getMessages(conv.id);
          const last = msgs[msgs.length - 1];
          const unread = conv.unread[myId] ?? 0;
          return (
            <TouchableOpacity key={conv.id} style={styles.convCard} onPress={() => openChat(conv.id)}>
              <View style={[styles.convCardBar, { backgroundColor: MEMBER }]} />
              <View style={styles.convCardInner}>
                <View style={[styles.convAvatar, { backgroundColor: MEMBER + '22' }]}>
                  <MaterialCommunityIcons name="dumbbell" size={22} color={MEMBER} />
                </View>
                <View style={styles.convInfo}>
                  <View style={styles.convTopRow}>
                    <Text style={styles.convName}>{other.name} 트레이너</Text>
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

      {/* 새 채팅 버튼 */}
      <TouchableOpacity style={styles.fab} onPress={() => setNewModal(true)}>
        <Text style={styles.fabText}>+ 새 채팅</Text>
      </TouchableOpacity>

      {/* 트레이너 선택 모달 */}
      <Modal visible={newModal} transparent animationType="slide" onRequestClose={() => setNewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>트레이너 선택</Text>
              <TouchableOpacity onPress={() => setNewModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {MOCK_TRAINERS.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.trainerRow}
                  onPress={() => startNew(t.id, t.name)}
                >
                  <View style={[styles.trainerAvatar, { backgroundColor: MEMBER + '22' }]}>
                    <MaterialCommunityIcons name="dumbbell" size={20} color={MEMBER} />
                  </View>
                  <View style={styles.trainerInfo}>
                    <Text style={styles.trainerName}>{t.name} 트레이너</Text>
                    <Text style={styles.trainerSub}>{t.specializations.slice(0, 2).join(' · ')}</Text>
                  </View>
                  {alreadyChatting.has(t.id) && (
                    <Text style={styles.existingLabel}>대화 중</Text>
                  )}
                </TouchableOpacity>
              ))}
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
  convName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  convTime: { fontSize: 11, color: COLORS.textSecondary },
  convLast: { fontSize: 13, color: COLORS.textSecondary },
  unreadBadge: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  unreadText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  fab: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: COLORS.primary, borderRadius: 24,
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
  trainerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  trainerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  trainerInfo: { flex: 1, gap: 2 },
  trainerName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  trainerSub: { fontSize: 12, color: COLORS.textSecondary },
  existingLabel: { fontSize: 12, color: COLORS.secondary, fontWeight: '600' },
});
