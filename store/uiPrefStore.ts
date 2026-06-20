import { create } from 'zustand';
import { loadPersisted, persistOnChange } from '../utils/persist';

const KEY = 'flowin-ui-pref';

interface UiPrefState {
  onboardingSeen: boolean;
  setOnboardingSeen: () => void;
  recentSearches: string[];
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
}

const init = loadPersisted(KEY, { onboardingSeen: false, recentSearches: [] as string[] });

export const useUiPrefStore = create<UiPrefState>((set) => ({
  onboardingSeen: init.onboardingSeen,
  setOnboardingSeen: () => set({ onboardingSeen: true }),
  recentSearches: init.recentSearches,
  addRecentSearch: (q) =>
    set((s) => {
      const t = q.trim();
      if (!t) return s;
      return { recentSearches: [t, ...s.recentSearches.filter((x) => x !== t)].slice(0, 8) };
    }),
  clearRecentSearches: () => set({ recentSearches: [] }),
}));

persistOnChange(useUiPrefStore, KEY, (s) => ({
  onboardingSeen: s.onboardingSeen,
  recentSearches: s.recentSearches,
}));
