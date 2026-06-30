import { create } from 'zustand';
import { loadPersisted, persistOnChange } from '../utils/persist';
import { supabase, isSupabaseConfigured } from '../config/supabase';

const PERSIST_KEY = 'flowin-partner';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealUser = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);

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
  loadForTrainer: (trainerId: string) => Promise<void>;
  loadForGym: (gymId: string) => Promise<void>;
}

const isRealReq = (r: PartnerRequest) => isRealUser(r.trainerId) || isRealUser(r.gymId);

function reqToRow(r: PartnerRequest) {
  return {
    id: r.id, gym_id: r.gymId, gym_name: r.gymName,
    trainer_id: r.trainerId, trainer_name: r.trainerName,
    trainer_tagline: r.trainerTagline ?? null,
    trainer_specializations: r.trainerSpecializations ?? [],
    type: r.type, status: r.status, created_at: r.createdAt,
  };
}
function reqFromRow(r: any): PartnerRequest {
  return {
    id: r.id, gymId: r.gym_id, gymName: r.gym_name ?? '',
    trainerId: r.trainer_id, trainerName: r.trainer_name ?? '',
    trainerTagline: r.trainer_tagline ?? undefined,
    trainerSpecializations: r.trainer_specializations ?? undefined,
    type: r.type, status: r.status, createdAt: r.created_at ?? '',
  };
}
function mirrorReq(id: string) {
  if (!isSupabaseConfigured) return;
  const r = usePartnerStore.getState().requests.find((x) => x.id === id);
  if (!r || !isRealReq(r)) return;
  supabase.from('partner_requests').upsert(reqToRow(r)).then(() => {}, () => {});
}
function mergeReqs(rows: PartnerRequest[]) {
  usePartnerStore.setState((s) => {
    const ids = new Set(rows.map((r) => r.id));
    return { requests: [...rows, ...s.requests.filter((r) => !ids.has(r.id))] };
  });
}

const TODAY = '2026-04-28';

// 데모용 초기 신청 데이터
const SEED_REQUESTS: PartnerRequest[] = [
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
];

const init = loadPersisted(PERSIST_KEY, {
  requests: SEED_REQUESTS,
  removedPartnerIds: {} as Record<string, string[]>,
});

export const usePartnerStore = create<PartnerState>((set, get) => ({
  requests: init.requests,
  removedPartnerIds: init.removedPartnerIds,

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
    mirrorReq(req.id);
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
    mirrorReq(req.id);
  },

  approve: (requestId) => {
    set(s => ({
      requests: s.requests.map(r => r.id === requestId ? { ...r, status: 'approved' } : r),
    }));
    mirrorReq(requestId);
  },

  reject: (requestId) => {
    set(s => ({
      requests: s.requests.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r),
    }));
    mirrorReq(requestId);
  },

  cancelRequest: (requestId) => {
    const r = get().requests.find(x => x.id === requestId);
    set(s => ({ requests: s.requests.filter(r => r.id !== requestId) }));
    if (r && isRealReq(r)) supabase.from('partner_requests').delete().eq('id', requestId).then(() => {}, () => {});
  },

  removePartner: (gymId, trainerId) => {
    const toRemove = get().requests.filter(
      r => r.gymId === gymId && r.trainerId === trainerId && r.status === 'approved'
    );
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
    toRemove.forEach((r) => {
      if (isRealReq(r)) supabase.from('partner_requests').delete().eq('id', r.id).then(() => {}, () => {});
    });
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

  // 실 트레이너(uuid)의 파트너 신청을 로드. 데모/미설정은 no-op.
  loadForTrainer: async (trainerId) => {
    if (!isRealUser(trainerId)) return;
    const { data, error } = await supabase.from('partner_requests').select('*').eq('trainer_id', trainerId);
    if (error || !data) return;
    mergeReqs(data.map(reqFromRow));
  },

  // 실 헬스장(uuid)에 들어온 파트너 신청을 로드(관리자용). 데모/미설정은 no-op.
  loadForGym: async (gymId) => {
    if (!isRealUser(gymId)) return;
    const { data, error } = await supabase.from('partner_requests').select('*').eq('gym_id', gymId);
    if (error || !data) return;
    mergeReqs(data.map(reqFromRow));
  },
}));

persistOnChange(usePartnerStore, PERSIST_KEY, (s) => ({
  requests: s.requests,
  removedPartnerIds: s.removedPartnerIds,
}));
