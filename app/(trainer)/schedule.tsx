import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { useBookingStore } from '../../store/bookingStore';
import { useGymSlotStore } from '../../store/gymSlotStore';
import { useAuthStore } from '../../store/authStore';
import { useManualSessionStore } from '../../store/manualSessionStore';
import { formatTime, formatDate } from '../../utils/formatters';

/* ─── 라이트 팔레트 ─── */
const D = {
  bg:       '#F1F5F9',
  surface:  '#FFFFFF',
  surface2: '#F8FAFC',
  primary:  '#4F63F5',
  text:     '#0F172A',
  textSec:  '#64748B',
  textMuted:'#94A3B8',
  border:   '#E2E8F0',
  success:  '#22C55E',
  error:    '#EF4444',
  amber:    '#F59E0B',
};

/* ─── 상수 ─── */
const DOW        = ['일','월','화','수','목','금','토'];
const HOUR_START = 6;
const HOUR_END   = 22;
const HOUR_COUNT = HOUR_END - HOUR_START;
const ROW_H      = 56;
const TIME_W     = 48;

const TIME_SLOTS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2,'0')}:00`);
  if (h < 22) TIME_SLOTS.push(`${String(h).padStart(2,'0')}:30`);
}

const COLOR_OPTS = ['#4F63F5','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#EC4899'];

const STATUS_META: Record<string,{ label:string; color:string }> = {
  scheduled: { label:'예정', color:'#5C6AF5' },
  completed: { label:'완료', color:'#22C55E' },
  cancelled: { label:'취소', color:'#EF4444' },
};

/* ─── 타입 ─── */
interface DisplaySession {
  id: string; date: string; startTime: string; endTime: string;
  memberName: string; price: number; memo: string;
  status: 'scheduled'|'completed'|'cancelled';
  color: string; isManual: boolean; bookingId?: string;
  type?: 'pt' | 'consultation';
  isSlot?: boolean; // 헬스장 시설 슬롯 예약
}

/* ─── 헬퍼 ─── */
const f2 = (n: number) => String(n).padStart(2,'0');
const toStr = (d: Date) => `${d.getFullYear()}-${f2(d.getMonth()+1)}-${f2(d.getDate())}`;
const uid   = () => `m_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

