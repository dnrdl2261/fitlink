import { create } from 'zustand';

interface FavoriteState {
  trainerIds: string[];
  toggle: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  trainerIds: [],
  toggle: (id) =>
    set((s) => ({
      trainerIds: s.trainerIds.includes(id)
        ? s.trainerIds.filter((x) => x !== id)
        : [...s.trainerIds, id],
    })),
  isFavorite: (id) => get().trainerIds.includes(id),
}));
