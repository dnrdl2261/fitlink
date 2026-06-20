import { create } from 'zustand';
import { loadPersisted, persistOnChange } from '../utils/persist';

const KEY = 'flowin-member-records';

export interface MemberRecord {
  id: string;
  trainerId: string;
  memberId: string;
  date: string;     // YYYY-MM-DD
  content: string;
  createdAt: string;
}

const dAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 데모용 시드 (trainer_001 ↔ member_001)
const SEED: MemberRecord[] = [
  {
    id: 'rec_seed_1', trainerId: 'trainer_001', memberId: 'member_001',
    date: dAgo(2),
    content: '하체 집중. 스쿼트 60kg 5x5, 레그프레스 120kg. 무릎 컨디션 양호. 다음 세션 데드리프트 추가 예정.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rec_seed_2', trainerId: 'trainer_001', memberId: 'member_001',
    date: dAgo(5),
    content: '상체 집중. 벤치프레스 45kg 4x8, 랫풀다운 50kg. 어깨 가동성 개선 필요 — 스트레칭 숙제 안내.',
    createdAt: new Date().toISOString(),
  },
];

interface MemberRecordState {
  records: MemberRecord[];
  addRecord: (r: Omit<MemberRecord, 'id' | 'createdAt'>) => void;
  removeRecord: (id: string) => void;
  getRecords: (trainerId: string, memberId: string) => MemberRecord[];
}

const init = loadPersisted(KEY, { records: SEED });

export const useMemberRecordStore = create<MemberRecordState>((set, get) => ({
  records: init.records,
  addRecord: (r) =>
    set((s) => ({
      records: [{ ...r, id: `rec_${Date.now()}`, createdAt: new Date().toISOString() }, ...s.records],
    })),
  removeRecord: (id) => set((s) => ({ records: s.records.filter((x) => x.id !== id) })),
  getRecords: (trainerId, memberId) =>
    get()
      .records.filter((x) => x.trainerId === trainerId && x.memberId === memberId)
      .sort((a, b) => (a.date !== b.date ? b.date.localeCompare(a.date) : b.createdAt.localeCompare(a.createdAt))),
}));

persistOnChange(useMemberRecordStore, KEY, (s) => ({ records: s.records }));
