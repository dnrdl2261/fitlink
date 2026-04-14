import { create } from 'zustand';
import { UserRole, Member, GymAdmin } from '../types';
import { Trainer } from '../types';
import { MOCK_MEMBER, MOCK_TRAINER_USER, MOCK_GYM_ADMIN } from '../data/users';

// 테스트용 계정 (프로토타입)
const MOCK_CREDENTIALS: Array<{
  email: string;
  password: string;
  role: UserRole;
  name: string;
}> = [
  { email: 'member@fitlink.com',  password: '1234', role: 'member',    name: '홍길동' },
  { email: 'trainer@fitlink.com', password: '1234', role: 'trainer',   name: '김철수' },
  { email: 'gym@fitlink.com',     password: '1234', role: 'gym_admin', name: '강남짐 관리자' },
];

interface AuthState {
  role: UserRole | null;
  member: Member | null;
  trainer: Trainer | null;
  gymAdmin: GymAdmin | null;
  isLoggedIn: boolean;

  login: (email: string, password: string) => { success: boolean; message?: string };
  signup: (name: string, email: string, password: string, role: UserRole) => { success: boolean; message?: string };
  selectRole: (role: UserRole) => void;   // 데모용 역할 선택
  logout: () => void;
}

function buildUserState(role: UserRole, name?: string, email?: string) {
  return {
    role,
    isLoggedIn: true,
    member:   role === 'member'    ? { ...MOCK_MEMBER,   ...(name ? { name } : {}), ...(email ? { email } : {}) } : null,
    trainer:  role === 'trainer'   ? { ...MOCK_TRAINER_USER } : null,
    gymAdmin: role === 'gym_admin' ? { ...MOCK_GYM_ADMIN, ...(name ? { name } : {}), ...(email ? { email } : {}) } : null,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  role: null,
  member: null,
  trainer: null,
  gymAdmin: null,
  isLoggedIn: false,

  login: (email, password) => {
    const account = MOCK_CREDENTIALS.find(
      (a) => a.email === email.trim().toLowerCase() && a.password === password
    );
    if (!account) {
      return { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
    }
    set(buildUserState(account.role, account.name, account.email));
    return { success: true };
  },

  signup: (name, email, password, role) => {
    if (!name.trim() || !email.trim() || !password) {
      return { success: false, message: '모든 항목을 입력해주세요.' };
    }
    if (!email.includes('@')) {
      return { success: false, message: '올바른 이메일 형식을 입력해주세요.' };
    }
    if (password.length < 4) {
      return { success: false, message: '비밀번호는 4자 이상이어야 합니다.' };
    }
    set(buildUserState(role, name.trim(), email.trim().toLowerCase()));
    return { success: true };
  },

  selectRole: (role) => {
    set(buildUserState(role));
  },

  logout: () => {
    set({ role: null, member: null, trainer: null, gymAdmin: null, isLoggedIn: false });
  },
}));