function buildCal(year: number, month: number): (string|null)[] {
  const first = new Date(year, month-1, 1).getDay();
  const days  = new Date(year, month, 0).getDate();
  const cells: (string|null)[] = Array(first).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${f2(month)}-${f2(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function weekOf(anchor: string): string[] {
  const d = new Date(anchor), sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay());
  return Array.from({length:7},(_,i)=>{ const x=new Date(sun); x.setDate(sun.getDate()+i); return toStr(x); });
}
const tOff = (t: string) => { const [h,m]=t.split(':').map(Number); return ((h-HOUR_START)+m/60)*ROW_H; };
const tH   = (s: string, e: string) => {
  const [sh,sm]=s.split(':').map(Number), [eh,em]=e.split(':').map(Number);
  return Math.max(((eh*60+em)-(sh*60+sm))/60*ROW_H, 28);
};
const add30 = (t: string) => { const [h,m]=t.split(':').map(Number); const tot=h*60+m+30; return `${f2(Math.floor(tot/60))}:${f2(tot%60)}`; };

/* ─── 시간선 (다크) ─── */
function HourLines() {
  return <>
    {Array.from({length:HOUR_COUNT+1},(_,i)=>(
      <View key={i} style={[g.hLine,{top:i*ROW_H}]}>
        <Text style={g.hLbl}>{f2(HOUR_START+i)}:00</Text>
        <View style={g.hRule}/>
      </View>
    ))}
  </>;
}

/* ══════════════════════════════════════════════
   메인
══════════════════════════════════════════════ */
export default function TrainerScheduleScreen() {
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const [view, setView]   = useState<'month'|'week'|'day'>('day');
  const [year, setYear]   = useState(+today.slice(0,4));
  const [month, setMonth] = useState(+today.slice(5,7));
  const [sel, setSel]     = useState(today);

  const { manualSessions, hiddenIds, addManual, completeManual, removeManual, hideSession } = useManualSessionStore();

  const [showAdd, setShowAdd]     = useState(false);
  const [addMember, setAddMember] = useState('');
  const [addStart, setAddStart]   = useState('09:00');
  const [addEnd, setAddEnd]       = useState('10:00');
  const [addColor, setAddColor]   = useState(COLOR_OPTS[0]);
  const [addMemo, setAddMemo]     = useState('');

  const { bookings, completeSession } = useBookingStore();
  const slotBookings = useGymSlotStore((s) => s.slotBookings);
  const { trainer } = useAuthStore();
  const tid = trainer?.id ?? 'trainer_001';

  const tBooks = useMemo(
    () => bookings.filter(b => b.trainerId===tid && b.status!=='cancelled'),
    [bookings, tid]
  );

  const colorMap = useMemo(() => {
    const sorted = [...tBooks].sort((a,b)=>a.id.localeCompare(b.id));
    return new Map(sorted.map((b,i)=>[b.id, COLOR_OPTS[i%COLOR_OPTS.length]]));
  }, [tBooks]);

  const bookingDS = useMemo<DisplaySession[]>(() => {
    const r: DisplaySession[] = [];
    tBooks.forEach(b => b.sessions.forEach(sess => {
      if (sess.status!=='cancelled' && !hiddenIds.includes(sess.id)) r.push({
        id: sess.id, date: sess.date,
        startTime: sess.startTime, endTime: sess.endTime,
        memberName: b.memberName, price: Math.round(b.totalAmount/b.totalSessions),
        memo: '', status: sess.status as any,
        color: colorMap.get(b.id)??COLOR_OPTS[0],
        isManual: false, bookingId: b.id, type: b.type,
      });
    }));
    return r;
  }, [tBooks, colorMap, hiddenIds]);

  const manualDS = useMemo<DisplaySession[]>(() =>
    manualSessions.filter(m=>m.status!=='cancelled').map(m=>({
      id:m.id, date:m.date, startTime:m.startTime, endTime:m.endTime,
      memberName:m.memberName, price:0, memo:m.memo, status:m.status,
      color:m.color, isManual:true,
    })),
    [manualSessions]
  );

  // 헬스장 시설 슬롯 예약 (내가 예약한 것)
  const slotDS = useMemo<DisplaySession[]>(() =>
    slotBookings.filter(s=>s.trainerId===tid && s.status!=='cancelled').map(s=>({
      id:s.id, date:s.date, startTime:s.startTime, endTime:add30(s.startTime),
      memberName:s.memberName ?? '회원', price:s.facilityFee, memo:`${s.gymName} 시설 이용`,
      status:'scheduled' as const, color:'#0EA5E9', isManual:false, isSlot:true,
    })),
    [slotBookings, tid]
  );

  const allDS = useMemo(()=>[...bookingDS,...manualDS,...slotDS],[bookingDS,manualDS,slotDS]);


  const dayS = useMemo(()=>
    allDS.filter(x=>x.date===sel).sort((a,b)=>a.startTime.localeCompare(b.startTime)),
    [allDS,sel]
  );

  const cal   = useMemo(()=>buildCal(year,month),[year,month]);
  const wDays = useMemo(()=>weekOf(sel),[sel]);
  const wMap  = useMemo(()=>{
    const m=new Map<string,DisplaySession[]>();
    wDays.forEach(d=>m.set(d,[]));
    allDS.forEach(x=>{ if(m.has(x.date)) m.get(x.date)!.push(x); });
    return m;
  },[allDS,wDays]);

  /* nav */
  const prevM=()=>{ if(month===1){setYear(y=>y-1);setMonth(12);}else setMonth(m=>m-1); };
  const nextM=()=>{ if(month===12){setYear(y=>y+1);setMonth(1);}else setMonth(m=>m+1); };
  const prevW=()=>{ const d=new Date(sel);d.setDate(d.getDate()-7);setSel(toStr(d)); };
  const nextW=()=>{ const d=new Date(sel);d.setDate(d.getDate()+7);setSel(toStr(d)); };
  const prevD=()=>{ const d=new Date(sel);d.setDate(d.getDate()-1);setSel(toStr(d)); };
  const nextD=()=>{ const d=new Date(sel);d.setDate(d.getDate()+1);setSel(toStr(d)); };

  /* 추가 */
  const handleAdd = () => {
    if (!addMember.trim()) { Alert.alert('입력 오류','회원 이름을 입력해주세요.'); return; }
    if (addStart >= addEnd) { Alert.alert('입력 오류','종료 시간은 시작 시간 이후여야 합니다.'); return; }
    addManual({
      id:uid(), date:sel, startTime:addStart, endTime:addEnd,
      memberName:addMember.trim(), memo:addMemo, status:'scheduled', color:addColor,
    });
    setShowAdd(false);
    setAddMember(''); setAddMemo(''); setAddStart('09:00'); setAddEnd('10:00'); setAddColor(COLOR_OPTS[0]);
  };

  const handleComplete = (sess: DisplaySession) => {
    if (sess.isManual) completeManual(sess.id);
    else if (sess.bookingId) completeSession(sess.bookingId, sess.id);
  };

  const handleDelete = (sess: DisplaySession) => {
    Alert.alert('일정 삭제',`${sess.memberName} 회원의 ${formatTime(sess.startTime)} 일정을 삭제하시겠습니까?`,[
      { text:'취소', style:'cancel' },
      { text:'삭제', style:'destructive', onPress:()=>{
        if (sess.isManual) removeManual(sess.id);
        else hideSession(sess.id);
      }},
    ]);
  };

  const totalSched = allDS.filter(x=>x.status==='scheduled').length;
  const todaySched = allDS.filter(x=>x.date===today&&x.status==='scheduled').length;

  /* ─────────────────────────── RENDER ─────────────────────────── */
  return (
    <SafeAreaView style={s.root}>

      {/* 상단 통계 바 */}
      <View style={s.statsBar}>
        <View style={s.statItem}>
          <Text style={s.statV}>{totalSched}</Text>
          <Text style={s.statL}>남은 세션</Text>
        </View>
        <View style={s.statDiv}/>
        <View style={s.statItem}>
          <Text style={s.statV}>{todaySched}</Text>
          <Text style={s.statL}>오늘 세션</Text>
        </View>
        <View style={s.statDiv}/>
        <View style={s.statItem}>
          <Text style={s.statV}>{tBooks.length + manualSessions.filter(m=>m.status!=='cancelled').length}</Text>
          <Text style={s.statL}>활성 일정</Text>
        </View>
      </View>

      {/* 뷰 토글 */}
      <View style={s.toggle}>
        {(['day','week','month'] as const).map(mode=>(
          <TouchableOpacity key={mode} style={[s.tBtn, view===mode&&s.tBtnOn]} onPress={()=>setView(mode)}>
            <MaterialCommunityIcons
              name={mode==='month'?'calendar-month':mode==='week'?'calendar-week':'calendar-today'}
              size={15} color={view===mode?D.primary:D.textSec}
            />
            <Text style={[s.tTxt, view===mode&&s.tTxtOn]}>
              {mode==='month'?'월간':mode==='week'?'주간':'일간'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} style={{flex:1}}>

        {/* ════════ 월간 뷰 ════════ */}
        {view==='month' && (
          <View style={s.card}>
            {/* 월 네비게이션 */}
            <View style={s.navRow}>
              <TouchableOpacity style={s.navBtn} onPress={prevM}>
                <Text style={s.navArr}>‹</Text>
              </TouchableOpacity>
              <View style={{alignItems:'center'}}>
                <Text style={s.navTitle}>{year}년 {month}월</Text>
              </View>
              <TouchableOpacity style={s.navBtn} onPress={nextM}>
                <Text style={s.navArr}>›</Text>
              </TouchableOpacity>
            </View>

            {/* 요일 헤더 */}
            <View style={s.dowRow}>
              {DOW.map((d,i)=>(
                <Text key={d} style={[
                  s.dowLbl,
                  i===0 && {color:'#F87171'},
                  i===6 && {color:'#93C5FD'},
                ]}>{d}</Text>
              ))}
            </View>

            {/* 날짜 그리드 */}
            <View style={s.grid}>
              {cal.map((dt,idx)=>{
                if (!dt) return <View key={`_${idx}`} style={s.cell}/>;
                const d=+dt.slice(8), dow=new Date(dt).getDay();
                const isSel=sel===dt, isToday=today===dt;
                const colors=[...new Set(allDS.filter(x=>x.date===dt&&x.status==='scheduled').map(x=>x.color))].slice(0,3);
                const hasSess = colors.length > 0;
                return (
                  <TouchableOpacity key={dt}
                    style={[s.cell, isToday&&!isSel&&s.cellToday, isSel&&s.cellSel]}
                    onPress={()=>setSel(dt)} activeOpacity={0.7}
                  >
                    <Text style={[
                      s.cellN,
                      isSel&&s.cellNSel,
                      !isSel&&dow===0&&{color:'#F87171'},
                      !isSel&&dow===6&&{color:'#93C5FD'},
                      !isSel&&!isToday&&dow!==0&&dow!==6&&{color:D.textSec},
                    ]}>{d}</Text>
                    {hasSess ? (
                      <View style={s.dotRow}>
                        {colors.map((c,ci)=>(
                          <View key={ci} style={[s.miniDot,{backgroundColor:isSel?'rgba(255,255,255,0.9)':c}]}/>
                        ))}
                      </View>
                    ) : <View style={s.dotPh}/>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 오늘 이동 버튼 */}
            <TouchableOpacity style={s.todayBtn} onPress={()=>{ setSel(today); setYear(+today.slice(0,4)); setMonth(+today.slice(5,7)); }} activeOpacity={0.8}>
              <MaterialCommunityIcons name="calendar-today" size={14} color="#fff"/>
              <Text style={s.todayBtnT}>오늘 진행 일정 보기</Text>
              <MaterialCommunityIcons name="chevron-right" size={15} color="#fff"/>
            </TouchableOpacity>
          </View>
        )}

        {/* ════════ 주간 뷰 ════════ */}
        {view==='week' && (
          <View style={s.card}>
            <View style={s.navRow}>
              <TouchableOpacity style={s.navBtn} onPress={prevW}>
                <Text style={s.navArr}>‹</Text>
              </TouchableOpacity>
              <Text style={s.navTitle}>
                {wDays[0].slice(5).replace('-','/')} ~ {wDays[6].slice(5).replace('-','/')}
              </Text>
              <TouchableOpacity style={s.navBtn} onPress={nextW}>
                <Text style={s.navArr}>›</Text>
              </TouchableOpacity>
            </View>

            {/* 주간 그리드 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* 헤더 행 */}
                <View style={s.wgHeaderRow}>
                  <View style={s.wgTimeCell}/>
                  {wDays.map((d,i)=>{
                    const isTod=d===today, isSel=d===sel;
                    return (
                      <TouchableOpacity key={d}
                        style={[s.wgDayHeader, (isTod||isSel)&&{backgroundColor:D.primary+'18'}]}
                        onPress={()=>setSel(d)} activeOpacity={0.7}
                      >
                        <Text style={[
                          s.wgDayDate,
                          i===0&&{color:'#F87171'}, i===6&&{color:'#93C5FD'},
                          isTod&&{color:D.primary},
                        ]}>{d.slice(5).replace('-','/')}</Text>
                        <Text style={[
                          s.wgDayDow,
                          i===0&&{color:'#F87171'}, i===6&&{color:'#93C5FD'},
                          isTod&&{color:D.primary,fontWeight:'800'},
                        ]}>{DOW[i]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 시간 행 */}
                {Array.from({length:HOUR_END-HOUR_START+1},(_,i)=>HOUR_START+i).map(hour=>(
                  <View key={hour} style={[s.wgRow, hour%2===0&&{backgroundColor:D.surface2}]}>
                    <View style={s.wgTimeCell}>
                      <Text style={s.wgTimeLbl}>{String(hour).padStart(2,'0')}:00</Text>
                    </View>
                    {wDays.map(d=>{
                      const matched=(wMap.get(d)??[]).filter(x=>parseInt(x.startTime.split(':')[0])===hour);
                      const sess=matched[0], extra=matched.length-1;
                      return (
                        <TouchableOpacity key={d}
                          style={[s.wgCell, sess&&{backgroundColor:sess.color+'28',borderLeftColor:sess.color,borderLeftWidth:3}]}
                          onPress={()=>sess&&setSel(d)} activeOpacity={0.7}
                        >
                          {sess&&(
                            <>
                              <Text style={[s.wgCellName,{color:sess.color}]} numberOfLines={1}>{sess.memberName}</Text>
                              {extra>0&&<Text style={s.wgCellExtra}>+{extra}</Text>}
                            </>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ════════ 일간 뷰 ════════ */}
        {view==='day' && (
          <View style={s.card}>
            <View style={s.navRow}>
              <TouchableOpacity style={s.navBtn} onPress={prevD}>
                <Text style={s.navArr}>‹</Text>
              </TouchableOpacity>
              <View style={{alignItems:'center'}}>
                <Text style={s.navTitle}>{formatDate(sel)}</Text>
                <Text style={s.navSub}>({DOW[new Date(sel).getDay()]}요일)</Text>
              </View>
              <TouchableOpacity style={s.navBtn} onPress={nextD}>
                <Text style={s.navArr}>›</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={s.timeGrid}
              contentContainerStyle={{height:HOUR_COUNT*ROW_H+20}}
            >
              <HourLines/>
              {dayS.map(sess=>{
                const top=tOff(sess.startTime), h=tH(sess.startTime,sess.endTime);
                const done=sess.status==='completed';
                if (top<0||top>HOUR_COUNT*ROW_H) return null;
                return (
                  <View key={sess.id} style={[s.dayBlock,{
                    top:top+10, height:h-2, left:TIME_W+6, right:6,
                    backgroundColor:sess.color+'28',
                    borderLeftColor:sess.color,
                    opacity:done?0.6:1,
                  }]}>
                    <View style={s.dayBlockTop}>
                      <Text style={[s.dayBTime,{color:sess.color}]} numberOfLines={1}>
                        {formatTime(sess.startTime)} ~ {formatTime(sess.endTime)}
                      </Text>
                      <View style={[s.statusChip,{backgroundColor:STATUS_META[sess.status].color+'22'}]}>
                        <Text style={[s.statusTxt,{color:STATUS_META[sess.status].color}]}>
                          {STATUS_META[sess.status].label}
                        </Text>
                      </View>
                    </View>
                    {h>40&&<Text style={s.dayBName} numberOfLines={1}>{sess.memberName} 회원</Text>}
                    {h>60&&sess.price>0&&<Text style={s.dayBPrice}>₩{sess.price.toLocaleString()}</Text>}
                    {h>78&&sess.memo?<Text style={s.dayBMemo} numberOfLines={1}>{sess.memo}</Text>:null}
                  </View>
                );
              })}
              {dayS.length===0&&(
                <View style={s.dayEmpty}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={36} color={D.textMuted}/>
                  <Text style={s.emptyTxt}>일정이 없습니다</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* ════════ 선택 날짜 세션 목록 ════════ */}
        <View style={s.card}>
          <View style={s.listHead}>
            <View>
              <Text style={s.listDate}>{formatDate(sel)}</Text>
              <Text style={s.listSub}>{DOW[new Date(sel).getDay()]}요일</Text>
            </View>
            <View style={s.cntBadge}>
              <Text style={s.cntTxt}>{dayS.length}개 세션</Text>
            </View>
          </View>

          {dayS.length===0 ? (
            <View style={s.emptyBox}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={36} color={D.textMuted}/>
              <Text style={s.emptyTxt}>예약된 세션이 없습니다</Text>
              <Text style={s.emptyHint}>오른쪽 하단 + 버튼으로 일정을 추가하세요</Text>
            </View>
          ) : dayS.map((sess,idx)=>{
            const done=sess.status==='completed';
            const sm=STATUS_META[sess.status];
            return (
              <View key={sess.id} style={[s.row, idx<dayS.length-1&&s.rowBorder]}>
                <View style={[s.rowBar,{backgroundColor:sess.color,opacity:done?0.4:1}]}/>
                <View style={{flex:1}}>
                  <View style={s.rowTop}>
                    <Text style={[s.rowTime, done&&s.lineThr]}>
                      {formatTime(sess.startTime)} ~ {formatTime(sess.endTime)}
                    </Text>
                    <View style={[s.statusChip,{backgroundColor:sm.color+'20',borderColor:sm.color+'40',borderWidth:1}]}>
                      <View style={[s.statusDot,{backgroundColor:sm.color}]}/>
                      <Text style={[s.statusTxt,{color:sm.color}]}>{sm.label}</Text>
                    </View>
                  </View>
                  <View style={s.rowBot}>
                    <Text style={[s.rowName, done&&s.lineThr]}>{sess.memberName} 회원</Text>
                    {sess.isSlot
                      ? <View style={s.slotBadge}><Text style={s.slotBadgeText}>시설 이용</Text></View>
                      : sess.type==='consultation'
                      ? <View style={s.consultBadge}><Text style={s.consultBadgeText}>무료상담</Text></View>
                      : sess.price>0&&<Text style={[s.rowPrice,{color:sess.color}]}>₩{sess.price.toLocaleString()}</Text>
                    }
                  </View>
                  {sess.memo?<Text style={s.rowMemo} numberOfLines={1}>{sess.memo}</Text>:null}
                </View>
                <View style={s.rowActions}>
                  {sess.status==='scheduled'&&(
                    <TouchableOpacity style={s.actBtn} onPress={()=>handleComplete(sess)} activeOpacity={0.7}>
                      <MaterialCommunityIcons name="check-circle-outline" size={22} color={D.success}/>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.actBtn} onPress={()=>handleDelete(sess)} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="trash-can-outline" size={22} color={D.error}/>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{height:100}}/>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={()=>setShowAdd(true)} activeOpacity={0.85}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff"/>
      </TouchableOpacity>

      {/* ─── 일정 추가 모달 ─── */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={()=>setShowAdd(false)}>
        <TouchableOpacity style={s.overlay} onPress={()=>setShowAdd(false)} activeOpacity={1}>
          <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{width:'100%'}}>
            <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={()=>{}}>

              <View style={s.sheetHandle}/>

              <View style={s.sheetHead}>
                <Text style={s.sheetTitle}>일정 추가</Text>
                <TouchableOpacity onPress={()=>setShowAdd(false)} style={{padding:4}}>
                  <MaterialCommunityIcons name="close" size={22} color={D.textSec}/>
                </TouchableOpacity>
              </View>

              {/* 날짜 */}
              <View style={s.fRow}>
                <MaterialCommunityIcons name="calendar" size={18} color={D.primary} style={s.fIco}/>
                <View>
                  <Text style={s.fLbl}>날짜</Text>
                  <Text style={s.fVal}>{formatDate(sel)} ({DOW[new Date(sel).getDay()]}요일)</Text>
                </View>
              </View>

              {/* 회원 이름 */}
              <View style={s.fRow}>
                <MaterialCommunityIcons name="account-outline" size={18} color={D.primary} style={s.fIco}/>
                <View style={{flex:1}}>
                  <Text style={s.fLbl}>회원 이름</Text>
                  <TextInput
                    style={s.fInput} value={addMember} onChangeText={setAddMember}
                    placeholder="이름을 입력하세요" placeholderTextColor={D.textMuted}
                  />
                </View>
              </View>

              {/* 시작 시간 */}
              <View style={s.fCol}>
                <View style={s.fRowLbl}>
                  <MaterialCommunityIcons name="clock-start" size={18} color={D.primary} style={s.fIco}/>
                  <Text style={s.fLbl}>시작 시간</Text>
                  <Text style={s.fValSm}>{addStart}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.timeScroll}>
                  {TIME_SLOTS.map(t=>(
                    <TouchableOpacity key={`s${t}`} style={[s.tChip,addStart===t&&s.tChipOn]} onPress={()=>setAddStart(t)}>
                      <Text style={[s.tChipT,addStart===t&&s.tChipTOn]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 종료 시간 */}
              <View style={s.fCol}>
                <View style={s.fRowLbl}>
                  <MaterialCommunityIcons name="clock-end" size={18} color={D.primary} style={s.fIco}/>
                  <Text style={s.fLbl}>종료 시간</Text>
                  <Text style={s.fValSm}>{addEnd}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.timeScroll}>
                  {TIME_SLOTS.map(t=>(
                    <TouchableOpacity key={`e${t}`} style={[s.tChip,addEnd===t&&s.tChipOn]} onPress={()=>setAddEnd(t)}>
                      <Text style={[s.tChipT,addEnd===t&&s.tChipTOn]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 색상 */}
              <View style={s.fRow}>
                <MaterialCommunityIcons name="palette-outline" size={18} color={D.primary} style={s.fIco}/>
                <View>
                  <Text style={s.fLbl}>색상</Text>
                  <View style={s.colorRow}>
                    {COLOR_OPTS.map(c=>(
                      <TouchableOpacity key={c}
                        style={[s.colorDot,{backgroundColor:c},addColor===c&&s.colorDotOn]}
                        onPress={()=>setAddColor(c)}
                      >
                        {addColor===c&&<MaterialCommunityIcons name="check" size={13} color="#fff"/>}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* 메모 */}
              <View style={s.fRow}>
                <MaterialCommunityIcons name="note-outline" size={18} color={D.primary} style={s.fIco}/>
                <View style={{flex:1}}>
                  <Text style={s.fLbl}>메모 (선택)</Text>
                  <TextInput
                    style={s.fInput} value={addMemo} onChangeText={setAddMemo}
                    placeholder="메모를 입력하세요" placeholderTextColor={D.textMuted}
                  />
                </View>
              </View>

              <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.85}>
                <MaterialCommunityIcons name="calendar-plus" size={18} color="#fff"/>
                <Text style={s.addBtnT}>일정 추가</Text>
              </TouchableOpacity>

            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

/* ─── 스타일 ─── */
const s = StyleSheet.create({
  root: { flex:1, backgroundColor:D.bg },

  /* 통계 바 */
  statsBar: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-around',
    backgroundColor:D.surface, paddingVertical:14, paddingHorizontal:20,
    borderBottomWidth:1, borderBottomColor:D.border,
  },
  statItem: { alignItems:'center', gap:2 },
  statV:    { fontSize:22, fontWeight:'800', color:D.primary },
  statL:    { fontSize:11, fontWeight:'600', color:D.textSec },
  statDiv:  { width:1, height:36, backgroundColor:D.border },

  /* 뷰 토글 */
  toggle: {
    flexDirection:'row', margin:12, backgroundColor:D.surface,
    borderRadius:14, padding:4, borderWidth:1, borderColor:D.border,
  },
  tBtn:   { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, paddingVertical:9, borderRadius:10 },
  tBtnOn: { backgroundColor:D.surface2 },
  tTxt:   { fontSize:13, fontWeight:'600', color:D.textSec },
  tTxtOn: { color:D.primary, fontWeight:'700' },

  /* 카드 */
  card: {
    backgroundColor:D.surface, marginHorizontal:12, marginBottom:12,
    borderRadius:18, padding:16, borderWidth:1, borderColor:D.border,
  },

  /* 네비게이션 행 */
  navRow:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 },
  navBtn:   {
    width:34, height:34, borderRadius:10, backgroundColor:D.surface2,
    alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:D.border,
  },
  navArr:   { fontSize:18, color:D.text, fontWeight:'700', lineHeight:22 },
  navTitle: { fontSize:16, fontWeight:'800', color:D.text },
  navSub:   { fontSize:12, color:D.textSec, marginTop:2 },

  /* 월간 */
  dowRow:    { flexDirection:'row', marginBottom:6 },
  dowLbl:    { flex:1, textAlign:'center', fontSize:12, fontWeight:'700', color:D.textMuted, paddingVertical:4 },
  grid:      { flexDirection:'row', flexWrap:'wrap' },
  cell:      { width:'14.285%', aspectRatio:0.9, alignItems:'center', justifyContent:'center', borderRadius:10, gap:2 },
  cellToday: { borderWidth:1.5, borderColor:D.primary },
  cellSel:   { backgroundColor:D.primary },
  cellN:     { fontSize:14, fontWeight:'700', color:D.text },
  cellNSel:  { color:'#fff', fontWeight:'800' },
  dotRow:    { flexDirection:'row', gap:2, height:6, alignItems:'center' },
  miniDot:   { width:5, height:5, borderRadius:3 },
  dotPh:     { height:6 },
  todayBtn:  {
    flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6,
    marginTop:14, paddingVertical:11, borderRadius:12, backgroundColor:D.primary,
  },
  todayBtnT: { fontSize:14, fontWeight:'700', color:'#fff' },

  /* 주간 그리드 */
  wgHeaderRow: { flexDirection:'row', borderBottomWidth:1, borderBottomColor:D.border },
  wgTimeCell:  { width:44, alignItems:'center', justifyContent:'center', alignSelf:'stretch', borderRightWidth:StyleSheet.hairlineWidth, borderRightColor:D.border },
  wgDayHeader: { width:54, alignItems:'center', justifyContent:'center', paddingVertical:8, borderRightWidth:StyleSheet.hairlineWidth, borderRightColor:D.border },
  wgDayDate:   { fontSize:11, fontWeight:'700', color:D.textSec },
  wgDayDow:    { fontSize:12, fontWeight:'800', color:D.text, marginTop:2 },
  wgRow:       { flexDirection:'row', height:44, borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:D.border },
  wgTimeLbl:   { fontSize:10, color:D.textMuted, fontWeight:'600' },
  wgCell:      { width:54, height:44, paddingHorizontal:4, justifyContent:'center', borderRightWidth:StyleSheet.hairlineWidth, borderRightColor:D.border, overflow:'hidden' },
  wgCellName:  { fontSize:10, fontWeight:'700' },
  wgCellExtra: { fontSize:9, color:D.textSec, fontWeight:'600' },

  /* 공통 타임 그리드 */
  timeGrid: { height:320, backgroundColor:D.surface2, borderRadius:10, marginTop:10 },

  /* 시간선 */
  hLine: { position:'absolute', left:0, right:0, flexDirection:'row', alignItems:'center' },
  hLbl:  { width:TIME_W, fontSize:10, color:D.textMuted, fontWeight:'600', textAlign:'right', paddingRight:6 },
  hRule: { flex:1, height:StyleSheet.hairlineWidth, backgroundColor:D.border },

  /* 일간 블록 */
  dayBlock:    {
    position:'absolute', borderRadius:10, paddingHorizontal:10, paddingVertical:6,
    overflow:'hidden', borderLeftWidth:4,
  },
  dayBlockTop: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  dayBTime:    { fontSize:12, fontWeight:'700' },
  dayBName:    { fontSize:13, fontWeight:'600', color:D.text, marginTop:3 },
  dayBPrice:   { fontSize:12, color:D.textSec, marginTop:2 },
  dayBMemo:    { fontSize:11, color:D.textSec, marginTop:1, fontStyle:'italic' },
  dayEmpty:    { position:'absolute', top:80, left:0, right:0, alignItems:'center', gap:8 },

  /* 세션 목록 */
  listHead:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 },
  listDate:  { fontSize:16, fontWeight:'800', color:D.text },
  listSub:   { fontSize:12, color:D.textSec, marginTop:1 },
  cntBadge:  { backgroundColor:D.primary+'20', paddingHorizontal:10, paddingVertical:4, borderRadius:8 },
  cntTxt:    { fontSize:12, fontWeight:'700', color:D.primary },
  emptyBox:  { alignItems:'center', paddingVertical:28, gap:6 },
  emptyTxt:  { fontSize:14, color:D.textSec },
  emptyHint: { fontSize:12, color:D.textMuted },

  row:       { flexDirection:'row', alignItems:'center', paddingVertical:12, gap:10 },
  rowBorder: { borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:D.border },
  rowBar:    { width:4, alignSelf:'stretch', borderRadius:2 },
  rowTop:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:4 },
  rowBot:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  rowTime:   { fontSize:13, fontWeight:'700', color:D.text },
  rowName:   { fontSize:14, fontWeight:'600', color:D.text },
  rowPrice:  { fontSize:13, fontWeight:'800' },
  rowMemo:   { fontSize:11, color:D.textSec, marginTop:3, fontStyle:'italic' },
  lineThr:   { textDecorationLine:'line-through', opacity:0.4 },
  consultBadge: {
    paddingHorizontal:8, paddingVertical:2, borderRadius:6,
    backgroundColor:'#E0F2FE', borderWidth:1, borderColor:'#BAE6FD',
  },
  consultBadgeText: { fontSize:11, fontWeight:'700', color:'#0891B2' },
  slotBadge: { paddingHorizontal:8, paddingVertical:2, borderRadius:6, backgroundColor:'#E0F2FE', borderWidth:1, borderColor:'#7DD3FC' },
  slotBadgeText: { fontSize:11, fontWeight:'700', color:'#0EA5E9' },
  rowActions:{ flexDirection:'row', gap:2, alignItems:'center' },
  actBtn:    { padding:6 },

  statusChip:{ flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:7, paddingVertical:3, borderRadius:8 },
  statusDot: { width:5, height:5, borderRadius:3 },
  statusTxt: { fontSize:11, fontWeight:'700' },

  /* FAB */
  fab: {
    position:'absolute', bottom:24, right:24,
    width:58, height:58, borderRadius:29,
    backgroundColor:D.primary,
    alignItems:'center', justifyContent:'center',
    shadowColor:D.primary, shadowOpacity:0.55, shadowRadius:12,
    shadowOffset:{width:0,height:4}, elevation:10,
  },

  /* 모달 */
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'flex-end' },
  sheet: {
    backgroundColor:D.surface, borderTopLeftRadius:24, borderTopRightRadius:24,
    padding:20, paddingBottom:36, borderTopWidth:1, borderColor:D.border,
  },
  sheetHandle: { width:36, height:4, borderRadius:2, backgroundColor:D.border, alignSelf:'center', marginBottom:16 },
  sheetHead:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:18 },
  sheetTitle:  { fontSize:18, fontWeight:'800', color:D.text },

  fRow:    { flexDirection:'row', alignItems:'flex-start', marginBottom:14 },
  fCol:    { marginBottom:14 },
  fRowLbl: { flexDirection:'row', alignItems:'center', marginBottom:8 },
  fIco:    { marginRight:10, marginTop:1 },
  fLbl:    { fontSize:12, fontWeight:'700', color:D.textSec, marginBottom:4 },
  fVal:    { fontSize:14, fontWeight:'600', color:D.text },
  fValSm:  { fontSize:13, fontWeight:'700', color:D.primary, marginLeft:8 },
  fInput:  {
    fontSize:14, color:D.text,
    borderBottomWidth:1, borderBottomColor:D.border,
    paddingVertical:6, minWidth:160,
  },

  timeScroll: { marginLeft:28 },
  tChip:      {
    paddingHorizontal:10, paddingVertical:6, marginRight:6, borderRadius:8,
    backgroundColor:D.surface2, borderWidth:1, borderColor:D.border,
  },
  tChipOn:    { backgroundColor:D.primary, borderColor:D.primary },
  tChipT:     { fontSize:12, fontWeight:'600', color:D.textSec },
  tChipTOn:   { color:'#fff' },

  colorRow:   { flexDirection:'row', gap:10, flexWrap:'wrap', marginTop:2 },
  colorDot:   { width:30, height:30, borderRadius:15, alignItems:'center', justifyContent:'center' },
  colorDotOn: { borderWidth:3, borderColor:'rgba(255,255,255,0.5)', shadowColor:'#000', shadowOpacity:0.3, shadowRadius:4, elevation:4 },

  addBtn:  {
    flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
    marginTop:18, paddingVertical:15, borderRadius:14, backgroundColor:D.primary,
  },
  addBtnT: { fontSize:16, fontWeight:'800', color:'#fff' },
});

/* ─── 시간선 스타일 분리 (컴포넌트 내부 참조용) ─── */
const g = StyleSheet.create({
  hLine: { position:'absolute', left:0, right:0, flexDirection:'row', alignItems:'center' },
  hLbl:  { width:TIME_W, fontSize:10, color:D.textMuted, fontWeight:'600', textAlign:'right', paddingRight:6 },
  hRule: { flex:1, height:StyleSheet.hairlineWidth, backgroundColor:D.border },
});
