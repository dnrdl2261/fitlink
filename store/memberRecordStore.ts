import { create } from 'zustand';
import { onDbError } from '../utils/db';
import { loadPersisted, persistOnChange } from '../utils/persist';
import { supabase, isSupabaseConfigured } from '../config/supabase';

const KEY = 'flowin-member-records';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealUser = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);

function recToRow(r: MemberRecord) {
  return {
    id: r.id, trainer_id: r.trainerId, trainer_name: r.trainerName, member_id: r.memberId,
    date: r.date, content: r.content, shared: r.shared, created_at: r.createdAt,
  };
}
function recFromRow(x: any): MemberRecord {
  return {
    id: x.id, trainerId: x.trainer_id, trainerName: x.trainer_name ?? '', memberId: x.member_id,
    date: x.date ?? '', content: x.content ?? '', shared: !!x.shared, createdAt: x.created_at ?? '',
  };
}
function mergeRecords(local: MemberRecord[], remote: MemberRecord[]): MemberRecord[] {
  const map = new Map(local.map((r) => [r.id, r]));
  remote.forEach((r) => map.set(r.id, r));
  return Array.from(map.values());
}

export interface MemberRecord {
  id: string;
  trainerId: string;
  trainerName: string;
  memberId: string;
  date: string;     // YYYY-MM-DD
  content: string;
  shared: boolean;  // 회원에게 공개 여부
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
    id: 'rec_seed_1', trainerId: 'trainer_001', trainerName: '김민준', memberId: 'member_001',
    date: dAgo(2), shared: true,
    content: '하체 집중. 스쿼트 60kg 5x5, 레그프레스 120kg. 무릎 컨디션 양호. 다음 세션 데드리프트 추가 예정.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rec_seed_2', trainerId: 'trainer_001', trainerName: '김민준', memberId: 'member_001',
    date: dAgo(5), shared: true,
    content: '상체 집중. 벤치프레스 45kg 4x8, 랫풀다운 50kg. 어깨 가동성 개선 필요 — 스트레칭 숙제 안내.',
    createdAt: new Date().toISOString(),
  },
];

interface MemberRecordState {
  records: MemberRecord[];
  addRecord: (r: Omit<MemberRecord, 'id' | 'createdAt'>) => void;
  removeRecord: (id: string) => void;
  toggleShared: (id: string) => void;
  getRecords: (trainerId: string, memberId: string) => MemberRecord[];
  getMemberRecords: (memberId: string) => MemberRecord[];
  loadForTrainer: (trainerId: string) => Promise<void>;
  loadForMember: (memberId: string) => Promise<void>;
}

const init = loadPersisted(KEY, { records: SEED });

export const useMemberRecordStore = create<MemberRecordState>((set, get) => ({
  records: init.records,
  addRecord: (r) => {
    const rec: MemberRecord = { ...r, id: `rec_${Date.now()}`, createdAt: new Date().toISOString() };
    set((s) => ({ records: [rec, ...s.records] }));
    // 실 트레이너가 작성한 기록만 DB 미러.
    if (isRealUser(rec.trainerId)) {
      supabase.from('member_records').insert(recToRow(rec)).then(() => {}, onDbError);
    }
  },
  removeRecord: (id) => {
    const rec = get().records.find((x) => x.id === id);
    set((s) => ({ records: s.records.filter((x) => x.id !== id) }));
    if (rec && isRealUser(rec.trainerId)) {
      supabase.from('member_records').delete().eq('id', id).then(() => {}, onDbError);
    }
  },
  toggleShared: (id) => {
    set((s) => ({ records: s.records.map((x) => (x.id === id ? { ...x, shared: !x.shared } : x)) }));
    const rec = get().records.find((x) => x.id === id);
    if (rec && isRealUser(rec.trainerId)) {
      supabase.from('member_records').update({ shared: rec.shared }).eq('id', id).then(() => {}, onDbError);
    }
  },
  getRecords: (trainerId, memberId) =>
    get()
      .records.filter((x) => x.trainerId === trainerId && x.memberId === memberId)
      .sort((a, b) => (a.date !== b.date ? b.date.localeCompare(a.date) : b.createdAt.localeCompare(a.createdAt))),
  getMemberRecords: (memberId) =>
    get()
      .records.filter((x) => x.memberId === memberId && x.shared)
      .sort((a, b) => (a.date !== b.date ? b.date.localeCompare(a.date) : b.createdAt.localeCompare(a.createdAt))),

  // 트레이너: 본인이 작성한 전체 기록 로드. 회원: 본인에게 공개된 기록 로드. 데모/미설정은 no-op.
  loadForTrainer: async (trainerId) => {
    if (!isRealUser(trainerId)) return;
    const { data } = await supabase.from('member_records').select('*').eq('trainer_id', trainerId);
    if (!data) return;
    set((s) => ({ records: mergeRecords(s.records, data.map(recFromRow)) }));
  },
  loadForMember: async (memberId) => {
    if (!isRealUser(memberId)) return;
    const { data } = await supabase.from('member_records').select('*').eq('member_id', memberId).eq('shared', true);
    if (!data) return;
    set((s) => ({ records: mergeRecords(s.records, data.map(recFromRow)) }));
  },
}));

persistOnChange(useMemberRecordStore, KEY, (s) => ({ records: s.records }));
