import { create } from 'zustand';
import { onDbError } from '../utils/db';
import { supabase, isSupabaseConfigured } from '../config/supabase';

// 사용자 차단. Apple Guideline 1.2(UGC)는 신고와 함께 '차단' 수단을 요구한다.
// 차단하면 상대의 게시글·댓글·채팅·프로필이 내 화면에서 보이지 않는다.
export interface BlockLink {
  blockerId: string;
  blockedId: string;
  blockedName: string;
  createdAt: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealUser = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);

interface BlockState {
  blocks: BlockLink[];
  block: (blockerId: string, blockedId: string, blockedName: string) => void;
  unblock: (blockerId: string, blockedId: string) => void;
  isBlocked: (blockerId: string, blockedId: string) => boolean;
  getBlockedIds: (blockerId: string) => string[];
  getMyBlocks: (blockerId: string) => BlockLink[];
  loadForUser: (blockerId: string) => Promise<void>;
}

export const useBlockStore = create<BlockState>((set, get) => ({
  blocks: [],

  block: (blockerId, blockedId, blockedName) => {
    if (!blockerId || !blockedId || blockerId === blockedId) return;
    if (get().blocks.some((b) => b.blockerId === blockerId && b.blockedId === blockedId)) return;
    const row: BlockLink = { blockerId, blockedId, blockedName, createdAt: new Date().toISOString() };
    set((s) => ({ blocks: [row, ...s.blocks] }));
    if (isRealUser(blockerId)) {
      supabase.from('blocks').upsert({
        blocker_id: blockerId,
        blocked_id: blockedId,
        blocked_name: blockedName,
      }).then(() => {}, onDbError);
    }
  },

  unblock: (blockerId, blockedId) => {
    set((s) => ({
      blocks: s.blocks.filter((b) => !(b.blockerId === blockerId && b.blockedId === blockedId)),
    }));
    if (isRealUser(blockerId)) {
      supabase.from('blocks').delete()
        .eq('blocker_id', blockerId).eq('blocked_id', blockedId)
        .then(() => {}, onDbError);
    }
  },

  isBlocked: (blockerId, blockedId) =>
    get().blocks.some((b) => b.blockerId === blockerId && b.blockedId === blockedId),

  getBlockedIds: (blockerId) =>
    get().blocks.filter((b) => b.blockerId === blockerId).map((b) => b.blockedId),

  getMyBlocks: (blockerId) => get().blocks.filter((b) => b.blockerId === blockerId),

  // 본인 차단 목록만 로드(RLS로도 본인 것만 보인다).
  loadForUser: async (blockerId) => {
    if (!isRealUser(blockerId)) return;
    const { data, error } = await supabase
      .from('blocks')
      .select('blocker_id, blocked_id, blocked_name, created_at')
      .eq('blocker_id', blockerId);
    if (error || !data) return;
    const rows: BlockLink[] = data.map((r: any) => ({
      blockerId: r.blocker_id,
      blockedId: r.blocked_id,
      blockedName: r.blocked_name ?? '',
      createdAt: r.created_at ?? '',
    }));
    set((s) => {
      const key = (b: BlockLink) => `${b.blockerId}|${b.blockedId}`;
      const seen = new Set(rows.map(key));
      return { blocks: [...rows, ...s.blocks.filter((b) => !seen.has(key(b)))] };
    });
  },
}));
