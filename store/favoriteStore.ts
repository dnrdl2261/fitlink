import { create } from 'zustand';
import { onDbError } from '../utils/db';
import { loadPersisted, persistOnChange } from '../utils/persist';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { useAuthStore } from './authStore';

const KEY = 'flowin-favorites';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealUser = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);
const currentMemberId = () => useAuthStore.getState().member?.id;

interface FavoriteState {
  trainerIds: string[];
  toggle: (id: string) => void;
  isFavorite: (id: string) => boolean;
  loadForMember: (userId: string) => Promise<void>;
}

const init = loadPersisted(KEY, { trainerIds: [] as string[] });

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  trainerIds: init.trainerIds,
  toggle: (id) => {
    const willFavorite = !get().trainerIds.includes(id);
    set((s) => ({
      trainerIds: willFavorite ? [...s.trainerIds, id] : s.trainerIds.filter((x) => x !== id),
    }));
    // 실 회원이면 본인 찜을 DB에 미러(추가=upsert, 해제=delete).
    const uid = currentMemberId();
    if (isRealUser(uid)) {
      if (willFavorite) {
        supabase.from('favorites').upsert({ user_id: uid, trainer_id: id }).then(() => {}, onDbError);
      } else {
        supabase.from('favorites').delete().eq('user_id', uid).eq('trainer_id', id).then(() => {}, onDbError);
      }
    }
  },
  isFavorite: (id) => get().trainerIds.includes(id),

  // 로그인 회원의 찜 목록을 DB에서 로드(다기기 동기화). 데모/미설정은 no-op.
  loadForMember: async (userId) => {
    if (!isRealUser(userId)) return;
    const { data } = await supabase.from('favorites').select('trainer_id').eq('user_id', userId);
    if (!data) return;
    set({ trainerIds: data.map((r) => r.trainer_id) });
  },
}));

persistOnChange(useFavoriteStore, KEY, (s) => ({ trainerIds: s.trainerIds }));
