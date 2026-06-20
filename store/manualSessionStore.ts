import { create } from 'zustand';
import { loadPersisted, persistOnChange } from '../utils/persist';

const KEY = 'flowin-manual-sessions';

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

interface ManualSessionState {
  manualSessions: ManualSession[];
  hiddenIds: string[];            // 트레이너가 숨긴(삭제한) 예약 세션 id
  addManual: (s: ManualSession) => void;
  completeManual: (id: string) => void;
  removeManual: (id: string) => void;
  hideSession: (id: string) => void;
}

const init = loadPersisted(KEY, { manualSessions: [] as ManualSession[], hiddenIds: [] as string[] });

export const useManualSessionStore = create<ManualSessionState>((set) => ({
  manualSessions: init.manualSessions,
  hiddenIds: init.hiddenIds,
  addManual: (s) => set((st) => ({ manualSessions: [...st.manualSessions, s] })),
  completeManual: (id) =>
    set((st) => ({
      manualSessions: st.manualSessions.map((m) => (m.id === id ? { ...m, status: 'completed' } : m)),
    })),
  removeManual: (id) =>
    set((st) => ({ manualSessions: st.manualSessions.filter((m) => m.id !== id) })),
  hideSession: (id) =>
    set((st) => (st.hiddenIds.includes(id) ? st : { hiddenIds: [...st.hiddenIds, id] })),
}));

persistOnChange(useManualSessionStore, KEY, (s) => ({
  manualSessions: s.manualSessions,
  hiddenIds: s.hiddenIds,
}));
