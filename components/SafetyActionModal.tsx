import React, { useState, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, ScrollView, StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { useAuthStore } from '../store/authStore';
import { useBlockStore } from '../store/blockStore';
import { useRouter } from 'expo-router';

export type SafetyModalType = 'password' | 'delete' | 'blocklist' | null;

const TITLES: Record<string, string> = {
  password: '비밀번호 변경',
  delete: '계정 삭제',
  blocklist: '차단 목록 관리',
};

export default function SafetyActionModal({
  type, role, onClose,
}: { type: SafetyModalType; role: 'member' | 'trainer' | 'gym_admin'; onClose: () => void }) {
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [cf, setCf] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const logout = useAuthStore((st) => st.logout);
  // 현재 로그인 사용자 id (역할별 저장 위치가 달라 순서대로 찾는다)
  const myId = useAuthStore((st) => st.member?.id ?? st.trainer?.id ?? st.gymAdmin?.id ?? '');
  // ⚠️ 셀렉터 안에서 filter/map 하면 매번 새 배열을 반환해 무한 재렌더(React #185)가 난다.
  //    원본 배열을 그대로 구독하고 파생은 useMemo에서 한다.
  const allBlocks = useBlockStore((st) => st.blocks);
  const unblock = useBlockStore((st) => st.unblock);
  const myBlocks = useMemo(
    () => allBlocks.filter((b) => b.blockerId === myId),
    [allBlocks, myId],
  );

  const close = () => { setCur(''); setNw(''); setCf(''); setErr(''); setOk(''); onClose(); };

  // 계정 삭제 — auth 사용자 삭제는 service_role이 필요해 delete-account Edge Function을 거친다.
  const submitDelete = async () => {
    setErr(''); setOk('');
    if (cur.trim() !== '삭제') { setErr('«삭제»를 정확히 입력해주세요.'); return; }
    if (!isSupabaseConfigured) { setErr('데모 모드에서는 계정을 삭제할 수 없습니다.'); return; }

    setBusy(true);
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData?.session?.access_token;
      if (!token) { setErr('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.'); return; }

      const { data, error } = await supabase.functions.invoke('delete-account');
      if (error || !(data as any)?.ok) {
        setErr('계정 삭제에 실패했습니다. 잠시 후 다시 시도하거나 고객센터로 문의해주세요.');
        return;
      }

      setOk('계정이 삭제되었습니다.');
      // 세션 정리 후 로그인 화면으로
      logout();
      setTimeout(() => { onClose(); router.replace('/login' as any); }, 1200);
    } finally {
      setBusy(false);
    }
  };

  // 실제 Supabase 비밀번호 변경. 현재 비밀번호는 재인증(signInWithPassword)으로 검증한다.
  const submitPassword = async () => {
    setErr(''); setOk('');
    if (!cur || !nw || !cf) { setErr('모든 항목을 입력해주세요.'); return; }
    if (nw.length < 6) { setErr('새 비밀번호는 6자 이상이어야 합니다.'); return; }
    if (nw !== cf) { setErr('새 비밀번호가 일치하지 않습니다.'); return; }
    if (!isSupabaseConfigured) { setErr('데모 모드에서는 비밀번호를 변경할 수 없습니다.'); return; }

    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const email = sess?.user?.email;
      if (!email) { setErr('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.'); return; }

      // 현재 비밀번호 확인 (틀린 비밀번호로 변경되는 것을 막는다)
      const { error: reauthErr } = await supabase.auth.signInWithPassword({ email, password: cur });
      if (reauthErr) { setErr('현재 비밀번호가 올바르지 않습니다.'); return; }

      const { error: updErr } = await supabase.auth.updateUser({ password: nw });
      if (updErr) { setErr(updErr.message || '비밀번호 변경에 실패했습니다.'); return; }

      setOk('비밀번호가 변경되었습니다.');
      setCur(''); setNw(''); setCf('');
    } finally {
      setBusy(false);
    }
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
                <TouchableOpacity style={[s.primaryBtn, busy && { opacity: 0.6 }]} onPress={submitPassword} disabled={busy}>
                  <Text style={s.primaryBtnT}>{busy ? '변경 중…' : '변경하기'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {type === 'delete' && (
              <View>
                <Text style={s.body}>
                  계정을 삭제하면 프로필·채팅·후기·찜·운동기록이 즉시 삭제되며 복구할 수 없습니다.
                  {role === 'trainer' ? ' 진행 중인 수업이 있다면 먼저 정리해주세요.' : ''}
                </Text>
                <View style={s.warnBox}>
                  <MaterialCommunityIcons name="alert-outline" size={16} color={COLORS.error} />
                  <Text style={s.warnT}>
                    결제·계약 기록은 전자상거래법에 따라 5년간 보관되며, 개인 식별정보는 삭제됩니다.
                  </Text>
                </View>
                <Text style={s.fieldLabel}>확인을 위해 «삭제»를 입력해주세요</Text>
                <TextInput
                  style={s.input}
                  value={cur}
                  onChangeText={setCur}
                  placeholder="삭제"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                />
                {!!err && <Text style={s.err}>{err}</Text>}
                {!!ok && <Text style={s.okText}>✅ {ok}</Text>}
                {!ok && (
                  <TouchableOpacity
                    style={[s.primaryBtn, { backgroundColor: COLORS.error }, busy && { opacity: 0.6 }]}
                    onPress={submitDelete}
                    disabled={busy}
                  >
                    <Text style={s.primaryBtnT}>{busy ? '삭제 중…' : '계정 삭제'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {type === 'blocklist' && (
              myBlocks.length === 0 ? (
                <View style={s.empty}>
                  <MaterialCommunityIcons name="account-cancel-outline" size={42} color={COLORS.textMuted} />
                  <Text style={s.emptyT}>차단한 사용자가 없습니다</Text>
                  <Text style={s.emptySub}>프로필이나 게시글에서 차단하면 여기에 표시되고, 언제든 해제할 수 있어요.</Text>
                </View>
              ) : (
                <View>
                  {myBlocks.map((b) => (
                    <View key={b.blockedId} style={s.blockRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.blockName}>{b.blockedName || '알 수 없는 사용자'}</Text>
                        <Text style={s.blockDate}>{(b.createdAt || '').slice(0, 10)} 차단</Text>
                      </View>
                      <TouchableOpacity
                        style={s.unblockBtn}
                        onPress={() => unblock(myId, b.blockedId)}
                        accessibilityLabel={`${b.blockedName} 차단 해제`}
                      >
                        <Text style={s.unblockT}>차단 해제</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )
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

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  handle: { width: 40, height: 4, borderRadius: 9999, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 14 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, backgroundColor: '#F8FAFC' },

  body: { fontSize: 14, color: COLORS.text, lineHeight: 21 },
  warnBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.error + '12', borderRadius: 12, padding: 12, marginTop: 12 },
  warnT: { fontSize: 12, color: COLORS.error, flex: 1, fontWeight: '600' },

  blockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  blockName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  blockDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  unblockBtn: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: COLORS.border },
  unblockT: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },

  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyT: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },

  err: { fontSize: 12, color: COLORS.error, marginTop: 2, marginBottom: 4, fontWeight: '600' },
  okText: { fontSize: 13, color: '#10B981', marginTop: 6, fontWeight: '700', textAlign: 'center' },
  primaryBtn: { marginTop: 14, paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center' },
  primaryBtnT: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
