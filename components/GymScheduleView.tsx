import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGymSlotStore } from '../store/gymSlotStore';
import { MOCK_GYMS } from '../data/gyms';

const D = {
  surface: '#FFFFFF',
  surface2: '#F8FAFC',
  primary: '#4F63F5',
  text: '#0F172A',
  textSec: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  success: '#10B981',
  error: '#EF4444',
  amber: '#F59E0B',
};

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const f2 = (n: number) => String(n).padStart(2, '0');
const toStr = (d: Date) => `${d.getFullYear()}-${f2(d.getMonth() + 1)}-${f2(d.getDate())}`;
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function genSlots(open: string, close: string): string[] {
  const out: string[] = [];
  let cur = toMin(open);
  const end = close === '24:00' ? 1440 : toMin(close);
  while (cur < end) { out.push(`${f2(Math.floor(cur / 60))}:${f2(cur % 60)}`); cur += 30; }
  return out;
}
function buildCal(year: number, month: number): (string | null)[] {
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${f2(month)}-${f2(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function weekOf(anchor: string): string[] {
  const d = new Date(anchor), sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(sun); x.setDate(sun.getDate() + i); return toStr(x); });
}

export default function GymScheduleView({ gymId }: { gymId: string }) {
  const today = toStr(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [sel, setSel] = useState(today);
  const [year, setYear] = useState(+today.slice(0, 4));
  const [month, setMonth] = useState(+today.slice(5, 7));

  const slotBookings = useGymSlotStore((s) => s.slotBookings);
  const getCapacity = useGymSlotStore((s) => s.getCapacity);
  const gym = MOCK_GYMS.find((g) => g.id === gymId);

  // 확정된 슬롯 예약만 (gymId)
  const confirmed = useMemo(
    () => slotBookings.filter((b) => b.gymId === gymId && b.status === 'confirmed'),
    [slotBookings, gymId]
  );
  const byDate = useMemo(() => {
    const m = new Map<string, typeof confirmed>();
    confirmed.forEach((b) => { const a = m.get(b.date) ?? []; a.push(b); m.set(b.date, a); });
    return m;
  }, [confirmed]);

  const hoursFor = (date: string) => gym?.operatingHours.find((h) => h.dayOfWeek === new Date(date).getDay());
  const bookingsAt = (date: string, time: string) =>
    (byDate.get(date) ?? []).filter((b) => b.startTime === time).sort((a, b) => a.trainerName.localeCompare(b.trainerName));
  const countOn = (date: string) => (byDate.get(date) ?? []).length;

  const prev = () => {
    if (view === 'month') { if (month === 1) { setYear((y) => y - 1); setMonth(12); } else setMonth((m) => m - 1); }
    else { const d = new Date(sel); d.setDate(d.getDate() - (view === 'week' ? 7 : 1)); setSel(toStr(d)); }
  };
  const next = () => {
    if (view === 'month') { if (month === 12) { setYear((y) => y + 1); setMonth(1); } else setMonth((m) => m + 1); }
    else { const d = new Date(sel); d.setDate(d.getDate() + (view === 'week' ? 7 : 1)); setSel(toStr(d)); }
  };
  const goDay = (date: string) => { setSel(date); setView('day'); };

  const navTitle =
    view === 'month' ? `${year}년 ${month}월` :
    view === 'week' ? `${weekOf(sel)[0].slice(5).replace('-', '/')} ~ ${weekOf(sel)[6].slice(5).replace('-', '/')}` :
    `${+sel.slice(5, 7)}월 ${+sel.slice(8)}일 (${DOW[new Date(sel).getDay()]})`;

  const dayHours = hoursFor(sel);
  const dayCap = getCapacity(gymId, new Date(sel).getDay());
  const daySlots = dayHours ? genSlots(dayHours.openTime, dayHours.closeTime) : [];

  return (
    <View style={st.wrap}>
      {/* 토글 */}
      <View style={st.toggle}>
        {(['day', 'week', 'month'] as const).map((m) => (
          <TouchableOpacity key={m} style={[st.tBtn, view === m && st.tBtnOn]} onPress={() => setView(m)} activeOpacity={0.8}>
            <MaterialCommunityIcons
              name={m === 'month' ? 'calendar-month' : m === 'week' ? 'calendar-week' : 'calendar-today'}
              size={14} color={view === m ? D.primary : D.textSec}
            />
            <Text style={[st.tTxt, view === m && st.tTxtOn]}>{m === 'month' ? '월간' : m === 'week' ? '주간' : '일간'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 네비 */}
      <View style={st.nav}>
        <TouchableOpacity style={st.navBtn} onPress={prev}><Text style={st.navArr}>‹</Text></TouchableOpacity>
        <Text style={st.navTitle}>{navTitle}</Text>
        <TouchableOpacity style={st.navBtn} onPress={next}><Text style={st.navArr}>›</Text></TouchableOpacity>
      </View>

      {/* ── 일간 ── */}
      {view === 'day' && (
        <>
          <View style={st.opRow}>
            <MaterialCommunityIcons name="clock-outline" size={13} color={D.primary} />
            <Text style={st.opTxt}>
              {dayHours ? `운영 ${dayHours.openTime}~${dayHours.closeTime} · 슬롯 정원 ${dayCap}명` : '운영하지 않는 날입니다'}
            </Text>
          </View>
          {daySlots.map((t) => {
            const bks = bookingsAt(sel, t);
            const full = dayCap > 0 && bks.length >= dayCap;
            const has = bks.length > 0;
            return (
              <View key={t} style={[st.slotRow, !has && st.slotEmpty]}>
                <Text style={[st.slotTime, has && { color: D.text }]}>{t}</Text>
                <View style={st.slotBody}>
                  {has ? (
                    <View style={st.chipWrap}>
                      {bks.map((b) => (
                        <View key={b.id} style={st.chip}>
                          <Text style={st.chipTxt} numberOfLines={1}>{b.trainerName}{b.memberName ? ` · ${b.memberName}` : ''}</Text>
                        </View>
                      ))}
                    </View>
                  ) : <Text style={st.slotDash}>–</Text>}
                </View>
                <View style={[st.cap, has && (full ? st.capFull : st.capOn)]}>
                  <Text style={[st.capTxt, has && { color: '#fff' }]}>{bks.length}/{dayCap}</Text>
                </View>
              </View>
            );
          })}
          {daySlots.length > 0 && countOn(sel) === 0 && (
            <Text style={st.emptyHint}>이 날 등록된 트레이너 일정이 없습니다</Text>
          )}
        </>
      )}

      {/* ── 주간 ── */}
      {view === 'week' && (
        <View style={{ gap: 8 }}>
          {weekOf(sel).map((d, i) => {
            const bks = (byDate.get(d) ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime));
            const isToday = d === today;
            return (
              <TouchableOpacity key={d} style={[st.weekRow, isToday && st.weekRowToday]} onPress={() => goDay(d)} activeOpacity={0.8}>
                <View style={[st.weekDate, isToday && { backgroundColor: D.primary }]}>
                  <Text style={[st.weekDow, isToday && { color: '#fff' }, i === 0 && !isToday && { color: D.error }]}>{DOW[i]}</Text>
                  <Text style={[st.weekNum, isToday && { color: '#fff' }]}>{+d.slice(8)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {bks.length === 0 ? (
                    <Text style={st.weekEmpty}>일정 없음</Text>
                  ) : (
                    <View style={st.chipWrap}>
                      {bks.slice(0, 4).map((b) => (
                        <View key={b.id} style={st.chipSm}>
                          <Text style={st.chipSmTxt} numberOfLines={1}>{b.startTime} {b.trainerName}</Text>
                        </View>
                      ))}
                      {bks.length > 4 && <Text style={st.weekMore}>+{bks.length - 4}</Text>}
                    </View>
                  )}
                </View>
                {bks.length > 0 && (
                  <View style={st.weekCnt}><Text style={st.weekCntTxt}>{bks.length}</Text></View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── 월간 ── */}
      {view === 'month' && (
        <View>
          <View style={st.dowRow}>
            {DOW.map((d, i) => (
              <Text key={d} style={[st.dowLbl, i === 0 && { color: D.error }, i === 6 && { color: '#6C8EF5' }]}>{d}</Text>
            ))}
          </View>
          <View style={st.grid}>
            {buildCal(year, month).map((dt, idx) => {
              if (!dt) return <View key={`_${idx}`} style={st.cell} />;
              const cnt = countOn(dt);
              const isToday = dt === today, isSel = dt === sel;
              return (
                <TouchableOpacity key={dt} style={[st.cell, isToday && !isSel && st.cellToday, isSel && st.cellSel]}
                  onPress={() => goDay(dt)} activeOpacity={0.7}>
                  <Text style={[st.cellN, isSel && { color: '#fff' }, new Date(dt).getDay() === 0 && !isSel && { color: D.error }]}>{+dt.slice(8)}</Text>
                  {cnt > 0 ? (
                    <View style={[st.cntDot, isSel && { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
                      <Text style={[st.cntDotTxt, isSel && { color: D.primary }]}>{cnt}</Text>
                    </View>
                  ) : <View style={{ height: 14 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },

  toggle: { flexDirection: 'row', backgroundColor: D.surface2, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: D.border },
  tBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 9 },
  tBtnOn: { backgroundColor: D.surface },
  tTxt: { fontSize: 12.5, fontWeight: '600', color: D.textSec },
  tTxtOn: { color: D.primary, fontWeight: '700' },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: D.surface2, borderWidth: 1, borderColor: D.border, alignItems: 'center', justifyContent: 'center' },
  navArr: { fontSize: 17, fontWeight: '700', color: D.text, lineHeight: 20 },
  navTitle: { fontSize: 15, fontWeight: '800', color: D.text },

  opRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: D.primary + '12', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  opTxt: { fontSize: 12, fontWeight: '700', color: D.primary },

  /* 일간 슬롯 */
  slotRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: D.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: D.border,
  },
  slotEmpty: { backgroundColor: D.surface2, borderColor: 'transparent', paddingVertical: 5 },
  slotTime: { width: 42, fontSize: 12, fontWeight: '700', color: D.textMuted },
  slotBody: { flex: 1 },
  slotDash: { fontSize: 12, color: D.textMuted },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignItems: 'center' },
  chip: { backgroundColor: D.primary + '15', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 180 },
  chipTxt: { fontSize: 12, fontWeight: '700', color: D.primary },
  cap: { minWidth: 38, alignItems: 'center', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: D.border },
  capOn: { backgroundColor: D.success },
  capFull: { backgroundColor: D.error },
  capTxt: { fontSize: 11, fontWeight: '800', color: D.textMuted },
  emptyHint: { fontSize: 12.5, color: D.textMuted, textAlign: 'center', paddingVertical: 8 },

  /* 주간 */
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: D.surface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: D.border },
  weekRowToday: { borderColor: D.primary },
  weekDate: { width: 42, height: 42, borderRadius: 11, backgroundColor: D.surface2, alignItems: 'center', justifyContent: 'center' },
  weekDow: { fontSize: 10, fontWeight: '700', color: D.textSec },
  weekNum: { fontSize: 15, fontWeight: '800', color: D.text },
  weekEmpty: { fontSize: 12.5, color: D.textMuted },
  weekMore: { fontSize: 11, fontWeight: '700', color: D.textSec },
  weekCnt: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: D.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  weekCntTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },
  chipSm: { backgroundColor: D.primary + '12', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  chipSmTxt: { fontSize: 11, fontWeight: '700', color: D.primary },

  /* 월간 */
  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dowLbl: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: D.textMuted, paddingVertical: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 0.92, alignItems: 'center', justifyContent: 'center', borderRadius: 9, gap: 2 },
  cellToday: { borderWidth: 1.5, borderColor: D.primary },
  cellSel: { backgroundColor: D.primary },
  cellN: { fontSize: 13, fontWeight: '700', color: D.text },
  cntDot: { minWidth: 16, height: 14, borderRadius: 7, backgroundColor: D.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cntDotTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
});
