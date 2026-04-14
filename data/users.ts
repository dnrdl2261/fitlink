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

export const MOCK_GYM_ADMIN: GymAdmin = {
  id: 'admin_001',
  name: '강남짐 관리자',
  email: 'admin@gangnamfitness.kr',
  phone: '02-1234-5678',
  role: 'gym_admin',
  createdAt: '2020-01-01',
  gymId: 'gym_001',
};
