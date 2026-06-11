import { create } from 'zustand';

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
  },

  markRead: (conversationId, userId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, unread: { ...c.unread, [userId]: 0 } }
          : c
      ),
    }));
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
    }
    return id;
  },
}));

