import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { formatChatTime } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';

export default function ChatRoomScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { role, member, trainer, gymAdmin } = useAuthStore();
  const { getMessages, sendMessage, markRead, conversations } = useChatStore();
  useChatStore((s) => s.messages);

  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const myId =
    role === 'member'    ? member?.id :
    role === 'trainer'   ? trainer?.id :
    gymAdmin?.id;
  const myName =
    role === 'member'    ? member?.name :
    role === 'trainer'   ? trainer?.name :
    gymAdmin?.name;

  const conversation = conversations.find((c) => c.id === conversationId);
  const other = conversation?.participants.find((p) => p.id !== myId);
  const messages = getMessages(conversationId ?? '');

  const accentColor =
    role === 'trainer'   ? COLORS.secondary :
    role === 'gym_admin' ? COLORS.gym :
    COLORS.primary;

  const otherEmoji =
    other?.role === 'member'    ? '🏃' :
    other?.role === 'trainer'   ? '💪' : '🏋️';

  const otherRoleLabel =
    other?.role === 'member'    ? '회원' :
    other?.role === 'trainer'   ? '트레이너' : '헬스장 관리자';

  useEffect(() => {
    if (conversationId && myId) markRead(conversationId, myId);
  }, [conversationId, myId]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim() || !conversationId || !myId || !myName) return;
    sendMessage(conversationId, myId, myName, text.trim());
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  if (!conversation) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>대화를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerSide} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: accentColor }]}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: accentColor + '28' }]}>
            <Text style={styles.headerAvatarEmoji}>{otherEmoji}</Text>
          </View>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerName} numberOfLines={1}>{other?.name ?? '상대방'}</Text>
            <Text style={styles.headerRole}>{otherRoleLabel}</Text>
          </View>
        </View>

        <View style={styles.headerSide} />
      </View>

      {/* 메시지 + 입력창 */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.msgList}
        >
          {messages.length === 0 && (
            <Text style={styles.emptyText}>첫 메시지를 보내보세요!</Text>
          )}

          {messages.map((msg, i) => {
            const isMine = msg.senderId === myId;
            const prevSame = i > 0 && messages[i - 1].senderId === msg.senderId;
            const showAvatar = !isMine && !prevSame;
            const showName  = !isMine && !prevSame;

            return (
              <View
                key={msg.id}
                style={[
                  styles.msgRow,
                  isMine ? styles.msgRowMine : styles.msgRowOther,
                  prevSame && styles.msgRowCompact,
                ]}
              >
                {/* 상대방 아바타 (연속 메시지면 빈 공간으로 정렬 유지) */}
                {!isMine && (
                  <View style={[styles.avatarSlot, { backgroundColor: showAvatar ? accentColor + '22' : 'transparent' }]}>
                    {showAvatar && <Text style={styles.avatarEmoji}>{otherEmoji}</Text>}
                  </View>
                )}

                {/* 말풍선 + 이름/시간 묶음 */}
                <View style={[styles.bubbleGroup, isMine && styles.bubbleGroupMine]}>
                  {showName && (
                    <Text style={styles.senderName}>{msg.senderName}</Text>
                  )}
                  <View style={[
                    styles.bubble,
                    isMine
                      ? [styles.bubbleMine, { backgroundColor: accentColor }]
                      : styles.bubbleOther,
                  ]}>
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
                      {msg.text}
                    </Text>
                  </View>
                  <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>
                    {formatChatTime(msg.timestamp)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* 입력창 */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="메시지를 입력하세요"
            placeholderTextColor={COLORS.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: text.trim() ? accentColor : COLORS.border }]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Text style={styles.sendBtnText}>전송</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 34;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex:      { flex: 1 },
  notFound:  { color: COLORS.textSecondary, textAlign: 'center', marginTop: 60, fontSize: 14 },

  /* 헤더 */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerSide: {
    width: 64,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  backText: { fontSize: 36, fontWeight: '300' },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarEmoji: { fontSize: 18 },
  headerTitleBlock: { gap: 1 },
  headerName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  headerRole: { fontSize: 11, color: COLORS.textSecondary },

  /* 메시지 목록 */
  msgList: { padding: 14, paddingBottom: 10, gap: 2 },
  emptyText: {
    textAlign: 'center', color: COLORS.textSecondary,
    fontSize: 14, paddingVertical: 48,
  },

  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  msgRowMine:    { flexDirection: 'row-reverse' },
  msgRowOther:   {},
  msgRowCompact: { marginTop: 2 },

  /* 아바타 슬롯 — 연속 메시지에도 공간 유지해 정렬 일치 */
  avatarSlot: {
    width: AVATAR_SIZE, height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarEmoji: { fontSize: 17 },

  /* 말풍선 그룹 */
  bubbleGroup: {
    maxWidth: '72%',
    gap: 3,
  },
  bubbleGroupMine: { alignItems: 'flex-end' },

  senderName: {
    fontSize: 11, color: COLORS.textSecondary,
    marginLeft: 2, marginBottom: 1,
  },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  bubbleMine: {
    borderBottomRightRadius: 5,
  },
  bubbleOther: {
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderBottomLeftRadius: 5,
  },
  bubbleText: {
    fontSize: 14, color: COLORS.text, lineHeight: 20,
  },
  bubbleTextMine: { color: '#fff' },

  msgTime: {
    fontSize: 10, color: COLORS.textSecondary,
    marginLeft: 4,
  },
  msgTimeMine: { textAlign: 'right', marginRight: 4, marginLeft: 0 },

  /* 입력창 */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 110,
    lineHeight: 22,
  },
  sendBtn: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
