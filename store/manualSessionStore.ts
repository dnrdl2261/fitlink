import { create } from 'zustand';
import { onDbError } from '../utils/db';
import { loadPersisted, persistOnChange } from '../utils/persist';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { useAuthStore } from './authStore';

const KEY = 'flowin-manual-sessions';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealUser = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);
const currentTrainerId = () => useAuthStore.getState().trainer?.id;

export interface ManualSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  memberName: string;
  memo: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  color: string;
}

function manualToRow(m: ManualSession, trainerId: string) {
  return {
    id: m.id, trainer_id: trainerId, date: m.date, start_time: m.startTime, end_time: m.endTime,
    member_name: m.memberName, memo: m.memo, status: m.status, color: m.color,
  };
}
function manualFromRow(x: any): ManualSession {
  return {
    id: x.id, date: x.date ?? '', startTime: x.start_time ?? '', endTime: x.end_time ?? '',
    memberName: x.member_name ?? '', memo: x.memo ?? '', status: x.status ?? 'scheduled', color: x.color ?? '',
  };
}

interface ManualSessionState {
  manualSessions: ManualSession[];
  hiddenIds: string[];            // 트레이너가 숨긴(삭제한) 예약 세션 id
  addManual: (s: ManualSession) => void;
  completeManual: (id: string) => void;
  removeManual: (id: string) => void;
  hideSession: (id: string) => void;
  loadForTrainer: (trainerId: string) => Promise<void>;
}

const init = loadPersisted(KEY, { manualSessions: [] as ManualSession[], hiddenIds: [] as string[] });

export const useManualSessionStore = create<ManualSessionState>((set) => ({
  manualSessions: init.manualSessions,
  hiddenIds: init.hiddenIds,
  addManual: (s) => {
    set((st) => ({ manualSessions: [...st.manualSessions, s] }));
    const tid = currentTrainerId();
    if (isRealUser(tid)) supabase.from('manual_sessions').insert(manualToRow(s, tid!)).then(() => {}, onDbError);
  },
  completeManual: (id) => {
    set((st) => ({
      manualSessions: st.manualSessions.map((m) => (m.id === id ? { ...m, status: 'completed' } : m)),
    }));
    if (isRealUser(currentTrainerId())) supabase.from('manual_sessions').update({ status: 'completed' }).eq('id', id).then(() => {}, onDbError);
  },
  removeManual: (id) => {
    set((st) => ({ manualSessions: st.manualSessions.filter((m) => m.id !== id) }));
    if (isRealUser(currentTrainerId())) supabase.from('manual_sessions').delete().eq('id', id).then(() => {}, onDbError);
  },
  hideSession: (id) => {
    set((st) => (st.hiddenIds.includes(id) ? st : { hiddenIds: [...st.hiddenIds, id] }));
    const tid = currentTrainerId();
    if (isRealUser(tid)) supabase.from('hidden_sessions').upsert({ trainer_id: tid, session_id: id }).then(() => {}, onDbError);
  },

  // 로그인 트레이너의 수동일정 + 숨긴세션을 DB에서 로드(다기기 동기화). 데모/미설정은 no-op.
  loadForTrainer: async (trainerId) => {
    if (!isRealUser(trainerId)) return;
    const [{ data: sessions }, { data: hidden }] = await Promise.all([
      supabase.from('manual_sessions').select('*').eq('trainer_id', trainerId),
      supabase.from('hidden_sessions').select('session_id').eq('trainer_id', trainerId),
    ]);
    set((st) => {
      const merged = sessions
        ? (() => {
            const map = new Map(st.manualSessions.map((m) => [m.id, m]));
            sessions.forEach((r) => map.set(r.id, manualFromRow(r)));
            return Array.from(map.values());
          })()
        : st.manualSessions;
      const hiddenIds = hidden
        ? Array.from(new Set([...st.hiddenIds, ...hidden.map((h) => h.session_id)]))
        : st.hiddenIds;
      return { manualSessions: merged, hiddenIds };
    });
  },
}));

persistOnChange(useManualSessionStore, KEY, (s) => ({
  manualSessions: s.manualSessions,
  hiddenIds: s.hiddenIds,
}));
