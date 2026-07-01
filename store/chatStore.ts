import { create } from 'zustand';
import { onDbError } from '../utils/db';
import { supabase, isSupabaseConfigured } from '../config/supabase';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  type: 'member-trainer' | 'trainer-gym';
  participants: { id: string; name: string; role: string }[];
  unread: Record<string, number>;
}

// ── Supabase 연동 (참여자 중 실 사용자 uuid가 있는 대화만 DB 사용) ──────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealUser = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);
const isRealConv = (c: Conversation) => c.participants.some((p) => isRealUser(p.id));

function convToRow(c: Conversation) {
  return {
    id: c.id, type: c.type,
    participant_ids: c.participants.map((p) => p.id),
    participants: c.participants, unread: c.unread,
  };
}
function convFromRow(r: any): Conversation {
  return { id: r.id, type: r.type, participants: r.participants ?? [], unread: r.unread ?? {} };
}
function msgToRow(m: ChatMessage) {
  return {
    id: m.id, conversation_id: m.conversationId,
    sender_id: m.senderId, sender_name: m.senderName,
    body: m.text, ts: m.timestamp,
  };
}
function msgFromRow(r: any): ChatMessage {
  return {
    id: r.id, conversationId: r.conversation_id,
    senderId: r.sender_id, senderName: r.sender_name ?? '',
    text: r.body ?? '', timestamp: r.ts ?? 0,
  };
}

// 대화 행(참여자/unread)을 DB에 미러. 실 대화만.
function mirrorConv(id: string) {
  if (!isSupabaseConfigured) return;
  const c = useChatStore.getState().conversations.find((x) => x.id === id);
  if (!c || !isRealConv(c)) return;
  supabase.from('conversations').upsert(convToRow(c)).then(() => {}, onDbError);
}

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;

  sendMessage: (conversationId: string, senderId: string, senderName: string, text: string) => void;
  markRead: (conversationId: string, userId: string) => void;
  getMessages: (conversationId: string) => ChatMessage[];
  getConversationsForUser: (userId: string) => Conversation[];
  getUnreadTotal: (userId: string) => number;
  getOrCreate: (
    type: 'member-trainer' | 'trainer-gym',
    p1: { id: string; name: string; role: string },
    p2: { id: string; name: string; role: string }
  ) => string;
  loadFromSupabase: (userId: string) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  subscribeInbox: (userId: string) => () => void;
}

// ── 초기 대화 데이터 ──────────────────────────────────
const T = Date.now();
const ago = (m: number) => T - m * 60 * 1000;

const SEED_MESSAGES: Record<string, ChatMessage[]> = {
  'mt_member_001_trainer_001': [
    { id: 'sm1', conversationId: 'mt_member_001_trainer_001', senderId: 'trainer_001', senderName: '김민준', text: '안녕하세요! PT 관련 문의 있으시면 편하게 말씀해주세요 😊', timestamp: ago(90) },
    { id: 'sm2', conversationId: 'mt_member_001_trainer_001', senderId: 'member_001',  senderName: '홍길동',  text: '안녕하세요! 체중 감량 위주로 PT 받고 싶은데요, 어떻게 진행되나요?', timestamp: ago(85) },
    { id: 'sm3', conversationId: 'mt_member_001_trainer_001', senderId: 'trainer_001', senderName: '김민준', text: '목표에 맞게 식단 + 운동 프로그램을 함께 구성해드려요. 이번 주 첫 상담 가능하세요?', timestamp: ago(80) },
  ],
  'tg_trainer_001_gym_001': [
    { id: 'sg1', conversationId: 'tg_trainer_001_gym_001', senderId: 'trainer_001', senderName: '김민준',      text: '안녕하세요! 다음 주 화요일 오전 10시 슬롯 예약 가능한지 확인하고 싶어요.', timestamp: ago(200) },
    { id: 'sg2', conversationId: 'tg_trainer_001_gym_001', senderId: 'admin_001',   senderName: '강남짐 관리자', text: '네, 화요일 오전에 여유가 있습니다. 슬롯 예약 시스템에서 신청해 주세요!', timestamp: ago(190) },
    { id: 'sg3', conversationId: 'tg_trainer_001_gym_001', senderId: 'trainer_001', senderName: '김민준',      text: '감사합니다! 바로 예약할게요 😊', timestamp: ago(185) },
  ],
};

