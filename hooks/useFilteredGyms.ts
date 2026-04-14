import { useMemo, useState } from 'react';
import { Gym } from '../types';
import { MOCK_GYMS } from '../data/gyms';
import { calculateDistance } from '../utils/distance';
import { useLocationStore } from '../store/locationStore';

interface FilterOptions {
  partnerOnly?: boolean;
  maxDistance?: number;
}

export function useFilteredGyms(options: FilterOptions = {}) {
  const { currentLocation } = useLocationStore();
  const [searchQuery, setSearchQuery] = useState('');

  const gymsWithDistance = useMemo(() => {
    return MOCK_GYMS.map((gym) => ({
      ...gym,
      distance: calculateDistance(currentLocation, gym.coordinate),
    })).sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [currentLocation]);

  const filteredGyms = useMemo(() => {
    let result = gymsWithDistance;

    if (options.partnerOnly) {
      result = result.filter((g) => g.isPartner);
    }

    if (options.maxDistance) {
      result = result.filter((g) => (g.distance ?? 0) <= options.maxDistance!);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.address.toLowerCase().includes(q) ||
          g.facilities.some((f) => f.includes(q))
      );
    }

    return result;
  }, [gymsWithDistance, options.partnerOnly, options.maxDistance, searchQuery]);

  return { gyms: filteredGyms, searchQuery, setSearchQuery };
}

export function useGymById(id: string): Gym | undefined {
  const { currentLocation } = useLocationStore();
  return useMemo(() => {
    const gym = MOCK_GYMS.find((g) => g.id === id);
    if (!gym) return undefined;
    return {
      ...gym,
      distance: calculateDistance(currentLocation, gym.coordinate),
    };
  }, [id, currentLocation]);
}
