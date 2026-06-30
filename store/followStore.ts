import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../config/supabase';

export interface FollowLink {
  followerId: string;
  followeeId: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealUser = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);

interface FollowState {
  links: FollowLink[];
  follow: (followerId: string, followeeId: string) => void;
  unfollow: (followerId: string, followeeId: string) => void;
  isFollowing: (followerId: string, followeeId: string) => boolean;
  getFollowingIds: (followerId: string) => string[];
  getFollowerCount: (followeeId: string) => number;
  getFollowingCount: (followerId: string) => number;
  loadFromSupabase: () => Promise<void>;
}

export const useFollowStore = create<FollowState>((set, get) => ({
  links: [
    // member_001 팔로우: trainer_001, trainer_002
    { followerId: 'member_001', followeeId: 'trainer_001' },
    { followerId: 'member_001', followeeId: 'trainer_002' },
    // trainer_001(로그인 트레이너) 팔로우: trainer_002, trainer_003
    { followerId: 'trainer_001', followeeId: 'trainer_002' },
    { followerId: 'trainer_001', followeeId: 'trainer_003' },
    // trainer_001의 팔로워 (데모)
    { followerId: 'member_002', followeeId: 'trainer_001' },
    { followerId: 'member_003', followeeId: 'trainer_001' },
    { followerId: 'member_004', followeeId: 'trainer_001' },
    { followerId: 'trainer_002', followeeId: 'trainer_001' },
    { followerId: 'trainer_004', followeeId: 'trainer_001' },
    // trainer_002의 팔로워
    { followerId: 'member_005', followeeId: 'trainer_002' },
    { followerId: 'trainer_005', followeeId: 'trainer_002' },
  ],

  follow: (followerId, followeeId) => {
    if (followerId === followeeId) return;
    const already = get().links.some(
      l => l.followerId === followerId && l.followeeId === followeeId
    );
    if (already) return;
    set(s => ({ links: [...s.links, { followerId, followeeId }] }));
    if (isRealUser(followerId)) {
      supabase.from('follows').upsert({ follower_id: followerId, followee_id: followeeId }).then(() => {}, () => {});
    }
  },

  unfollow: (followerId, followeeId) => {
    set(s => ({
      links: s.links.filter(
        l => !(l.followerId === followerId && l.followeeId === followeeId)
      ),
    }));
    if (isRealUser(followerId)) {
      supabase.from('follows').delete().eq('follower_id', followerId).eq('followee_id', followeeId).then(() => {}, () => {});
    }
  },

  isFollowing: (followerId, followeeId) =>
    get().links.some(l => l.followerId === followerId && l.followeeId === followeeId),

  getFollowingIds: (followerId) =>
    get().links.filter(l => l.followerId === followerId).map(l => l.followeeId),

  getFollowerCount: (followeeId) =>
    get().links.filter(l => l.followeeId === followeeId).length,

  getFollowingCount: (followerId) =>
    get().links.filter(l => l.followerId === followerId).length,

  // 공개 팔로우 관계를 로드해 병합(팔로워/팔로잉 카운트용). mock 시드 유지. 미설정은 no-op.
  loadFromSupabase: async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.from('follows').select('follower_id, followee_id');
    if (error || !data) return;
    const rows: FollowLink[] = data.map((r: any) => ({ followerId: r.follower_id, followeeId: r.followee_id }));
    set((s) => {
      const key = (l: FollowLink) => `${l.followerId}|${l.followeeId}`;
      const seen = new Set(rows.map(key));
      return { links: [...rows, ...s.links.filter((l) => !seen.has(key(l)))] };
    });
  },
}));
