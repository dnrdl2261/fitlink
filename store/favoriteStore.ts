import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 웹(배포 환경)에서는 localStorage에 영속화, 네이티브에서는 메모리(무해한 no-op)
const getLS = (): any => (globalThis as any).localStorage;
const webStorage = {
  getItem: (name: string): string | null => getLS()?.getItem(name) ?? null,
  setItem: (name: string, value: string): void => { getLS()?.setItem(name, value); },
  removeItem: (name: string): void => { getLS()?.removeItem(name); },
};

interface FavoriteState {
  trainerIds: string[];
  toggle: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      trainerIds: [],
      toggle: (id) =>
        set((s) => ({
          trainerIds: s.trainerIds.includes(id)
            ? s.trainerIds.filter((x) => x !== id)
            : [...s.trainerIds, id],
        })),
      isFavorite: (id) => get().trainerIds.includes(id),
    }),
    {
      name: 'flowin-favorites',
      storage: createJSONStorage(() => webStorage),
      partialize: (s) => ({ trainerIds: s.trainerIds }),
    }
  )
);
