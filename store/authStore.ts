import { create } from 'zustand';
import { UserRole, Member, GymAdmin, Trainer } from '../types';
import { MOCK_MEMBER, MOCK_TRAINER_USER, MOCK_GYM_ADMINS } from '../data/users';
import { useTrainerStore } from './trainerStore';

// 테스트용 계정 (프로토타입)
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

  login: (email: string, password: string) => { success: boolean; message?: string };
  loginWithSocial: (provider: 'google' | 'kakao' | 'naver', name: string, email: string) => void;
  signup: (name: string, email: string, password: string, role: UserRole, address?: { city: string; district: string; dong: string }) => { success: boolean; message?: string };
  selectRole: (role: UserRole) => void;
  updateMember: (data: Partial<Member>) => void;
  updateTrainer: (data: Partial<Trainer>) => void;
  updateGymAdmin: (data: Partial<GymAdmin>) => void;
  logout: () => void;
}

function buildUserState(role: UserRole, name?: string, email?: string, gymId?: string) {
  const gymAdminBase = role === 'gym_admin'
    ? (MOCK_GYM_ADMINS.find((a) => a.gymId === gymId) ?? MOCK_GYM_ADMINS[0])
    : null;
  return {
    role,
    isLoggedIn: true,
    member:   role === 'member'    ? { ...MOCK_MEMBER,   ...(name ? { name } : {}), ...(email ? { email } : {}) } : null,
    trainer:  role === 'trainer'   ? { ...(useTrainerStore.getState().getTrainer(MOCK_TRAINER_USER.id) ?? MOCK_TRAINER_USER) } : null,
    gymAdmin: gymAdminBase ? { ...gymAdminBase, ...(name ? { name } : {}), ...(email ? { email } : {}) } : null,
  };
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

  login: (email, password) => {
    const account = MOCK_CREDENTIALS.find(
      (a) => a.email === email.trim().toLowerCase() && a.password === password
    );
    if (!account) {
      return { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
    }
    set(buildUserState(account.role, account.name, account.email, account.gymId));
    return { success: true };
  },

  signup: (name, email, password, role, address) => {
    if (!name.trim() || !email.trim() || !password) {
      return { success: false, message: '모든 항목을 입력해주세요.' };
    }
    if (!email.includes('@')) {
      return { success: false, message: '올바른 이메일 형식을 입력해주세요.' };
    }
    if (password.length < 4) {
      return { success: false, message: '비밀번호는 4자 이상이어야 합니다.' };
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
    set((state) => ({
      member: state.member ? { ...state.member, ...data } : null,
    }));
  },

  updateTrainer: (data) => {
    const trainer = useAuthStore.getState().trainer;
    if (!trainer) return;
    const updated = { ...trainer, ...data };
    // 공유 트레이너 스토어에도 반영 → 회원 화면/로그아웃 후에도 유지
    useTrainerStore.getState().updateTrainer(updated.id, data);
    set({ trainer: updated });
  },

  updateGymAdmin: (data) => {
    set((state) => ({
      gymAdmin: state.gymAdmin ? { ...state.gymAdmin, ...data } : null,
    }));
  },

  logout: () => {
    set({ role: null, member: null, trainer: null, gymAdmin: null, isLoggedIn: false });
  },
}));
