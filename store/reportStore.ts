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
}

const init = loadPersisted(KEY, { reports: [] as Report[] });

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
}));

persistOnChange(useReportStore, KEY, (s) => ({ reports: s.reports }));
