import { create } from 'zustand';
import { onDbError } from '../utils/db';
import { Trainer, Certification } from '../types';
import { MOCK_TRAINERS } from '../data/trainers';
import { supabase, isSupabaseConfigured } from '../config/supabase';

// 트레이너 목록의 단일 소스(공유·영속). 트레이너가 프로필을 수정하면 여기에 반영되어
// 로그아웃 후 회원 계정으로 봐도 최신 정보가 보인다. (정적 MOCK_TRAINERS는 데모 카탈로그)
// 실 트레이너(auth uuid)는 Supabase trainers 테이블에 저장되어 회원 카탈로그에 함께 노출된다.

// 실 트레이너 식별: 카탈로그 id == auth uuid (데모 trainer_001 등은 DB 미사용)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealTrainer = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);

// Trainer → trainers row (snake_case). 실 트레이너는 id == profile_id == auth uuid.
function toRow(t: Trainer) {
  return {
    id: t.id,
    profile_id: t.id,
    name: t.name,
    gender: t.gender,
    tagline: t.tagline,
    bio: t.bio,
    region: t.region,
    address: t.address,
    session_price: t.sessionPrice,
    experience_years: t.experienceYears,
    rating: t.rating,
    review_count: t.reviewCount,
    total_sessions: t.totalSessions,
    specializations: t.specializations,
    exercise_types: t.exerciseTypes ?? [],
    training_goals: t.trainingGoals ?? [],
    training_styles: t.trainingStyles ?? [],
    conveniences: t.conveniences ?? [],
    certifications: t.certifications,
    work_history: t.workHistory,
    photos: t.photos ?? [],
    videos: t.videos ?? [],
    avatar_url: t.profileImageUrl ?? null,
  };
}

// trainers row → Trainer (카탈로그에 없는 필드는 기본값). reviews/partnerGymIds/availableSlots는 별도 도메인이라 비움.
function fromRow(r: any): Trainer {
  return {
    id: r.id,
    role: 'trainer',
    name: r.name ?? '',
    email: '',
    phone: '',
    profileImageUrl: r.avatar_url ?? undefined,
    createdAt: r.created_at ?? new Date().toISOString(),
    gender: r.gender ?? 'male',
    tagline: r.tagline ?? '',
    bio: r.bio ?? '',
    region: r.region ?? '',
    address: r.address ?? { city: '', district: '', dong: '' },
    specializations: r.specializations ?? [],
    certifications: r.certifications ?? [],
    workHistory: r.work_history ?? [],
    experienceYears: r.experience_years ?? 0,
    rating: r.rating ?? 0,
    reviewCount: r.review_count ?? 0,
    reviews: [],
    sessionPrice: r.session_price ?? 0,
    partnerGymIds: [],
    availableSlots: [],
    totalSessions: r.total_sessions ?? 0,
    monthlyEarnings: 0,
    photos: r.photos ?? [],
    videos: r.videos ?? [],
    exerciseTypes: r.exercise_types ?? [],
    trainingGoals: r.training_goals ?? [],
    trainingStyles: r.training_styles ?? [],
    conveniences: r.conveniences ?? [],
  };
}

interface TrainerState {
  trainers: Trainer[];
  upsertTrainer: (trainer: Trainer) => void;     // 로컬 목록 갱신 + 실 트레이너는 DB 미러
  getTrainer: (id: string) => Trainer | undefined;
  reviewCertification: (trainerId: string, certId: string, approved: boolean) => void;
  loadFromSupabase: () => Promise<void>;
}

export const useTrainerStore = create<TrainerState>((set, get) => ({
  trainers: MOCK_TRAINERS.map((t) => ({ ...t })),

  upsertTrainer: (trainer) => {
    set((s) => {
      const exists = s.trainers.some((t) => t.id === trainer.id);
      return {
        trainers: exists
          ? s.trainers.map((t) => (t.id === trainer.id ? trainer : t))
          : [trainer, ...s.trainers],
      };
    });
    if (isRealTrainer(trainer.id)) {
      supabase.from('trainers').upsert(toRow(trainer)).then(() => {}, onDbError);
    }
  },

  getTrainer: (id) => get().trainers.find((t) => t.id === id),

  // 운영자 자격 심사. 트레이너는 verified를 스스로 켤 수 없고(등록 시 항상 false),
  // 운영자만 이 경로로 승인·반려한다.
  // ⚠️ upsert가 아니라 update를 쓴다 — upsert는 INSERT 권한을 요구하는데
  //    trainers insert 정책은 본인(profile_id = auth.uid())만 허용이라 운영자는 막힌다.
  reviewCertification: (trainerId, certId, approved) => {
    const reviewedAt = new Date().toISOString();
    let next: Certification[] | null = null;

    set((s) => ({
      trainers: s.trainers.map((t) => {
        if (t.id !== trainerId) return t;
        next = (t.certifications ?? []).map((c) =>
          c.id === certId ? { ...c, verified: approved, reviewedAt } : c
        );
        return { ...t, certifications: next };
      }),
    }));

    if (next && isRealTrainer(trainerId)) {
      supabase.from('trainers').update({ certifications: next }).eq('id', trainerId)
        .then(() => {}, onDbError);
    }
  },

  // Supabase trainers(실 트레이너)를 목록에 병합(id 기준 DB 우선). mock 카탈로그는 유지. 미설정 시 no-op.
  loadFromSupabase: async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.from('trainers').select('*');
    if (error || !data) return;
    const dbTrainers = data.map(fromRow);
    set((s) => {
      const ids = new Set(dbTrainers.map((t) => t.id));
      return { trainers: [...dbTrainers, ...s.trainers.filter((t) => !ids.has(t.id))] };
    });
  },
}));
