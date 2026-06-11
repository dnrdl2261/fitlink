import { create } from 'zustand';
import {
  Post, Comment, Group,
  INITIAL_POSTS, INITIAL_COMMENTS, INITIAL_GROUPS,
} from '../data/community';

interface CommunityState {
  posts: Post[];
  comments: Comment[];
  groups: Group[];
  likedPosts: string[];
  dislikedPosts: string[];
  savedPosts: string[];
  joinedGroups: string[];

  addPost: (data: {
    category: Post['category'];
    title: string;
    content: string;
    author: string;
    authorId?: string;
    authorAvatar?: string;
    location: string;
    imageUrl?: string;
    isVideo?: boolean;
    videoUrl?: string;
  }) => string;

  addComment: (postId: string, content: string, author: string, authorAvatar?: string, authorId?: string) => void;
  toggleLikePost: (postId: string) => void;
  toggleDislikePost: (postId: string) => void;
  toggleSavePost: (postId: string) => void;
  incrementViews: (postId: string) => void;

  addGroup: (data: {
    category: Group['category'];
    name: string;
    description: string;
    location: string;
    maxMembers: number;
    imageUrl?: string;
  }) => void;
  toggleJoinGroup: (groupId: string) => void;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  posts: INITIAL_POSTS,
  comments: INITIAL_COMMENTS,
  groups: INITIAL_GROUPS,
  likedPosts: [],
  dislikedPosts: [],
  savedPosts: [],
  joinedGroups: [],

  addPost: (data) => {
    const id = `post_${Date.now()}`;
    const newPost: Post = {
      id,
      category: data.category,
      title: data.title,
      content: data.content,
      author: data.author,
      authorId: data.authorId,
      authorAvatar: data.authorAvatar,
      location: data.location,
      timeAgo: '방금 전',
      views: 0,
      likes: 0,
      comments: 0,
      imageUrl: data.imageUrl,
      isVideo: data.isVideo,
      videoUrl: data.videoUrl,
    };
    set((s) => ({ posts: [newPost, ...s.posts] }));
    return id;
  },

  addComment: (postId, content, author, authorAvatar, authorId) => {
    const id = `comment_${Date.now()}`;
    const newComment: Comment = {
      id, postId, author, authorAvatar, authorId, content,
      timeAgo: '방금 전',
      likes: 0,
    };
    set((s) => ({
      comments: [...s.comments, newComment],
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, comments: p.comments + 1 } : p
      ),
    }));
  },

  toggleLikePost: (postId) => {
    const liked = get().likedPosts.includes(postId);
    set((s) => ({
      likedPosts: liked
        ? s.likedPosts.filter((id) => id !== postId)
        : [...s.likedPosts, postId],
      dislikedPosts: s.dislikedPosts.filter((id) => id !== postId),
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, likes: p.likes + (liked ? -1 : 1) } : p
      ),
    }));
  },

  toggleSavePost: (postId) => {
    const saved = get().savedPosts.includes(postId);
    set((s) => ({
      savedPosts: saved
        ? s.savedPosts.filter((id) => id !== postId)
        : [...s.savedPosts, postId],
    }));
  },

  toggleDislikePost: (postId) => {
    const disliked = get().dislikedPosts.includes(postId);
    set((s) => ({
      dislikedPosts: disliked
        ? s.dislikedPosts.filter((id) => id !== postId)
        : [...s.dislikedPosts, postId],
      likedPosts: s.likedPosts.filter((id) => id !== postId),
      posts: s.posts.map((p) =>
        p.id === postId && !disliked ? { ...p, likes: Math.max(0, p.likes - (s.likedPosts.includes(postId) ? 1 : 0)) } : p
      ),
    }));
  },

  incrementViews: (postId) => {
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, views: p.views + 1 } : p
      ),
    }));
  },

  addGroup: (data) => {
    const id = `group_${Date.now()}`;
    const newGroup: Group = {
      id,
      category: data.category,
      name: data.name,
      description: data.description,
      location: data.location,
      memberCount: 1,
      maxMembers: data.maxMembers,
      isRecruiting: true,
      imageUrl: data.imageUrl ?? `https://picsum.photos/seed/${id}/200/200`,
    };
    set((s) => ({
      groups: [newGroup, ...s.groups],
      joinedGroups: [...s.joinedGroups, id],
    }));
  },

  toggleJoinGroup: (groupId) => {
    const joined = get().joinedGroups.includes(groupId);
    set((s) => ({
      joinedGroups: joined
        ? s.joinedGroups.filter((id) => id !== groupId)
        : [...s.joinedGroups, groupId],
      groups: s.groups.map((g) =>
        g.id === groupId
          ? { ...g, memberCount: g.memberCount + (joined ? -1 : 1) }
          : g
      ),
    }));
  },
}));
