import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, SafeAreaView, Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useReportStore, ReportTargetType, ReportStatus } from '../../store/reportStore';
import SafetyActionModal, { SafetyModalType } from '../../components/SafetyActionModal';

const STATUS_COLOR: Record<ReportStatus, string> = {
  '접수': '#F59E0B', '검토중': '#4F63F5', '조치완료': '#10B981', '반려': '#94A3B8',
};

const D = {
  bg:          '#EEF2F9',
  surface:     '#FFFFFF',
  primary:     '#4F63F5',
  primaryGlow: 'rgba(79,99,245,0.12)',
  text:        '#0F172A',
  textSec:     '#64748B',
  textMuted:   '#94A3B8',
  border:      '#E2E8F0',
  success:     '#10B981',
  error:       '#EF4444',
  amber:       '#F59E0B',
  amberPale:   'rgba(245,158,11,0.10)',
};

const REPORT_REASONS = [
  '부적절한 언행 또는 성희롱',
  '허위 자격증·경력 기재',
  '약속 불이행 (무단 노쇼)',
  '과도한 광고·스팸',
  '사기 또는 금전 갈취',
  '기타',
];

const SECURITY_LOGS = [
  { device: 'iPhone 15 Pro', location: '서울 강남구', time: '방금 전', current: true },
  { device: 'Chrome (Mac)', location: '서울 마포구', time: '어제 14:32', current: false },
  { device: 'Samsung Galaxy S24', location: '경기 성남시', time: '3일 전 09:15', current: false },
];

