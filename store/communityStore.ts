import { create } from 'zustand';
import { onDbError } from '../utils/db';
import {
  Post, Comment, Group,
  INITIAL_POSTS, INITIAL_COMMENTS, INITIAL_GROUPS,
} from '../data/community';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { useAuthStore } from './authStore';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealUser = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);
const currentUserId = () => {
  const a = useAuthStore.getState();
  return a.member?.id ?? a.trainer?.id ?? a.gymAdmin?.id;
};

// 시드 게시글/그룹의 기본 카운트(좋아요·멤버). 실 반응/가입은 DB 집계로 더해진다.
const BASE_LIKES = new Map(INITIAL_POSTS.map((p) => [p.id, p.likes]));
const BASE_MEMBERS = new Map(INITIAL_GROUPS.map((g) => [g.id, g.memberCount]));

function timeAgoOf(iso?: string): string {
  if (!iso) return '방금 전';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function postToRow(p: Post) {
  return {
    id: p.id, category: p.category, title: p.title, content: p.content,
    author: p.author, author_id: p.authorId ?? null, author_avatar: p.authorAvatar ?? null,
    location: p.location, views: p.views, image_url: p.imageUrl ?? null,
    is_video: !!p.isVideo, video_url: p.videoUrl ?? null, related_group_id: p.relatedGroupId ?? null,
  };
}
function postFromRow(x: any): Post {
  return {
    id: x.id, category: x.category, title: x.title ?? '', content: x.content ?? '',
    author: x.author ?? '', authorId: x.author_id ?? undefined, authorAvatar: x.author_avatar ?? undefined,
    location: x.location ?? '', timeAgo: timeAgoOf(x.created_at), views: x.views ?? 0,
    likes: 0, comments: 0,
    imageUrl: x.image_url ?? undefined, isVideo: !!x.is_video, videoUrl: x.video_url ?? undefined,
    relatedGroupId: x.related_group_id ?? undefined,
  };
}
function commentToRow(c: Comment) {
  return {
    id: c.id, post_id: c.postId, author: c.author, author_id: c.authorId ?? null,
    author_avatar: c.authorAvatar ?? null, content: c.content,
  };
}
function commentFromRow(x: any): Comment {
  return {
    id: x.id, postId: x.post_id, author: x.author ?? '', authorId: x.author_id ?? undefined,
    authorAvatar: x.author_avatar ?? undefined, content: x.content ?? '',
    timeAgo: timeAgoOf(x.created_at), likes: 0,
  };
}
function groupToRow(g: Group, creatorId?: string) {
  return {
    id: g.id, category: g.category, name: g.name, description: g.description,
    location: g.location, max_members: g.maxMembers, is_recruiting: g.isRecruiting,
    image_url: g.imageUrl, creator_id: creatorId ?? null,
  };
}
function groupFromRow(x: any): Group {
  return {
    id: x.id, category: x.category, name: x.name ?? '', description: x.description ?? '',
    location: x.location ?? '', memberCount: 0, maxMembers: x.max_members ?? 0,
    isRecruiting: !!x.is_recruiting, imageUrl: x.image_url ?? `https://picsum.photos/seed/${x.id}/200/200`,
  };
}

// fire-and-forget 헬퍼
const fire = (q: any) => { try { q.then(() => {}, onDbError); } catch { /* noop */ } };

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

  loadContent: () => Promise<void>;
  loadUserState: (userId: string) => Promise<void>;
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
    if (isRealUser(data.authorId)) fire(supabase.from('posts').insert(postToRow(newPost)));
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
    if (isRealUser(authorId)) fire(supabase.from('comments').insert(commentToRow(newComment)));
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
    const uid = currentUserId();
    if (!isRealUser(uid)) return;
    if (liked) {
      fire(supabase.from('post_reactions').delete().match({ user_id: uid, post_id: postId, type: 'like' }));
    } else {
      fire(supabase.from('post_reactions').upsert({ user_id: uid, post_id: postId, type: 'like' }));
      fire(supabase.from('post_reactions').delete().match({ user_id: uid, post_id: postId, type: 'dislike' }));
    }
  },

  toggleSavePost: (postId) => {
    const saved = get().savedPosts.includes(postId);
    set((s) => ({
      savedPosts: saved
        ? s.savedPosts.filter((id) => id !== postId)
        : [...s.savedPosts, postId],
    }));
    const uid = currentUserId();
    if (!isRealUser(uid)) return;
    if (saved) fire(supabase.from('post_reactions').delete().match({ user_id: uid, post_id: postId, type: 'save' }));
    else fire(supabase.from('post_reactions').upsert({ user_id: uid, post_id: postId, type: 'save' }));
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
    const uid = currentUserId();
    if (!isRealUser(uid)) return;
    if (disliked) {
      fire(supabase.from('post_reactions').delete().match({ user_id: uid, post_id: postId, type: 'dislike' }));
    } else {
      fire(supabase.from('post_reactions').upsert({ user_id: uid, post_id: postId, type: 'dislike' }));
      fire(supabase.from('post_reactions').delete().match({ user_id: uid, post_id: postId, type: 'like' }));
    }
  },

  incrementViews: (postId) => {
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, views: p.views + 1 } : p
      ),
    }));
    if (isSupabaseConfigured) fire(supabase.rpc('increment_post_views', { p_id: postId }));
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
    const uid = currentUserId();
    if (isRealUser(uid)) {
      fire(supabase.from('groups').insert(groupToRow(newGroup, uid)));
      fire(supabase.from('group_members').insert({ user_id: uid, group_id: id }));
    }
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
    const uid = currentUserId();
    if (!isRealUser(uid)) return;
    if (joined) fire(supabase.from('group_members').delete().match({ user_id: uid, group_id: groupId }));
    else fire(supabase.from('group_members').upsert({ user_id: uid, group_id: groupId }));
  },

  // 공개 콘텐츠 로드(게시글/댓글/그룹) + 카운트 집계(좋아요/댓글/멤버). 비로그인 포함 startup에서 호출.
  loadContent: async () => {
    if (!isSupabaseConfigured) return;
    const [posts, comments, groups, reactions, members] = await Promise.all([
      supabase.from('posts').select('*'),
      supabase.from('comments').select('*'),
      supabase.from('groups').select('*'),
      supabase.from('post_reactions').select('post_id, type'),
      supabase.from('group_members').select('group_id'),
    ]);

    set((state) => {
      // 머지(시드 + DB, id 기준)
      const postMap = new Map(state.posts.map((p) => [p.id, p]));
      (posts.data ?? []).forEach((r) => postMap.set(r.id, { ...postMap.get(r.id), ...postFromRow(r) }));
      const commentMap = new Map(state.comments.map((c) => [c.id, c]));
      (comments.data ?? []).forEach((r) => commentMap.set(r.id, commentFromRow(r)));
      const groupMap = new Map(state.groups.map((g) => [g.id, g]));
      (groups.data ?? []).forEach((r) => groupMap.set(r.id, { ...groupMap.get(r.id), ...groupFromRow(r) }));

      const mergedComments = Array.from(commentMap.values());

      // 카운트 집계
      const likeCount = new Map<string, number>();
      (reactions.data ?? []).forEach((r) => {
        if (r.type === 'like') likeCount.set(r.post_id, (likeCount.get(r.post_id) ?? 0) + 1);
      });
      const commentCount = new Map<string, number>();
      mergedComments.forEach((c) => commentCount.set(c.postId, (commentCount.get(c.postId) ?? 0) + 1));
      const memberCount = new Map<string, number>();
      (members.data ?? []).forEach((m) => memberCount.set(m.group_id, (memberCount.get(m.group_id) ?? 0) + 1));

      const mergedPosts = Array.from(postMap.values()).map((p) => ({
        ...p,
        likes: (BASE_LIKES.get(p.id) ?? 0) + (likeCount.get(p.id) ?? 0),
        comments: commentCount.get(p.id) ?? 0,
      }));
      const mergedGroups = Array.from(groupMap.values()).map((g) => ({
        ...g,
        memberCount: (BASE_MEMBERS.get(g.id) ?? 0) + (memberCount.get(g.id) ?? 0),
      }));

      return { posts: mergedPosts, comments: mergedComments, groups: mergedGroups };
    });
  },

  // 로그인 사용자의 반응/가입 상태 로드(다기기 동기화). 데모/미설정은 no-op.
  loadUserState: async (userId) => {
    if (!isRealUser(userId)) return;
    const [{ data: reactions }, { data: members }] = await Promise.all([
      supabase.from('post_reactions').select('post_id, type').eq('user_id', userId),
      supabase.from('group_members').select('group_id').eq('user_id', userId),
    ]);
    set({
      likedPosts: (reactions ?? []).filter((r) => r.type === 'like').map((r) => r.post_id),
      dislikedPosts: (reactions ?? []).filter((r) => r.type === 'dislike').map((r) => r.post_id),
      savedPosts: (reactions ?? []).filter((r) => r.type === 'save').map((r) => r.post_id),
      joinedGroups: (members ?? []).map((m) => m.group_id),
    });
  },
}));
