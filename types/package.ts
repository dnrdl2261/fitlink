export interface PackageProduct {
  id: string;
  trainerId: string;
  trainerName: string;
  sessionCount: number;
  totalPrice: number;
  discountRate: number;
  validDays: number;
  freePtSessions?: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export type PackageContractStatus = 'active' | 'completed' | 'expired';

export interface PackageContract {
  id: string;
  productId: string;
  memberId: string;
  memberName: string;
  trainerId: string;
  trainerName: string;
  totalSessions: number;
  usedSessions: number;
  totalPrice: number;
  purchasedAt: string;
  expiresAt: string;
  status: PackageContractStatus;
}
