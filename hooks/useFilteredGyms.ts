import { useMemo, useState } from 'react';
import { Gym } from '../types';
import { calculateDistance } from '../utils/distance';
import { useLocationStore } from '../store/locationStore';
import { useGymProfileStore, mergeGymEdits } from '../store/gymProfileStore';
import { useGymStore } from '../store/gymStore';

interface FilterOptions {
  partnerOnly?: boolean;
  maxDistance?: number;
}

export function useFilteredGyms(options: FilterOptions = {}) {
  const { currentLocation } = useLocationStore();
  const edits = useGymProfileStore((s) => s.edits);
  const allGyms = useGymStore((s) => s.gyms);
  const [searchQuery, setSearchQuery] = useState('');

  const gymsWithDistance = useMemo(() => {
    return allGyms.map((g0) => {
      const gym = mergeGymEdits(g0, edits);
      return { ...gym, distance: calculateDistance(currentLocation, gym.coordinate) };
    }).sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [currentLocation, edits, allGyms]);

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

// 관리자 수정값(가격·시간·시설·이름 등)이 반영된 전체 헬스장 목록.
// gymStore(mock 데모 + 실 헬스장)를 읽는 화면들이 이 훅을 쓰면 관리자 수정이 일관되게 반영된다.
export function useMergedGyms(): Gym[] {
  const edits = useGymProfileStore((s) => s.edits);
  const allGyms = useGymStore((s) => s.gyms);
  return useMemo(() => allGyms.map((g) => mergeGymEdits(g, edits)), [edits, allGyms]);
}

export function useGymById(id: string): Gym | undefined {
  const { currentLocation } = useLocationStore();
  const edits = useGymProfileStore((s) => s.edits);
  const allGyms = useGymStore((s) => s.gyms);
  return useMemo(() => {
    const base = allGyms.find((g) => g.id === id);
    if (!base) return undefined;
    const gym = mergeGymEdits(base, edits);
    return {
      ...gym,
      distance: calculateDistance(currentLocation, gym.coordinate),
    };
  }, [id, currentLocation, edits, allGyms]);
}
