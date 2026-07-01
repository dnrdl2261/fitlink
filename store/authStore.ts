import { create } from 'zustand';
import { UserRole, Member, GymAdmin, Trainer } from '../types';
import { MOCK_MEMBER, MOCK_TRAINER_USER, MOCK_GYM_ADMINS } from '../data/users';
import { useTrainerStore } from './trainerStore';
import { useGymStore, emptyGym } from './gymStore';
import { supabase, isSupabaseConfigured } from '../config/supabase';

// 데모/테스트용 계정 (둘러보기 + 미설정 시 mock 로그인)
const MOCK_CREDENTIALS: Array<{
  email: string;
  password: string;
  role: UserRole;
  name: string;
  gymId?: string;
}> = [
  { email: 'member@fitlink.com',  password: '1234', role: 'member',    name: '홍길동' },
  { email: 'trainer@fitlink.com', password: '1234', role: 'trainer',   name: '김철수' },
  { email: 'gym@fitlink.com',     password: '1234', role: 'gym_admin', name: '강남짐 관리자', gymId: 'gym_001' },
  { email: 'gym2@fitlink.com',    password: '1234', role: 'gym_admin', name: '역삼짐 관리자',  gymId: 'gym_002' },
  { email: 'gym3@fitlink.com',    password: '1234', role: 'gym_admin', name: '홍대짐 관리자',  gymId: 'gym_003' },
];

interface AuthState {
  role: UserRole | null;
  member: Member | null;
  trainer: Trainer | null;
  gymAdmin: GymAdmin | null;
  isLoggedIn: boolean;

  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginWithSocial: (provider: 'google' | 'kakao' | 'naver', name: string, email: string) => void;
  signup: (name: string, email: string, password: string, role: UserRole, address?: { city: string; district: string; dong: string }, marketingConsent?: boolean) => Promise<{ success: boolean; message?: string }>;
  selectRole: (role: UserRole) => void;
  updateMember: (data: Partial<Member>) => void;
  updateTrainer: (data: Partial<Trainer>) => void;
  updateGymAdmin: (data: Partial<GymAdmin>) => void;
  restoreSession: () => Promise<void>;
  logout: () => void;
}

// 실 트레이너의 빈 프로필(데모 데이터 상속 방지). 본인이 edit-profile에서 채운다.
function emptyTrainerProfile(id: string, name: string, email: string): Trainer {
  return {
    id, role: 'trainer', name, email, phone: '', createdAt: new Date().toISOString(),
    gender: 'male', tagline: '', bio: '', region: '',
    address: { city: '', district: '', dong: '' },
    specializations: [], certifications: [], workHistory: [],
    experienceYears: 0, rating: 0, reviewCount: 0, reviews: [],
    sessionPrice: 0, partnerGymIds: [], availableSlots: [],
    totalSessions: 0, monthlyEarnings: 0,
    photos: [], videos: [], exerciseTypes: [], trainingGoals: [], trainingStyles: [], conveniences: [],
  };
}

// 실 사용자/데모 공통 로컬 상태 구성. realId가 있으면 실제 인증 ID로 덮어쓴다(실 사용자는 데모 데이터와 분리).
// 실 트레이너(realId)는 데모(trainer_001) 데이터를 상속하지 않도록 빈 프로필로 시작한다.
function buildUserState(role: UserRole, name?: string, email?: string, gymId?: string, realId?: string) {
  const gymAdminBase = role === 'gym_admin'
    ? (MOCK_GYM_ADMINS.find((a) => a.gymId === gymId) ?? MOCK_GYM_ADMINS[0])
    : null;
  return {
    role,
    isLoggedIn: true,
    member:   role === 'member'    ? { ...MOCK_MEMBER,   ...(realId ? { id: realId } : {}), ...(name ? { name } : {}), ...(email ? { email } : {}) } : null,
    trainer:  role === 'trainer'
      ? (realId
          ? emptyTrainerProfile(realId, name ?? '', email ?? '')
          : { ...(useTrainerStore.getState().getTrainer(MOCK_TRAINER_USER.id) ?? MOCK_TRAINER_USER), ...(name ? { name } : {}) })
      : null,
    gymAdmin: role === 'gym_admin'
      ? (realId
          // 실 관리자: 자신의 헬스장(gymId == 관리자 uuid)을 가진다(트레이너 패턴).
          ? { id: realId, name: name ?? '', email: email ?? '', phone: '', role: 'gym_admin' as const, createdAt: new Date().toISOString(), gymId: realId }
          : (gymAdminBase ? { ...gymAdminBase, ...(name ? { name } : {}), ...(email ? { email } : {}) } : null))
      : null,
  };
}

