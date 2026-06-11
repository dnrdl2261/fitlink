import { create } from 'zustand';
import { PackageProduct, PackageContract } from '../types';
import { MOCK_PACKAGE_PRODUCTS, MOCK_PACKAGE_CONTRACTS } from '../data/packages';

interface PackageState {
  products: PackageProduct[];
  contracts: PackageContract[];
  addProduct: (params: Omit<PackageProduct, 'id' | 'createdAt'>) => string;
  updateProduct: (productId: string, updates: Partial<PackageProduct>) => void;
  purchasePackage: (productId: string, memberId: string, memberName: string) => string;
  useSession: (contractId: string) => void;
  getTrainerProducts: (trainerId: string) => PackageProduct[];
  getMemberContracts: (memberId: string) => PackageContract[];
  getActiveContractForTrainer: (memberId: string, trainerId: string) => PackageContract | undefined;
  getContractBuyers: (trainerId: string) => PackageContract[];
}

export const usePackageStore = create<PackageState>((set, get) => ({
  products: MOCK_PACKAGE_PRODUCTS,
  contracts: MOCK_PACKAGE_CONTRACTS,

  addProduct: (params) => {
    const id = `pkg_${Date.now()}`;
    const newProduct: PackageProduct = { ...params, id, createdAt: new Date().toISOString().split('T')[0] };
    set((s) => ({ products: [newProduct, ...s.products] }));
    return id;
  },

  updateProduct: (productId, updates) => {
    set((s) => ({
      products: s.products.map((p) => p.id === productId ? { ...p, ...updates } : p),
    }));
  },

  purchasePackage: (productId, memberId, memberName) => {
    const product = get().products.find((p) => p.id === productId);
    if (!product) return '';
    const id = `contract_${Date.now()}`;
    const purchasedAt = new Date().toISOString().split('T')[0];
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + product.validDays);
    const expiresAt = expiresDate.toISOString().split('T')[0];
    const newContract: PackageContract = {
      id,
      productId,
      memberId,
      memberName,
      trainerId: product.trainerId,
      trainerName: product.trainerName,
      totalSessions: product.sessionCount,
      usedSessions: 0,
      totalPrice: product.totalPrice,
      purchasedAt,
      expiresAt,
      status: 'active',
    };
    set((s) => ({ contracts: [newContract, ...s.contracts] }));
    return id;
  },

  useSession: (contractId) => {
    set((s) => ({
      contracts: s.contracts.map((c) => {
        if (c.id !== contractId) return c;
        const used = c.usedSessions + 1;
        const status = used >= c.totalSessions ? 'completed' : c.status;
        return { ...c, usedSessions: used, status };
      }),
    }));
  },

  getTrainerProducts: (trainerId) => {
    return get().products.filter((p) => p.trainerId === trainerId);
  },

  getMemberContracts: (memberId) => {
    return get().contracts.filter((c) => c.memberId === memberId);
  },

  getActiveContractForTrainer: (memberId, trainerId) => {
    const today = new Date().toISOString().split('T')[0];
    return get().contracts.find(
      (c) =>
        c.memberId === memberId &&
        c.trainerId === trainerId &&
        c.status === 'active' &&
        c.expiresAt >= today &&
        c.usedSessions < c.totalSessions
    );
  },

  getContractBuyers: (trainerId) => {
    return get().contracts.filter((c) => c.trainerId === trainerId);
  },
}));