export default function SafetyScreen() {
  const router = useRouter();
  const { trainer } = useAuthStore();
  const { addReport, getMyReports } = useReportStore();
  const myReports = getMyReports(trainer?.id ?? '');
  const [reportModal, setReportModal] = useState(false);
  const [reportTargetType, setReportTargetType] = useState<ReportTargetType>('member');
  const [reportDone, setReportDone] = useState(false);
  const [safetyModal, setSafetyModal] = useState<SafetyModalType>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [loginAlert, setLoginAlert] = useState(true);
  const [locationSetting, setLocationSetting] = useState(true);
  const [adultFilter, setAdultFilter] = useState(true);

  const handleReport = () => {
    if (!selectedReason) return;
    addReport({
      reporterId: trainer?.id ?? '',
      reporterName: trainer?.name ?? '트레이너',
      targetType: reportTargetType,
      targetName: reportTargetType === 'member' ? '회원(미지정)' : '부적절한 콘텐츠',
      reason: selectedReason,
    });
    setReportModal(false);
    setSelectedReason('');
    setReportDone(true);
  };
  const openReport = (t: ReportTargetType) => { setReportTargetType(t); setReportModal(true); };

  const toggle = (setter: React.Dispatch<React.SetStateAction<boolean>>, val: boolean) => {
    setter(!val);
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.navigate('/(trainer)/more' as any)} style={s.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={D.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>안전 및 보안</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <MaterialCommunityIcons name="shield-check" size={32} color={D.primary} />
          </View>
          <View style={s.bannerText}>
            <Text style={s.bannerTitle}>FLOWIN 안전 시스템</Text>
            <Text style={s.bannerSub}>모든 트레이너는 자격 인증 및 신원 확인을 거쳤습니다</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>신고하기</Text>
          <View style={s.card}>
            <MenuItem icon="flag-outline" iconColor={D.error} iconBg={D.error + '12'} label="회원 신고" sub="부적절한 행동·허위 정보 신고" onPress={() => openReport('member')} accent />
            <Divider />
            <MenuItem icon="alert-circle-outline" iconColor={D.amber} iconBg={D.amberPale} label="부적절한 콘텐츠 신고" sub="불법·음란·혐오 콘텐츠 신고" onPress={() => openReport('content')} />
            <Divider />
            <MenuItem icon="account-cancel-outline" iconColor={D.textSec} iconBg={D.bg} label="차단 목록 관리" sub="차단한 사용자 확인 및 해제" onPress={() => setSafetyModal('blocklist')} />
          </View>
        </View>

        {/* ── 내 신고 내역 ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>내 신고 내역</Text>
          <View style={s.card}>
            {myReports.length === 0 ? (
              <Text style={s.emptyReport}>접수한 신고가 없습니다</Text>
            ) : (
              myReports.map((r, i) => (
                <View key={r.id} style={[s.reportRow, i < myReports.length - 1 && s.reportRowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.reportTarget} numberOfLines={1}>{r.targetName} · {r.reason}</Text>
                    <Text style={s.reportDate}>{r.createdAt.slice(0, 10)}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: STATUS_COLOR[r.status] + '18' }]}>
                    <Text style={[s.statusText, { color: STATUS_COLOR[r.status] }]}>{r.status}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>계정 보호</Text>
          <View style={s.card}>
            <MenuItem icon="lock-reset" iconColor={D.primary} iconBg={D.primaryGlow} label="비밀번호 변경" sub="정기적으로 변경하면 계정이 안전해요" onPress={() => setSafetyModal('password')} />
            <Divider />
            <ToggleItem icon="two-factor-authentication" iconColor={D.success} iconBg={D.success + '15'} label="2단계 인증" sub="로그인 시 추가 인증 단계 활성화" value={twoFAEnabled} onToggle={() => toggle(setTwoFAEnabled, twoFAEnabled)} />
            <Divider />
            <ToggleItem icon="bell-ring-outline" iconColor={D.primary} iconBg={D.primaryGlow} label="로그인 알림" sub="새 기기에서 로그인 시 즉시 알림" value={loginAlert} onToggle={() => toggle(setLoginAlert, loginAlert)} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>개인 보호</Text>
          <View style={s.card}>
            <MenuItem icon="eye-settings-outline" iconColor={D.primary} iconBg={D.primaryGlow} label="개인정보 공개 설정" sub="프로필·연락처 공개 범위 설정" onPress={() => setSafetyModal('privacy')} />
            <Divider />
            <ToggleItem icon="map-marker-outline" iconColor={D.success} iconBg={D.success + '15'} label="위치 정보 관리" sub="내 위치를 회원에게 공유" value={locationSetting} onToggle={() => toggle(setLocationSetting, locationSetting)} />
            <Divider />
            <MenuItem icon="database-remove-outline" iconColor={D.error} iconBg={D.error + '12'} label="개인정보 삭제 요청" sub="계정 및 활동 데이터 삭제 신청" onPress={() => setSafetyModal('delete')} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>미성년자 보호</Text>
          <View style={s.card}>
            <ToggleItem icon="shield-account-outline" iconColor={D.success} iconBg={D.success + '15'} label="성인 콘텐츠 필터" sub="미성년자 이용에 적합한 콘텐츠만 표시" value={adultFilter} onToggle={() => toggle(setAdultFilter, adultFilter)} />
            <Divider />
            <MenuItem icon="account-child-outline" iconColor={D.amber} iconBg={D.amberPale} label="미성년 회원 관리" sub="미성년 회원 수업 시 보호자 동의 현황" onPress={() => setSafetyModal('minor')} />
          </View>
          <View style={s.minorNotice}>
            <MaterialCommunityIcons name="information-outline" size={14} color={D.textMuted} />
            <Text style={s.minorNoticeText}>만 14세 미만 회원 수업 시 보호자 동의서가 필요합니다</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>보안 이력</Text>
          <View style={s.card}>
            <Text style={s.subhead}>최근 로그인 기기</Text>
            {SECURITY_LOGS.map((log, i) => (
              <View key={i} style={[s.logRow, i < SECURITY_LOGS.length - 1 && s.logRowBorder]}>
                <View style={[s.logDot, log.current && s.logDotActive]} />
                <View style={s.logInfo}>
                  <View style={s.logTitleRow}>
                    <Text style={s.logDevice}>{log.device}</Text>
                    {log.current && <View style={s.currentBadge}><Text style={s.currentBadgeText}>현재 기기</Text></View>}
                  </View>
                  <Text style={s.logMeta}>{log.location} · {log.time}</Text>
                </View>
                {!log.current && (
                  <TouchableOpacity style={s.logSignOut}>
                    <Text style={s.logSignOutText}>로그아웃</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={s.allSignOutBtn}>
              <Text style={s.allSignOutText}>다른 모든 기기에서 로그아웃</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={reportModal} transparent animationType="slide" onRequestClose={() => setReportModal(false)}>
        <TouchableWithoutFeedback onPress={() => setReportModal(false)}>
          <View style={s.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={s.modalSheet}>
                <View style={s.modalHandle} />
                <Text style={s.modalTitle}>신고 이유 선택</Text>
                <Text style={s.modalSub}>허위 신고 시 이용이 제한될 수 있습니다</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {REPORT_REASONS.map((r) => (
                    <TouchableOpacity key={r} style={[s.reasonRow, selectedReason === r && s.reasonRowActive]} onPress={() => setSelectedReason(r)} activeOpacity={0.7}>
                      <View style={[s.reasonRadio, selectedReason === r && s.reasonRadioActive]}>
                        {selectedReason === r && <View style={s.reasonRadioDot} />}
                      </View>
                      <Text style={[s.reasonText, selectedReason === r && s.reasonTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                  <View style={{ height: 16 }} />
                </ScrollView>
                <TouchableOpacity style={[s.reportBtn, !selectedReason && s.reportBtnOff]} onPress={handleReport} disabled={!selectedReason}>
                  <Text style={[s.reportBtnText, !selectedReason && { color: D.textMuted }]}>신고 접수</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 신고 접수 완료 */}
      <Modal visible={reportDone} transparent animationType="fade" onRequestClose={() => setReportDone(false)}>
        <View style={s.doneOverlay}>
          <View style={s.doneBox}>
            <Text style={{ fontSize: 40 }}>✅</Text>
            <Text style={s.doneTitle}>신고가 접수되었습니다</Text>
            <Text style={s.doneMsg}>운영팀이 검토 후 조치합니다.{'\n'}아래 '내 신고 내역'에서 처리 상태를 확인할 수 있어요.</Text>
            <TouchableOpacity style={s.doneBtn} onPress={() => setReportDone(false)}>
              <Text style={s.doneBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SafetyActionModal type={safetyModal} role="trainer" onClose={() => setSafetyModal(null)} />
    </SafeAreaView>
  );
}

function MenuItem({ icon, iconColor, iconBg, label, sub, onPress, accent }: { icon: string; iconColor: string; iconBg: string; label: string; sub: string; onPress: () => void; accent?: boolean }) {
  return (
    <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.menuIconBox, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={s.menuText}>
        <Text style={[s.menuLabel, accent && { color: D.error }]}>{label}</Text>
        <Text style={s.menuSub}>{sub}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={D.textMuted} />
    </TouchableOpacity>
  );
}

function ToggleItem({ icon, iconColor, iconBg, label, sub, value, onToggle }: { icon: string; iconColor: string; iconBg: string; label: string; sub: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={s.menuRow}>
      <View style={[s.menuIconBox, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={s.menuText}>
        <Text style={s.menuLabel}>{label}</Text>
        <Text style={s.menuSub}>{sub}</Text>
      </View>
      <TouchableOpacity style={[s.toggle, value && s.toggleOn]} onPress={onToggle} activeOpacity={0.8}>
        <View style={[s.toggleThumb, value && s.toggleThumbOn]} />
      </TouchableOpacity>
    </View>
  );
}

function Divider() { return <View style={s.divider} />; }

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: D.text },
  content: { padding: 16, gap: 4 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: D.primaryGlow, borderRadius: 18, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: D.primary + '25' },
  bannerIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: D.surface, alignItems: 'center', justifyContent: 'center', shadowColor: D.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: D.primary, marginBottom: 3 },
  bannerSub: { fontSize: 12, color: D.textSec, lineHeight: 17 },
  section: { marginTop: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: D.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: D.surface, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '600', color: D.text },
  menuSub: { fontSize: 12, color: D.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: D.bg, marginLeft: 68 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: D.border, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: D.success },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignSelf: 'flex-start' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  subhead: { fontSize: 13, fontWeight: '700', color: D.textSec, padding: 16, paddingBottom: 8 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  logRowBorder: { borderBottomWidth: 1, borderBottomColor: D.bg },
  logDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: D.border },
  logDotActive: { backgroundColor: D.success },
  logInfo: { flex: 1 },
  logTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logDevice: { fontSize: 13, fontWeight: '600', color: D.text },
  logMeta: { fontSize: 11, color: D.textMuted, marginTop: 2 },
  currentBadge: { backgroundColor: D.success + '18', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  currentBadgeText: { fontSize: 10, fontWeight: '700', color: D.success },
  logSignOut: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: D.error + '50' },
  logSignOutText: { fontSize: 11, fontWeight: '600', color: D.error },
  allSignOutBtn: { margin: 16, marginTop: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: D.error + '10', borderWidth: 1, borderColor: D.error + '30', alignItems: 'center' },
  allSignOutText: { fontSize: 13, fontWeight: '700', color: D.error },
  minorNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginLeft: 4 },
  minorNoticeText: { fontSize: 11, color: D.textMuted, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: D.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '75%' },
  modalHandle: { width: 40, height: 4, borderRadius: 9999, backgroundColor: D.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: D.text, marginBottom: 4 },
  modalSub: { fontSize: 12, color: D.textMuted, marginBottom: 16 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: D.bg },
  reasonRowActive: { backgroundColor: D.primaryGlow + '80' },
  reasonRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: D.border, alignItems: 'center', justifyContent: 'center' },
  reasonRadioActive: { borderColor: D.primary },
  reasonRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: D.primary },
  reasonText: { fontSize: 14, color: D.text },
  reasonTextActive: { fontWeight: '600', color: D.primary },
  reportBtn: { marginTop: 16, paddingVertical: 15, borderRadius: 14, backgroundColor: D.error, alignItems: 'center' },
  reportBtnOff: { backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border },
  reportBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  emptyReport: { fontSize: 13, color: D.textMuted, padding: 18, textAlign: 'center' },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
  reportRowBorder: { borderBottomWidth: 1, borderBottomColor: D.bg },
  reportTarget: { fontSize: 13, fontWeight: '600', color: D.text },
  reportDate: { fontSize: 11, color: D.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },

  doneOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  doneBox: { backgroundColor: D.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', gap: 10 },
  doneTitle: { fontSize: 18, fontWeight: '800', color: D.text, textAlign: 'center' },
  doneMsg: { fontSize: 13, color: D.textSec, textAlign: 'center', lineHeight: 20 },
  doneBtn: { marginTop: 6, width: '100%', paddingVertical: 13, borderRadius: 12, backgroundColor: D.primary, alignItems: 'center' },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