// 이메일 확인 링크가 돌아올 앱 주소 (웹). 배포 base가 /fitlink 이므로 origin + /fitlink/.
function emailRedirectUrl(): string | undefined {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/fitlink/`;
  }
  return undefined;
}

// Supabase 사용자 → profiles 조회 후 로컬 상태 구성
async function buildFromSupabase(userId: string, email: string) {
  const { data } = await supabase.from('profiles').select('role, name').eq('id', userId).single();
  const role = (data?.role as UserRole) ?? 'member';
  const base = buildUserState(role, data?.name || '', email, undefined, userId);
  // 실 트레이너는 저장된 카탈로그 프로필(trainers 테이블)을 로컬 상태로 반영. 없으면 mock 템플릿 유지(첫 프로필 작성 전).
  if (role === 'trainer') {
    await useTrainerStore.getState().loadFromSupabase();
    const dbTrainer = useTrainerStore.getState().getTrainer(userId);
    if (dbTrainer) {
      base.trainer = { ...dbTrainer, name: data?.name || dbTrainer.name, email };
    }
  }
  // 실 관리자: 자신의 헬스장(gyms 행, id==uuid)을 로드. 없으면 로컬 빈 헬스장 시드(첫 시설설정 전, 관리자 화면이 찾도록).
  if (role === 'gym_admin') {
    await useGymStore.getState().loadFromSupabase();
    if (!useGymStore.getState().getGym(userId)) {
      useGymStore.getState().ensureLocalGym(emptyGym(userId, data?.name || ''));
    }
  }
  return base;
}

// 프로필 기본 필드(name/phone)를 Supabase profiles에 동기화. 실 사용자만; 데모/미설정은 no-op.
function syncProfileToSupabase(userId: string | undefined, data: any) {
  if (!isSupabaseConfigured || !userId) return;
  const fields: Record<string, any> = {};
  if (typeof data?.name === 'string') fields.name = data.name;
  if (typeof data?.phone === 'string') fields.phone = data.phone;
  if (Object.keys(fields).length === 0) return;
  supabase.from('profiles').update(fields).eq('id', userId).then(() => {}, () => {});
}

export const useAuthStore = create<AuthState>((set) => ({
  role: null,
  member: null,
  trainer: null,
  gymAdmin: null,
  isLoggedIn: false,

  loginWithSocial: (provider, name, email) => {
    set(buildUserState('member', name, email));
  },

  login: async (email, password) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error || !data.user) {
        return { success: false, message: error?.message ?? '이메일 또는 비밀번호가 올바르지 않습니다.' };
      }
      set(await buildFromSupabase(data.user.id, data.user.email ?? email));
      return { success: true };
    }
    const account = MOCK_CREDENTIALS.find(
      (a) => a.email === email.trim().toLowerCase() && a.password === password
    );
    if (!account) {
      return { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
    }
    set(buildUserState(account.role, account.name, account.email, account.gymId));
    return { success: true };
  },

  signup: async (name, email, password, role, address, marketingConsent = false) => {
    if (!name.trim() || !email.trim() || !password) {
      return { success: false, message: '모든 항목을 입력해주세요.' };
    }
    if (!email.includes('@')) {
      return { success: false, message: '올바른 이메일 형식을 입력해주세요.' };
    }
    if (password.length < 4) {
      return { success: false, message: '비밀번호는 4자 이상이어야 합니다.' };
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { name: name.trim(), role, marketing_consent: marketingConsent }, emailRedirectTo: emailRedirectUrl() },
      });
      if (error) return { success: false, message: error.message };
      if (!data.session) {
        return { success: false, message: '확인 메일을 보냈어요. 메일의 인증 링크를 누르면 로그인됩니다.\n\n이미 가입된 이메일이라면 메일이 오지 않을 수 있어요. 그땐 로그인해 주세요.' };
      }
      const state = buildUserState(role, name.trim(), email.trim().toLowerCase(), undefined, data.user?.id);
      if (role === 'member' && address && state.member) {
        state.member = { ...state.member, address };
      }
      set(state);
      return { success: true };
    }

    const state = buildUserState(role, name.trim(), email.trim().toLowerCase());
    if (role === 'member' && address && state.member) {
      state.member = { ...state.member, address };
    }
    set(state);
    return { success: true };
  },

  selectRole: (role) => {
    set(buildUserState(role));
  },

  updateMember: (data) => {
    syncProfileToSupabase(useAuthStore.getState().member?.id, data);
    set((state) => ({
      member: state.member ? { ...state.member, ...data } : null,
    }));
  },

  updateTrainer: (data) => {
    const trainer = useAuthStore.getState().trainer;
    if (!trainer) return;
    syncProfileToSupabase(trainer.id, data);
    const updated = { ...trainer, ...data };
    // 공유 트레이너 스토어에 반영(회원 화면/로그아웃 후에도 유지) + 실 트레이너는 trainers 카탈로그에 영속
    useTrainerStore.getState().upsertTrainer(updated);
    set({ trainer: updated });
  },

  updateGymAdmin: (data) => {
    syncProfileToSupabase(useAuthStore.getState().gymAdmin?.id, data);
    set((state) => ({
      gymAdmin: state.gymAdmin ? { ...state.gymAdmin, ...data } : null,
    }));
  },

  restoreSession: async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (user) {
      set(await buildFromSupabase(user.id, user.email ?? ''));
    }
  },

  logout: () => {
    if (isSupabaseConfigured) supabase.auth.signOut().catch(() => {});
    set({ role: null, member: null, trainer: null, gymAdmin: null, isLoggedIn: false });
  },
}));
