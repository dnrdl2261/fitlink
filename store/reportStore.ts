import { create } from 'zustand';
import { loadPersisted, persistOnChange } from '../utils/persist';

// 신고 저장소. 실서비스 전환 시 그대로 Supabase 'reports' 테이블로 매핑된다.
// 운영자(플랫폼) 처리는 Supabase 단계에서 status를 검토중/조치완료로 갱신.
const KEY = 'flowin-reports';

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
    return id;
  },

  getMyReports: (reporterId) =>
    get().reports
      .filter((x) => x.reporterId === reporterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  setStatus: (id, status) => set((s) => ({ reports: s.reports.map((x) => (x.id === id ? { ...x, status } : x)) })),
}));

persistOnChange(useReportStore, KEY, (s) => ({ reports: s.reports }));
