import { create } from 'zustand';
import { loadPersisted, persistOnChange } from '../utils/persist';
import { supabase, isSupabaseConfigured } from '../config/supabase';

// 신고 저장소. 실 사용자(uuid) 신고는 Supabase 'reports'에 미러, 운영자가 전체 조회·처리.
// 데모(mock id) 신고는 로컬 메모리만(둘러보기).
const KEY = 'flowin-reports';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealUser = (id?: string) => isSupabaseConfigured && !!id && UUID_RE.test(id);

export type ReportStatus = '접수' | '검토중' | '조치완료' | '반려';
export type ReportTargetType = 'trainer' | 'gym' | 'member' | 'content';

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: ReportTargetType;
  targetId?: string;
  targetName: string;
  reason: string;
  detail?: string;
  status: ReportStatus;
  createdAt: string;
}

interface ReportState {
  reports: Report[];
  addReport: (r: Omit<Report, 'id' | 'status' | 'createdAt'>) => string;
  getMyReports: (reporterId: string) => Report[];
  setStatus: (id: string, status: ReportStatus) => void;
  loadAll: () => Promise<void>;
}

function reportToRow(r: Report) {
  return {
    id: r.id, reporter_id: r.reporterId, reporter_name: r.reporterName,
    target_type: r.targetType, target_id: r.targetId ?? null, target_name: r.targetName,
    reason: r.reason, detail: r.detail ?? null, status: r.status, created_at: r.createdAt,
  };
}
function reportFromRow(x: any): Report {
  return {
    id: x.id, reporterId: x.reporter_id, reporterName: x.reporter_name,
    targetType: x.target_type, targetId: x.target_id ?? undefined, targetName: x.target_name,
    reason: x.reason, detail: x.detail ?? undefined, status: x.status, createdAt: x.created_at,
  };
}
function mergeReports(local: Report[], remote: Report[]): Report[] {
  const map = new Map(local.map((r) => [r.id, r]));
  remote.forEach((r) => map.set(r.id, r));
  return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const dAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };

// 운영자 콘솔 시연용 데모 신고
const SEED_REPORTS: Report[] = [
  { id: 'report_seed_1', reporterId: 'member_002', reporterName: '김영희', targetType: 'trainer', targetId: 'trainer_003', targetName: '박철수 트레이너', reason: '약속 불이행 (무단 노쇼)', status: '접수', createdAt: dAgo(1) },
  { id: 'report_seed_2', reporterId: 'member_003', reporterName: '박민수', targetType: 'gym', targetId: 'gym_002', targetName: '역삼 스포츠센터', reason: '위생·안전 문제', status: '검토중', createdAt: dAgo(3) },
];

const init = loadPersisted(KEY, { reports: SEED_REPORTS });

export const useReportStore = create<ReportState>((set, get) => ({
  reports: init.reports,

  addReport: (r) => {
    const id = `report_${Date.now()}`;
    const report: Report = { ...r, id, status: '접수', createdAt: new Date().toISOString() };
    set((s) => ({ reports: [report, ...s.reports] }));
    if (isRealUser(report.reporterId)) {
      supabase.from('reports').insert(reportToRow(report)).then(() => {}, () => {});
    }
    return id;
  },

  getMyReports: (reporterId) =>
    get().reports
      .filter((x) => x.reporterId === reporterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  setStatus: (id, status) => {
    set((s) => ({ reports: s.reports.map((x) => (x.id === id ? { ...x, status } : x)) }));
    if (isSupabaseConfigured) supabase.from('reports').update({ status }).eq('id', id).then(() => {}, () => {});
  },

  // 운영자 전체 조회(RLS: 운영자만 전체 행 반환). 미설정/비운영자는 no-op.
  loadAll: async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase.from('reports').select('*');
    if (!data) return;
    set((s) => ({ reports: mergeReports(s.reports, data.map(reportFromRow)) }));
  },
}));

persistOnChange(useReportStore, KEY, (s) => ({ reports: s.reports }));
