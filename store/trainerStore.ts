import { create } from 'zustand';
import { Trainer } from '../types';
import { MOCK_TRAINERS } from '../data/trainers';

// 트레이너 목록의 단일 소스(공유·영속). 트레이너가 프로필을 수정하면 여기에 반영되어
// 로그아웃 후 회원 계정으로 봐도 최신 정보가 보인다. (정적 MOCK_TRAINERS는 초기값으로만 사용)
interface TrainerState {
  trainers: Trainer[];
  updateTrainer: (id: string, patch: Partial<Trainer>) => void;
  getTrainer: (id: string) => Trainer | undefined;
}

export const useTrainerStore = create<TrainerState>((set, get) => ({
  trainers: MOCK_TRAINERS.map((t) => ({ ...t })),
  updateTrainer: (id, patch) =>
    set((s) => ({ trainers: s.trainers.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  getTrainer: (id) => get().trainers.find((t) => t.id === id),
}));
