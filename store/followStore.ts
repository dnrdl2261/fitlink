import { create } from 'zustand';

export interface FollowLink {
  followerId: string;
  followeeId: string;
}

interface FollowState {
  links: FollowLink[];
  follow: (followerId: string, followeeId: string) => void;
  unfollow: (followerId: string, followeeId: string) => void;
  isFollowing: (followerId: string, followeeId: string) => boolean;
  getFollowingIds: (followerId: string) => string[];
  getFollowerCount: (followeeId: string) => number;
  getFollowingCount: (followerId: string) => number;
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
  },

  unfollow: (followerId, followeeId) => {
    set(s => ({
      links: s.links.filter(
        l => !(l.followerId === followerId && l.followeeId === followeeId)
      ),
    }));
  },

  isFollowing: (followerId, followeeId) =>
    get().links.some(l => l.followerId === followerId && l.followeeId === followeeId),

  getFollowingIds: (followerId) =>
    get().links.filter(l => l.followerId === followerId).map(l => l.followeeId),

  getFollowerCount: (followeeId) =>
    get().links.filter(l => l.followeeId === followeeId).length,

  getFollowingCount: (followerId) =>
    get().links.filter(l => l.followerId === followerId).length,
}));
