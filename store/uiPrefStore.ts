import { create } from 'zustand';

interface UiPrefState {
  onboardingSeen: boolean;
  setOnboardingSeen: () => void;
  recentSearches: string[];
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
}

export const useUiPrefStore = create<UiPrefState>((set) => ({
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
}));
