import { Member, GymAdmin } from '../types';
import { Trainer } from '../types';
import { MOCK_TRAINERS } from './trainers';

export const MOCK_MEMBER: Member = {
  id: 'member_001',
  name: '홍길동',
  email: 'gildong@email.com',
  phone: '010-0000-0001',
  profileImageUrl: 'https://picsum.photos/seed/member1/200/200',
  role: 'member',
  createdAt: '2026-01-01',
  fitnessGoals: ['체중감량', '체력향상'],
  preferredLocations: ['강남구', '서초구'],
};

export const MOCK_TRAINER_USER: Trainer = MOCK_TRAINERS[0];

export const MOCK_GYM_ADMINS: GymAdmin[] = [
  {
    id: 'admin_001',
    name: '강남짐 관리자',
    email: 'gym@fitlink.com',
    phone: '02-1234-5678',
    role: 'gym_admin',
    createdAt: '2020-01-01',
    gymId: 'gym_001',
  },
  {
    id: 'admin_002',
    name: '역삼짐 관리자',
    email: 'gym2@fitlink.com',
    phone: '02-2345-6789',
    role: 'gym_admin',
    createdAt: '2020-01-01',
    gymId: 'gym_002',
  },
  {
    id: 'admin_003',
    name: '홍대짐 관리자',
    email: 'gym3@fitlink.com',
    phone: '02-3456-7890',
    role: 'gym_admin',
    createdAt: '2020-01-01',
    gymId: 'gym_003',
  },
];

export const MOCK_GYM_ADMIN = MOCK_GYM_ADMINS[0];
