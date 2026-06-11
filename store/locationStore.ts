import { create } from 'zustand';
import { GeoCoordinate } from '../types';
import { DEFAULT_COORDINATE } from '../utils/constants';

interface LocationState {
  currentLocation: GeoCoordinate;
  hasPermission: boolean | null;
  selectedDong: string;
  recentSearches: string[];
  setLocation: (coord: GeoCoordinate) => void;
  setPermission: (granted: boolean) => void;
  setSelectedDong: (dong: string) => void;
  addRecentSearch: (dong: string) => void;
  clearRecentSearches: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: DEFAULT_COORDINATE,
  hasPermission: null,
  selectedDong: '',
  recentSearches: [],

  setLocation: (coord) => set({ currentLocation: coord }),
  setPermission: (granted) => set({ hasPermission: granted }),
  setSelectedDong: (dong) => set({ selectedDong: dong }),
  addRecentSearch: (dong) =>
    set((state) => ({
      recentSearches: [dong, ...state.recentSearches.filter((d) => d !== dong)].slice(0, 10),
    })),
  clearRecentSearches: () => set({ recentSearches: [] }),
}));
