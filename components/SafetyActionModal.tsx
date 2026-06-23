import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, ScrollView, StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

export type SafetyModalType = 'password' | 'privacy' | 'delete' | 'blocklist' | 'minor' | null;

const TITLES: Record<string, string> = {
  password: '비밀번호 변경',
  privacy: '개인정보 공개 설정',
  delete: '개인정보 삭제 요청',
  blocklist: '차단 목록 관리',
  minor: '미성년자 보호',
};

export default function SafetyActionModal({
  type, role, onClose,
}: { type: SafetyModalType; role: 'member' | 'trainer'; onClose: () => void }) {
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [cf, setCf] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [priv, setPriv] = useState({ profile: true, contact: false, activity: true });

  const close = () => { setCur(''); setNw(''); setCf(''); setErr(''); setOk(''); onClose(); };

  const submitPassword = () => {
    setErr(''); setOk('');
    if (!cur || !nw || !cf) { setErr('모든 항목을 입력해주세요.'); return; }
    if (nw.length < 4) { setErr('새 비밀번호는 4자 이상이어야 합니다.'); return; }
    if (nw !== cf) { setErr('새 비밀번호가 일치하지 않습니다.'); return; }
    setOk('비밀번호가 변경되었습니다.');
    setCur(''); setNw(''); setCf('');
  };

  return (
    <Modal visible={type !== null} transparent animationType="slide" onRequestClose={close}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={close}>
        <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.title}>{type ? TITLES[type] : ''}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>

            {type === 'password' && (
              <View>
                <Field label="현재 비밀번호" value={cur} onChange={setCur} />
                <Field label="새 비밀번호" value={nw} onChange={setNw} />
                <Field label="새 비밀번호 확인" value={cf} onChange={setCf} />
                {!!err && <Text style={s.err}>{err}</Text>}
                {!!ok && <Text style={s.okText}>✅ {ok}</Text>}
                <TouchableOpacity style={s.primaryBtn} onPress={submitPassword}>
                  <Text style={s.primaryBtnT}>변경하기</Text>
                </TouchableOpacity>
              </View>
            )}

            {type === 'privacy' && (
              <View>
                <Row label="프로필 공개" sub="다른 사용자에게 프로필 노출" on={priv.profile} onToggle={() => { setOk(''); setPriv((p) => ({ ...p, profile: !p.profile })); }} />
                <Row label="연락처 공개" sub="전화번호·이메일 공개" on={priv.contact} onToggle={() => { setOk(''); setPriv((p) => ({ ...p, contact: !p.contact })); }} />
                <Row label="활동 내역 공개" sub="후기·커뮤니티 활동 공개" on={priv.activity} onToggle={() => { setOk(''); setPriv((p) => ({ ...p, activity: !p.activity })); }} />
                {!!ok && <Text style={s.okText}>✅ {ok}</Text>}
                <TouchableOpacity style={s.primaryBtn} onPress={() => setOk('공개 설정이 저장되었습니다.')}>
                  <Text style={s.primaryBtnT}>저장</Text>
                </TouchableOpacity>
              </View>
            )}

            {type === 'delete' && (
              <View>
                <Text style={s.body}>계정과 모든 활동 데이터(예약·후기·메시지 등)의 삭제를 요청합니다. 처리 후에는 복구할 수 없습니다.</Text>
                <View style={s.warnBox}>
                  <MaterialCommunityIcons name="alert-outline" size={16} color={COLORS.error} />
                  <Text style={s.warnT}>요청 접수 후 영업일 3일 이내 처리됩니다.</Text>
                </View>
                {ok ? (
                  <Text style={s.okText}>✅ {ok}</Text>
                ) : (
                  <TouchableOpacity style={[s.primaryBtn, { backgroundColor: COLORS.error }]} onPress={() => setOk('삭제 요청이 접수되었습니다.')}>
                    <Text style={s.primaryBtnT}>삭제 요청</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {type === 'blocklist' && (
              <View style={s.empty}>
                <MaterialCommunityIcons name="account-cancel-outline" size={42} color={COLORS.textMuted} />
                <Text style={s.emptyT}>차단한 사용자가 없습니다</Text>
                <Text style={s.emptySub}>프로필이나 게시글에서 차단하면 여기에 표시되고, 언제든 해제할 수 있어요.</Text>
              </View>
            )}

            {type === 'minor' && (
              <View>
                <Text style={s.body}>
                  {role === 'trainer'
                    ? '만 14세 미만 회원 수업 시 보호자 동의서가 필요합니다. 미성년 회원은 보호자 연락처가 등록되어야 예약이 승인됩니다.'
                    : '만 14세 미만은 보호자 동의 후 서비스 이용이 가능합니다. 보호자 동의는 가입 시 등록한 보호자 연락처로 확인됩니다.'}
                </Text>
                <View style={s.infoBox}>
                  <MaterialCommunityIcons name="shield-account-outline" size={16} color={COLORS.primary} />
                  <Text style={s.infoT}>현재 계정은 성인 인증이 완료된 상태입니다.</Text>
                </View>
              </View>
            )}

            <View style={{ height: 8 }} />
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        secureTextEntry
        placeholder="••••"
        placeholderTextColor={COLORS.textMuted}
      />
    </View>
  );
}

function Row({ label, sub, on, onToggle }: { label: string; sub: string; on: boolean; onToggle: () => void }) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      <TouchableOpacity style={[s.tg, on && s.tgOn]} onPress={onToggle} activeOpacity={0.8}>
        <View style={[s.tgThumb, on && s.tgThumbOn]} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  handle: { width: 40, height: 4, borderRadius: 9999, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 14 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, backgroundColor: '#F8FAFC' },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  tg: { width: 48, height: 28, borderRadius: 14, backgroundColor: COLORS.border, padding: 2, justifyContent: 'center' },
  tgOn: { backgroundColor: '#10B981' },
  tgThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignSelf: 'flex-start' },
  tgThumbOn: { alignSelf: 'flex-end' },

  body: { fontSize: 14, color: COLORS.text, lineHeight: 21 },
  warnBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.error + '12', borderRadius: 12, padding: 12, marginTop: 12 },
  warnT: { fontSize: 12, color: COLORS.error, flex: 1, fontWeight: '600' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary + '12', borderRadius: 12, padding: 12, marginTop: 12 },
  infoT: { fontSize: 12, color: COLORS.primary, flex: 1, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyT: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },

  err: { fontSize: 12, color: COLORS.error, marginTop: 2, marginBottom: 4, fontWeight: '600' },
  okText: { fontSize: 13, color: '#10B981', marginTop: 6, fontWeight: '700', textAlign: 'center' },
  primaryBtn: { marginTop: 14, paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center' },
  primaryBtnT: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
