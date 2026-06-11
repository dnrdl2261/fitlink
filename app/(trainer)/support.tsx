import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, SafeAreaView, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
};

const FAQS = [
  { q: '회원이 예약을 취소했을 때 어떻게 처리되나요?', a: '회원의 취소 시점에 따라 환불 정책이 적용됩니다. 48시간 전 취소 시 회원 100% 환불, 24시간 이내 취소 시 트레이너에게 50%가 지급됩니다.' },
  { q: '수익 정산은 언제 이루어지나요?', a: '세션 완료 후 익일 기준으로 정산이 진행되며, 매월 말일에 등록된 계좌로 입금됩니다. 정산 내역은 매출 관리 탭에서 확인하실 수 있습니다.' },
  { q: '자격증 인증은 어떻게 하나요?', a: '내 프로필 > 자격증 관리에서 자격증 사진을 업로드하면 영업일 기준 2~3일 이내 검토 후 인증 완료됩니다.' },
  { q: '회원이 결제 후 연락이 없어요.', a: '예약 확정 후 회원에게 자동 알림이 발송됩니다. 채팅 기능을 통해 직접 연락하실 수 있으며, 무응답 시 고객지원에 문의해주세요.' },
  { q: '헬스장 슬롯 예약이 취소되었어요.', a: '헬스장 사정으로 슬롯이 취소된 경우, 즉시 환불 및 보상 포인트가 지급됩니다. 자주 발생하는 헬스장은 파트너 해제될 수 있습니다.' },
];

type Msg = { id: string; sender: 'user' | 'bot'; text: string; time: string };

const INIT_MSGS: Msg[] = [
  { id: 'b0', sender: 'bot', text: '안녕하세요! FLOWIN AI 도우미입니다.\n트레이너 관련 문의를 도와드리겠습니다.', time: '' },
];

const QUICK_QS = ['정산 문의', '예약 취소', '자격증 인증', '회원 문제', '기술 오류'];

const BOT_MAP: Record<string, string> = {
  '정산': '세션 완료 후 익일 기준 정산되며, 매월 말일 등록 계좌로 입금됩니다. 매출 관리 탭에서 내역 확인이 가능합니다.',
  '취소': '회원 취소 시 48시간 전은 전액 환불, 24시간 이내는 트레이너에게 50% 지급됩니다.',
  '자격': '내 프로필에서 자격증 사진을 업로드하면 2~3 영업일 이내 인증이 완료됩니다.',
  '회원': '회원과의 분쟁은 채팅 내역을 보관 후 고객지원 1:1 문의로 접수해주세요.',
  '오류': '앱 재시작 후에도 오류가 지속되면 고객지원 1:1 문의로 오류 화면 캡처와 함께 접수해주세요.',
};

function getBotReply(input: string) {
  const l = input.toLowerCase();
  for (const [k, v] of Object.entries(BOT_MAP)) {
    if (l.includes(k)) return v;
  }
  return '죄송합니다, 정확히 이해하지 못했어요. 아래 1:1 문의 버튼으로 상담원과 연결해드립니다.';
}

