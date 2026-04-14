export type UserRole = 'member' | 'trainer' | 'gym_admin';

export interface BaseUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  profileImageUrl?: string;
  role: UserRole;
  createdAt: string;
}

export interface Member extends BaseUser {
  role: 'member';
  fitnessGoals: string[];
  preferredLocations: string[];
}

export interface GymAdmin extends BaseUser {
  role: 'gym_admin';
  gymId: string;
}
