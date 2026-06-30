import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGymApplicationStore } from '../store/gymApplicationStore';
import { COLORS } from '../utils/constants';

export default function GymApplyScreen() {
  const router = useRouter();
  const addApplication = useGymApplicationStore((s) => s.addApplication);
  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const bizOk = /^\d{3}-?\d{2}-?\d{5}$/.test(businessNumber.trim());

  // 익명 공개 폼이라 연타·실수 중복 제출 방지(같은 기기 60초 쿨다운). DB의 형식검증·중복차단과 2층 방어.
  const COOLDOWN_MS = 60_000;
  const LAST_KEY = 'flowin-gymapp-last';

  const submit = () => {
    setErr('');
    const missing = !gymName.trim() ? '헬스장명'
      : !ownerName.trim() ? '대표자명'
      : !businessNumber.trim() ? '사업자등록번호'
      : !phone.trim() ? '담당자 연락처'
      : !address.trim() ? '주소' : '';
    if (missing) { setErr(`${missing} 항목을 입력해주세요.`); return; }
    if (!bizOk) { setErr('사업자등록번호 형식이 올바르지 않습니다. (예: 123-45-67890)'); return; }
    const last = Number(globalThis.localStorage?.getItem(LAST_KEY) ?? 0);
    if (Date.now() - last < COOLDOWN_MS) { setErr('신청이 접수되었습니다. 잠시 후 다시 시도해주세요. (연속 제출 방지)'); return; }
    addApplication({ gymName: gymName.trim(), ownerName: ownerName.trim(), businessNumber: businessNumber.trim(), phone: phone.trim(), address: address.trim() });
    globalThis.localStorage?.setItem(LAST_KEY, String(Date.now()));
    setDone(true);
  };

  if (done) {
    return (
      <SafeAreaView style={s.c}>
        <View style={s.doneWrap}>
          <Text style={{ fontSize: 52 }}>🏢</Text>
          <Text style={s.doneTitle}>입점 신청이 접수되었습니다</Text>
          <Text style={s.doneSub}>운영팀이 사업자 정보를 확인 후{'\n'}영업일 2~3일 내 심사 결과를 안내드립니다.</Text>
          <View style={s.doneNote}>
            <MaterialCommunityIcons name="shield-check-outline" size={16} color={COLORS.primary} />
            <Text style={s.doneNoteText}>승인 시 헬스장 관리자 계정이 활성화됩니다.</Text>
          </View>
          <TouchableOpacity style={s.doneBtn} onPress={() => router.replace('/login' as any)}>
            <Text style={s.doneBtnText}>확인</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.c}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.replace('/login' as any)} style={s.back}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={s.title}>헬스장 입점 신청</Text>
        <View style={{ width: 36 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.banner}>
            <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.primary} />
            <Text style={s.bannerText}>헬스장은 사업자 확인 후 운영팀 승인을 거쳐 입점됩니다. 회원·트레이너 가입과 달리 즉시 이용이 불가합니다.</Text>
          </View>

          <Field label="헬스장명" value={gymName} onChange={setGymName} placeholder="예) 스트롱짐 강남점" />
          <Field label="대표자명" value={ownerName} onChange={setOwnerName} placeholder="예) 홍길동" />
          <Field label="사업자등록번호" value={businessNumber} onChange={setBusinessNumber} placeholder="123-45-67890" keyboard="numbers-and-punctuation" hint={businessNumber.trim() && !bizOk ? '형식: 123-45-67890 (숫자 3-2-5자리)' : undefined} />
          <Field label="담당자 연락처" value={phone} onChange={setPhone} placeholder="010-0000-0000" keyboard="phone-pad" />
          <Field label="주소" value={address} onChange={setAddress} placeholder="예) 서울 강남구 테헤란로 123" />

          {!!err && <Text style={s.err}>{err}</Text>}
          <TouchableOpacity style={s.submit} onPress={submit}>
            <Text style={s.submitText}>입점 신청하기</Text>
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, keyboard, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; keyboard?: any; hint?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={COLORS.textMuted} keyboardType={keyboard} />
      {!!hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },

  banner: { flexDirection: 'row', gap: 8, backgroundColor: COLORS.primary + '12', borderRadius: 12, padding: 14, marginBottom: 18 },
  bannerText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18, fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface },
  hint: { fontSize: 12, color: COLORS.error, fontWeight: '600', marginTop: 5 },
  err: { fontSize: 13, color: COLORS.error, fontWeight: '600', marginBottom: 8 },
  submit: { marginTop: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center' },
  submitText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  doneTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  doneSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },
  doneNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary + '12', borderRadius: 12, padding: 12, marginTop: 6 },
  doneNoteText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  doneBtn: { marginTop: 12, width: '100%', paddingVertical: 15, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
