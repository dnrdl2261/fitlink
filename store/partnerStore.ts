import { create } from 'zustand';

export interface PartnerRequest {
  id: string;
  gymId: string;
  gymName: string;
  trainerId: string;
  trainerName: string;
  trainerTagline?: string;
  trainerSpecializations?: string[];
  type: 'application' | 'invite'; // application: 트레이너→헬스장, invite: 헬스장→트레이너
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface PartnerState {
  requests: PartnerRequest[];
  removedPartnerIds: Record<string, string[]>; // gymId → trainerId[]

  applyToGym: (params: { gymId: string; gymName: string; trainerId: string; trainerName: string; trainerTagline?: string; trainerSpecializations?: string[] }) => void;
  inviteTrainer: (params: { gymId: string; gymName: string; trainerId: string; trainerName: string; trainerTagline?: string; trainerSpecializations?: string[] }) => void;
  approve: (requestId: string) => void;
  reject: (requestId: string) => void;
  cancelRequest: (requestId: string) => void;
  removePartner: (gymId: string, trainerId: string) => void;

  getGymPartnerIds: (gymId: string, staticIds: string[]) => string[];
  getGymPendingRequests: (gymId: string) => PartnerRequest[];
  getTrainerRequests: (trainerId: string) => PartnerRequest[];
  hasActiveRequest: (gymId: string, trainerId: string) => boolean;
  isPartner: (gymId: string, trainerId: string, staticIds: string[]) => boolean;
}

const TODAY = '2026-04-28';

export const usePartnerStore = create<PartnerState>((set, get) => ({
  // 데모용 초기 신청 데이터
  requests: [
    {
      id: 'req_001',
      gymId: 'gym_001',
      gymName: '강남 피트니스 클럽',
      trainerId: 'trainer_003',
      trainerName: '박철수',
      trainerTagline: '짧고 강하게, 몸이 빠르게 바뀝니다',
      trainerSpecializations: ['기초체력', '근력향상'],
      type: 'application',
      status: 'pending',
      createdAt: '2026-04-26',
    },
    {
      id: 'req_002',
      gymId: 'gym_001',
      gymName: '강남 피트니스 클럽',
      trainerId: 'trainer_004',
      trainerName: '최유진',
      trainerTagline: '바른 몸이 바른 삶을 만듭니다',
      trainerSpecializations: ['산전산후', '웨딩케어'],
      type: 'application',
      status: 'pending',
      createdAt: '2026-04-27',
    },
    {
      id: 'req_003',
      gymId: 'gym_001',
      gymName: '강남 피트니스 클럽',
      trainerId: 'trainer_005',
      trainerName: '정태양',
      trainerTagline: '국가대표 훈련법, 당신도 경험할 수 있습니다',
      trainerSpecializations: ['대회준비', '선수레슨'],
      type: 'invite',
      status: 'pending',
      createdAt: '2026-04-25',
    },
    // 로그인 트레이너(trainer_001)가 gym_003에 신청한 내역
    {
      id: 'req_004',
      gymId: 'gym_003',
      gymName: '홍대 스포츠클럽',
      trainerId: 'trainer_001',
      trainerName: '김민준',
      trainerTagline: '3개월 안에 반드시 바꿔드립니다',
      trainerSpecializations: ['다이어트', '벌크업'],
      type: 'application',
      status: 'pending',
      createdAt: '2026-04-27',
    },
  ],
  removedPartnerIds: {},

  applyToGym: ({ gymId, gymName, trainerId, trainerName, trainerTagline, trainerSpecializations }) => {
    const existing = get().requests.find(
      r => r.gymId === gymId && r.trainerId === trainerId && r.status === 'pending'
    );
    if (existing) return;
    const req: PartnerRequest = {
      id: `req_${Date.now()}`,
      gymId, gymName, trainerId, trainerName, trainerTagline, trainerSpecializations,
      type: 'application',
      status: 'pending',
      createdAt: TODAY,
    };
    set(s => ({ requests: [...s.requests, req] }));
  },

  inviteTrainer: ({ gymId, gymName, trainerId, trainerName, trainerTagline, trainerSpecializations }) => {
    const existing = get().requests.find(
      r => r.gymId === gymId && r.trainerId === trainerId && r.status === 'pending'
    );
    if (existing) return;
    const req: PartnerRequest = {
      id: `req_${Date.now()}`,
      gymId, gymName, trainerId, trainerName, trainerTagline, trainerSpecializations,
      type: 'invite',
      status: 'pending',
      createdAt: TODAY,
    };
    set(s => ({ requests: [...s.requests, req] }));
  },

  approve: (requestId) => {
    set(s => ({
      requests: s.requests.map(r => r.id === requestId ? { ...r, status: 'approved' } : r),
    }));
  },

  reject: (requestId) => {
    set(s => ({
      requests: s.requests.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r),
    }));
  },

  cancelRequest: (requestId) => {
    set(s => ({ requests: s.requests.filter(r => r.id !== requestId) }));
  },

  removePartner: (gymId, trainerId) => {
    set(s => ({
      removedPartnerIds: {
        ...s.removedPartnerIds,
        [gymId]: [...(s.removedPartnerIds[gymId] ?? []), trainerId],
      },
      // 승인된 요청도 제거
      requests: s.requests.filter(
        r => !(r.gymId === gymId && r.trainerId === trainerId && r.status === 'approved')
      ),
    }));
  },

  getGymPartnerIds: (gymId, staticIds) => {
    const removed = get().removedPartnerIds[gymId] ?? [];
    const approved = get().requests
      .filter(r => r.gymId === gymId && r.status === 'approved')
      .map(r => r.trainerId);
    const base = staticIds.filter(id => !removed.includes(id));
    const extra = approved.filter(id => !base.includes(id));
    return [...base, ...extra];
  },

  getGymPendingRequests: (gymId) =>
    get().requests.filter(r => r.gymId === gymId && r.status === 'pending'),

  getTrainerRequests: (trainerId) =>
    get().requests.filter(r => r.trainerId === trainerId),

  hasActiveRequest: (gymId, trainerId) =>
    get().requests.some(r => r.gymId === gymId && r.trainerId === trainerId && r.status === 'pending'),

  isPartner: (gymId, trainerId, staticIds) =>
    get().getGymPartnerIds(gymId, staticIds).includes(trainerId),
}));