function nowHM() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function SupportScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'chat' | 'faq'>('chat');
  const [msgs, setMsgs] = useState<Msg[]>(INIT_MSGS);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { id: `u${Date.now()}`, sender: 'user', text: text.trim(), time: nowHM() };
    setMsgs(p => [...p, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setMsgs(p => [...p, { id: `b${Date.now()}`, sender: 'bot', text: getBotReply(text), time: nowHM() }]);
      setTyping(false);
    }, 1000);
  };

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [msgs, typing]);

  return (
    <SafeAreaView style={s.root}>

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.navigate('/(trainer)/more' as any)} style={s.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={D.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>고객지원</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.tabBar}>
        {(['chat', 'faq'] as const).map((t) => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnOn]} onPress={() => setTab(t)} activeOpacity={0.7}>
            <MaterialCommunityIcons name={t === 'chat' ? 'robot-outline' : 'frequently-asked-questions'} size={15} color={tab === t ? D.primary : D.textMuted} />
            <Text style={[s.tabTxt, tab === t && s.tabTxtOn]}>{t === 'chat' ? 'AI 챗봇' : '자주 묻는 질문'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'chat' && (
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.botBanner}>
            <View style={s.botAvatar}>
              <MaterialCommunityIcons name="robot-happy-outline" size={20} color="#fff" />
            </View>
            <View style={s.flex}>
              <Text style={s.botName}>FLOWIN AI 도우미</Text>
              <View style={s.onlineRow}>
                <View style={s.onlineDot} />
                <Text style={s.onlineTxt}>24시간 응답</Text>
              </View>
            </View>
            <TouchableOpacity style={s.agentBtn}>
              <MaterialCommunityIcons name="headset" size={14} color={D.primary} />
              <Text style={s.agentTxt}>상담원</Text>
            </TouchableOpacity>
          </View>

          <ScrollView ref={scrollRef} style={s.flex} contentContainerStyle={s.msgList} showsVerticalScrollIndicator={false}>
            {msgs.map((m) => (
              <View key={m.id} style={[s.bubbleRow, m.sender === 'user' && s.bubbleRowUser]}>
                {m.sender === 'bot' && (
                  <View style={s.botAvatarSm}>
                    <MaterialCommunityIcons name="robot-happy-outline" size={13} color="#fff" />
                  </View>
                )}
                <View style={s.bubbleCol}>
                  <View style={[s.bubble, m.sender === 'user' ? s.bubbleUser : s.bubbleBot]}>
                    <Text style={[s.bubbleTxt, m.sender === 'user' && s.bubbleTxtUser]}>{m.text}</Text>
                  </View>
                  {m.time ? <Text style={[s.bubbleTime, m.sender === 'user' && { textAlign: 'right' }]}>{m.time}</Text> : null}
                </View>
              </View>
            ))}
            {typing && (
              <View style={s.bubbleRow}>
                <View style={s.botAvatarSm}>
                  <MaterialCommunityIcons name="robot-happy-outline" size={13} color="#fff" />
                </View>
                <View style={[s.bubble, s.bubbleBot]}>
                  <Text style={{ color: D.textMuted, letterSpacing: 3 }}>● ● ●</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickScroll} contentContainerStyle={s.quickContent}>
            {QUICK_QS.map((q) => (
              <TouchableOpacity key={q} style={s.chip} onPress={() => send(q)} activeOpacity={0.7}>
                <Text style={s.chipTxt}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.inputBar}>
            <TextInput
              style={s.input}
              placeholder="무엇이 궁금하신가요?"
              value={input}
              onChangeText={setInput}
              placeholderTextColor={D.textMuted}
              returnKeyType="send"
              onSubmitEditing={() => send(input)}
            />
            <TouchableOpacity style={[s.sendBtn, !input.trim() && s.sendBtnOff]} onPress={() => send(input)} disabled={!input.trim()}>
              <MaterialCommunityIcons name="send" size={17} color={input.trim() ? '#fff' : D.textMuted} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {tab === 'faq' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.faqContent}>
          <TouchableOpacity style={s.inquiryBtn} activeOpacity={0.85}>
            <View style={s.inquiryInner}>
              <MaterialCommunityIcons name="message-text-outline" size={22} color="#fff" />
              <View>
                <Text style={s.inquiryTitle}>1:1 문의하기</Text>
                <Text style={s.inquirySub}>평균 응답 시간 2시간 이내</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={s.hoursRow}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={D.primary} />
            <Text style={s.hoursTxt}>평일 09:00 ~ 18:00 운영 (주말·공휴일 휴무)</Text>
          </View>

          <Text style={s.faqHeading}>자주 묻는 질문</Text>
          <View style={s.faqList}>
            {FAQS.map((faq, i) => (
              <TouchableOpacity key={i} style={[s.faqCard, openFaq === i && s.faqCardOn]} onPress={() => setOpenFaq(openFaq === i ? null : i)} activeOpacity={0.8}>
                <View style={s.faqQRow}>
                  <View style={s.qBadge}><Text style={s.qBadgeTxt}>Q</Text></View>
                  <Text style={[s.faqQTxt, openFaq === i && { color: D.primary }]}>{faq.q}</Text>
                  <MaterialCommunityIcons name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={18} color={D.textMuted} style={{ flexShrink: 0 }} />
                </View>
                {openFaq === i && (
                  <View style={s.faqARow}>
                    <View style={s.aBadge}><Text style={s.aBadgeTxt}>A</Text></View>
                    <Text style={s.faqATxt}>{faq.a}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: D.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: D.text },
  tabBar: { flexDirection: 'row', backgroundColor: D.surface, borderBottomWidth: 1, borderBottomColor: D.border },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnOn: { borderBottomColor: D.primary },
  tabTxt: { fontSize: 13, fontWeight: '600', color: D.textMuted },
  tabTxtOn: { color: D.primary },
  botBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: D.surface, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: D.border },
  botAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: D.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  botName: { fontSize: 13, fontWeight: '700', color: D.text },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: D.success },
  onlineTxt: { fontSize: 11, color: D.success, fontWeight: '500' },
  agentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0, backgroundColor: D.primaryGlow, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: D.primary + '30' },
  agentTxt: { fontSize: 12, fontWeight: '700', color: D.primary },
  msgList: { padding: 14, gap: 10, paddingBottom: 4 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  botAvatarSm: { width: 26, height: 26, borderRadius: 13, backgroundColor: D.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubbleCol: { maxWidth: '78%', gap: 3 },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleBot: { backgroundColor: D.surface, borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  bubbleUser: { backgroundColor: D.primary, borderBottomRightRadius: 4 },
  bubbleTxt: { fontSize: 13, color: D.text, lineHeight: 19 },
  bubbleTxtUser: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: D.textMuted, marginHorizontal: 2 },
  quickScroll: { flexGrow: 0, backgroundColor: D.surface, borderTopWidth: 1, borderTopColor: D.border },
  quickContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 7, flexDirection: 'row' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: D.primaryGlow, borderRadius: 16, borderWidth: 1, borderColor: D.primary + '30' },
  chipTxt: { fontSize: 12, fontWeight: '600', color: D.primary },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? 8 : 12, backgroundColor: D.surface, borderTopWidth: 1, borderTopColor: D.border },
  input: { flex: 1, height: 42, borderRadius: 21, backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border, paddingHorizontal: 14, fontSize: 13, color: D.text },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: D.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendBtnOff: { backgroundColor: D.bg, borderWidth: 1.5, borderColor: D.border },
  faqContent: { padding: 14, gap: 10 },
  inquiryBtn: { backgroundColor: D.primary, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, shadowColor: D.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 5 },
  inquiryInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  inquiryTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  inquirySub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: D.primaryGlow, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: D.primary + '25' },
  hoursTxt: { fontSize: 12, color: D.primary, flex: 1 },
  faqHeading: { fontSize: 15, fontWeight: '800', color: D.text, marginTop: 4 },
  faqList: { gap: 8 },
  faqCard: { backgroundColor: D.surface, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, borderWidth: 1.5, borderColor: 'transparent' },
  faqCardOn: { borderColor: D.primary + '40' },
  faqQRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 14, paddingVertical: 13 },
  qBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: D.primaryGlow, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  qBadgeTxt: { fontSize: 11, fontWeight: '800', color: D.primary },
  faqQTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: D.text, lineHeight: 19 },
  faqARow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 14, paddingBottom: 13, paddingTop: 2 },
  aBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: D.success + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  aBadgeTxt: { fontSize: 11, fontWeight: '800', color: D.success },
  faqATxt: { flex: 1, fontSize: 12, color: D.textSec, lineHeight: 18 },
});
