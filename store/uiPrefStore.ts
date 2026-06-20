import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 웹(배포 환경)에서는 localStorage에 영속화, 네이티브에서는 메모리(무해한 no-op)
const getLS = (): any => (globalThis as any).localStorage;
const webStorage = {
  getItem: (name: string): string | null => getLS()?.getItem(name) ?? null,
  setItem: (name: string, value: string): void => { getLS()?.setItem(name, value); },
  removeItem: (name: string): void => { getLS()?.removeItem(name); },
};

interface UiPrefState {
  onboardingSeen: boolean;
  setOnboardingSeen: () => void;
  recentSearches: string[];
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
}

export const useUiPrefStore = create<UiPrefState>()(
  persist(
    (set) => ({
      onboardingSeen: false,
      setOnboardingSeen: () => set({ onboardingSeen: true }),
      recentSearches: [],
      addRecentSearch: (q) =>
        set((s) => {
          const t = q.trim();
          if (!t) return s;
          return { recentSearches: [t, ...s.recentSearches.filter((x) => x !== t)].slice(0, 8) };
        }),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'flowin-ui-pref',
      storage: createJSONStorage(() => webStorage),
      partialize: (s) => ({ onboardingSeen: s.onboardingSeen, recentSearches: s.recentSearches }),
    }
  )
);
