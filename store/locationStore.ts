import { create } from 'zustand';
import { GeoCoordinate } from '../types';
import { DEFAULT_COORDINATE } from '../utils/constants';

interface LocationState {
  currentLocation: GeoCoordinate;
  hasPermission: boolean | null; // null: 아직 미확인, true: 허용, false: 거부
  setLocation: (coord: GeoCoordinate) => void;
  setPermission: (granted: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: DEFAULT_COORDINATE,
  hasPermission: null,

  setLocation: (coord: GeoCoordinate) => set({ currentLocation: coord }),
  setPermission: (granted: boolean) => set({ hasPermission: granted }),
}));
