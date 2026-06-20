import { create } from 'zustand';
import { loadPersisted, persistOnChange } from '../utils/persist';

const KEY = 'flowin-favorites';

interface FavoriteState {
  trainerIds: string[];
  toggle: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const init = loadPersisted(KEY, { trainerIds: [] as string[] });

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  trainerIds: init.trainerIds,
  toggle: (id) =>
    set((s) => ({
      trainerIds: s.trainerIds.includes(id)
        ? s.trainerIds.filter((x) => x !== id)
        : [...s.trainerIds, id],
    })),
  isFavorite: (id) => get().trainerIds.includes(id),
}));

persistOnChange(useFavoriteStore, KEY, (s) => ({ trainerIds: s.trainerIds }));