const SEED_CONVERSATIONS: Conversation[] = [
  {
    id: 'mt_member_001_trainer_001',
    type: 'member-trainer',
    participants: [
      { id: 'member_001',  name: '홍길동',  role: 'member' },
      { id: 'trainer_001', name: '김민준',  role: 'trainer' },
    ],
    unread: { member_001: 1, trainer_001: 0 },
  },
  {
    id: 'tg_trainer_001_gym_001',
    type: 'trainer-gym',
    participants: [
      { id: 'trainer_001', name: '김민준',      role: 'trainer' },
      { id: 'admin_001',   name: '강남짐 관리자', role: 'gym_admin' },
    ],
    unread: { trainer_001: 0, admin_001: 1 },
  },
];

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: SEED_CONVERSATIONS,
  messages: SEED_MESSAGES,

  sendMessage: (conversationId, senderId, senderName, text) => {
    const msg: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId,
      senderName,
      text: text.trim(),
      timestamp: Date.now(),
    };
    set((state) => {
      const prev = state.messages[conversationId] ?? [];
      // 보낸 사람 외 모두 unread +1
      const updatedConversations = state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const newUnread = { ...c.unread };
        c.participants.forEach((p) => {
          if (p.id !== senderId) newUnread[p.id] = (newUnread[p.id] ?? 0) + 1;
        });
        return { ...c, unread: newUnread };
      });
      return {
        messages: { ...state.messages, [conversationId]: [...prev, msg] },
        conversations: updatedConversations,
      };
    });
    // 실 대화면 메시지 insert + 대화 unread 갱신 미러
    const conv = get().conversations.find((c) => c.id === conversationId);
    if (conv && isRealConv(conv)) {
      supabase.from('chat_messages').insert(msgToRow(msg)).then(() => {}, onDbError);
      mirrorConv(conversationId);
    }
  },

  markRead: (conversationId, userId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, unread: { ...c.unread, [userId]: 0 } }
          : c
      ),
    }));
    mirrorConv(conversationId);
  },

  getMessages: (conversationId) => get().messages[conversationId] ?? [],

  getConversationsForUser: (userId) =>
    get().conversations.filter((c) => c.participants.some((p) => p.id === userId)),

  getUnreadTotal: (userId) =>
    get()
      .conversations.filter((c) => c.participants.some((p) => p.id === userId))
      .reduce((sum, c) => sum + (c.unread[userId] ?? 0), 0),

  getOrCreate: (type, p1, p2) => {
    const id =
      type === 'member-trainer'
        ? `mt_${p1.id}_${p2.id}`
        : `tg_${p1.id}_${p2.id}`;

    const existing = get().conversations.find((c) => c.id === id);
    if (!existing) {
      const newConv: Conversation = {
        id,
        type,
        participants: [p1, p2],
        unread: { [p1.id]: 0, [p2.id]: 0 },
      };
      set((state) => ({ conversations: [...state.conversations, newConv] }));
      mirrorConv(id);
    }
    return id;
  },

  // 로그인 사용자의 대화 목록 + 메시지를 로드(병합). 데모/미설정은 no-op.
  loadFromSupabase: async (userId) => {
    if (!isRealUser(userId)) return;
    const { data: convs } = await supabase.from('conversations').select('*').contains('participant_ids', [userId]);
    if (!convs) return;
    const convObjs = convs.map(convFromRow);
    const ids = convObjs.map((c) => c.id);
    const msgsByConv: Record<string, ChatMessage[]> = {};
    if (ids.length) {
      const { data: msgs } = await supabase.from('chat_messages').select('*').in('conversation_id', ids).order('ts', { ascending: true });
      (msgs ?? []).forEach((r) => {
        const m = msgFromRow(r);
        (msgsByConv[m.conversationId] ??= []).push(m);
      });
    }
    set((state) => {
      const convIds = new Set(convObjs.map((c) => c.id));
      return {
        conversations: [...convObjs, ...state.conversations.filter((c) => !convIds.has(c.id))],
        messages: { ...state.messages, ...msgsByConv },
      };
    });
  },

  // 특정 대화의 최신 메시지를 다시 로드(채팅 화면 진입 시 — 상대방 메시지 반영).
  loadConversation: async (conversationId) => {
    if (!isSupabaseConfigured) return;
    const { data: msgs } = await supabase.from('chat_messages').select('*').eq('conversation_id', conversationId).order('ts', { ascending: true });
    if (!msgs || msgs.length === 0) return;
    set((state) => ({ messages: { ...state.messages, [conversationId]: msgs.map(msgFromRow) } }));
  },

  // 로그인 사용자의 모든 대화 신규 메시지를 실시간 수신(Supabase Realtime). 반환값은 해제 함수.
  // 내가 참여한 대화면 메시지 append + (내가 보낸 게 아니면) 해당 대화 unread +1.
  // 열린 채팅방은 화면이 messages 변화를 보고 markRead로 unread를 0으로 유지한다. 미설정/데모는 no-op.
  // 보안: filter 없이 chat_messages INSERT를 구독하지만, postgres_changes가 chat_messages SELECT RLS
  // (참여자 본인만)를 강제하므로 내가 참여한 대화의 메시지만 수신한다(config의 realtime.setAuth가 전제).
  // 아래 participants 체크는 보안 신뢰선이 아니라 로컬 대화목록 정합성용 방어적 보조다.
  subscribeInbox: (userId) => {
    if (!isRealUser(userId)) return () => {};
    const channel = supabase
      .channel(`inbox:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const m = msgFromRow(payload.new);
          set((state) => {
            const conv = state.conversations.find((c) => c.id === m.conversationId);
            if (!conv || !conv.participants.some((p) => p.id === userId)) return state;
            const prev = state.messages[m.conversationId] ?? [];
            if (prev.some((x) => x.id === m.id)) return state; // 중복(본인 echo 포함)
            const messages = { ...state.messages, [m.conversationId]: [...prev, m] };
            // 상대가 보낸 메시지면 unread +1 (열린 방은 화면 markRead가 곧 0으로 되돌림)
            const conversations =
              m.senderId === userId
                ? state.conversations
                : state.conversations.map((c) =>
                    c.id === m.conversationId
                      ? { ...c, unread: { ...c.unread, [userId]: (c.unread[userId] ?? 0) + 1 } }
                      : c
                  );
            return { messages, conversations };
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
}));

