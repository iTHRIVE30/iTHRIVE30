import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import {
  getDaysWithData,
  getTodayKey,
  getHabits,
  getLogForDate,
  getMoodRating,
  getIntention,
  getGratitude,
  getNotes,
  MOOD_SCALE_MAX,
  type HabitDef,
  type DailyLog,
  type NoteEntry,
} from '../lib/habitStore';
import { getStartedLevels, type StartedLevel } from '../lib/challengeStore';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import { levelColors, type Theme } from '../constants/theme';

/* ============================================================================
   HABIT CALENDAR — sits under the Progress table.

   Every day of the habit tracker, a month at a time, right back to the start.
   Each challenge's 30 days are shaded as a block in its colour, with day numbers.

   - Picking a challenge chip switches the table above to that challenge's 30
     days (and jumps here to the month it began). "Last 30 days" switches back.
   - Tapping a day shows it underneath: what was ticked, and "Show detail" for
     mood, intention, gratitude and notes. "Open on Today" goes there to edit.

   The Today strip only ever holds 30 days; this is how everything older is reached.
   "Level" is an internal word only - challenges are shown by their titles.
   ============================================================================ */

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Month = { y: number; m: number }; // m is 0-11

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthOf(key: string): Month {
  const d = new Date(key + 'T00:00:00');
  return { y: d.getFullYear(), m: d.getMonth() };
}

const monthIndex = (mo: Month) => mo.y * 12 + mo.m;

/** The month's grid (Monday first): a date key, or null for the padding either side. */
function monthGrid(mo: Month): (string | null)[] {
  const first = new Date(mo.y, mo.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(mo.y, mo.m + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(dateKey(new Date(mo.y, mo.m, day)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatFullDate(key: string): string {
  return new Date(key + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

type DayView = {
  habits: HabitDef[];
  log: DailyLog;
  mood: number;
  intention: string;
  gratitude: string[];
  notes: NoteEntry[];
};

export default function HabitCalendar({
  selectedLevel,
  onSelectLevel,
}: {
  selectedLevel: number | null;
  onSelectLevel: (level: StartedLevel | null) => void;
}) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const todayKey = getTodayKey();

  const [levels, setLevels] = useState<StartedLevel[]>([]);
  const [month, setMonth] = useState<Month>(() => monthOf(todayKey));
  const [hasData, setHasData] = useState<Record<string, boolean>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [day, setDay] = useState<DayView | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getStartedLevels().then(setLevels).catch(() => setLevels([]));
    }, [])
  );

  const cells = useMemo(() => monthGrid(month), [month]);

  // One bulk read per month shown.
  useEffect(() => {
    let alive = true;
    const keys = cells.filter((c): c is string => !!c);
    getDaysWithData(keys).then((d) => { if (alive) setHasData(d); }).catch(() => {});
    return () => { alive = false; };
  }, [cells]);

  // The tapped day's contents, read only when a day is picked.
  useEffect(() => {
    if (!selectedDay) return;
    let alive = true;
    Promise.all([
      getHabits(),
      getLogForDate(selectedDay),
      getMoodRating(selectedDay),
      getIntention(selectedDay),
      getGratitude(selectedDay),
      getNotes(selectedDay),
    ])
      .then(([habits, log, mood, intention, gratitude, notes]) => {
        if (alive) setDay({ habits, log, mood, intention, gratitude, notes });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [selectedDay]);

  /** date -> the challenge it belongs to, its day number, and its colour. */
  const levelByDate = useMemo(() => {
    const map: Record<string, { level: StartedLevel; day: number; color: string }> = {};
    const palette = levelColors(t);
    levels.forEach((l) => {
      const color = palette[(l.level.number - 1) % palette.length];
      l.dates.forEach((d, i) => { map[d] = { level: l, day: i + 1, color }; });
    });
    return map;
  }, [levels, t]);

  // Bounded both ways: from the month the programme began, up to this month.
  const minMonth = levels.length > 0 ? monthOf(levels[0].startDate) : monthOf(todayKey);
  const maxMonth = monthOf(todayKey);
  const canBack = monthIndex(month) > monthIndex(minMonth);
  const canForward = monthIndex(month) < monthIndex(maxMonth);
  const shift = (by: number) => {
    const next = new Date(month.y, month.m + by, 1);
    setMonth({ y: next.getFullYear(), m: next.getMonth() });
  };

  const pickLevel = (l: StartedLevel | null) => {
    onSelectLevel(l);
    setMonth(l ? monthOf(l.startDate) : maxMonth);
  };

  const pickDay = (key: string) => {
    setShowDetail(false);
    setDay(null);
    setSelectedDay((cur) => (cur === key ? null : key));
  };

  const title = new Date(month.y, month.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const dayInfo = selectedDay ? levelByDate[selectedDay] : undefined;
  const ticked = day ? day.habits.filter((h) => day.log[h.id]) : [];
  const gratitude = day ? day.gratitude.filter((g) => g.trim()) : [];

  return (
    <View>
      <View style={styles.chipRow}>
        <Pressable
          style={[styles.chip, selectedLevel === null && styles.chipSelected]}
          onPress={() => pickLevel(null)}
        >
          <Text style={styles.chipText}>Last 30 days</Text>
        </Pressable>
        {levels.map((l) => {
          const color = levelByDate[l.startDate]?.color ?? t.primary;
          const selected = selectedLevel === l.level.number;
          return (
            <Pressable
              key={l.level.number}
              style={[styles.chip, selected && { borderColor: color, backgroundColor: t.surfaceAlt }]}
              onPress={() => pickLevel(l)}
            >
              <View style={[styles.swatch, { backgroundColor: color }]} />
              <Text style={styles.chipText} numberOfLines={1}>{l.level.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.card}>
        <View style={styles.monthRow}>
          <Pressable onPress={() => canBack && shift(-1)} disabled={!canBack} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={canBack ? t.primary : t.faint} />
          </Pressable>
          <Text style={styles.monthTitle}>{title}</Text>
          <Pressable onPress={() => canForward && shift(1)} disabled={!canForward} hitSlop={10}>
            <Ionicons name="chevron-forward" size={20} color={canForward ? t.primary : t.faint} />
          </Pressable>
        </View>

        <View style={styles.grid}>
          {WEEKDAYS.map((w, i) => (
            <Text key={`w${i}`} style={styles.weekday}>{w}</Text>
          ))}
          {cells.map((key, i) => {
            if (!key) return <View key={`p${i}`} style={styles.cell} />;
            const info = levelByDate[key];
            const future = key > todayKey;
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;
            return (
              <Pressable
                key={key}
                style={styles.cell}
                onPress={() => pickDay(key)}
                disabled={future}
                accessibilityLabel={`${key}${info ? `, ${info.level.level.name} day ${info.day}` : ''}`}
              >
                <View
                  style={[
                    styles.cellInner,
                    isToday && styles.cellToday,
                    isSelected && styles.cellSelected,
                    future && styles.cellFuture,
                  ]}
                >
                  {/* The challenge block: a tint behind the day, in that challenge's colour. */}
                  {!!info && <View style={[StyleSheet.absoluteFill, styles.blockTint, { backgroundColor: info.color }]} />}
                  <Text style={styles.cellNum}>{new Date(key + 'T00:00:00').getDate()}</Text>
                  {!!info && <Text style={[styles.cellDay, { color: info.color }]}>D{info.day}</Text>}
                  <View style={[styles.dot, hasData[key] && styles.dotFilled]} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {!!selectedDay && (
        <View style={styles.dayCard}>
          <Text style={styles.dayTitle}>{formatFullDate(selectedDay)}</Text>
          {!!dayInfo && (
            <Text style={[styles.daySub, { color: dayInfo.color }]}>
              {dayInfo.level.level.name} · Day {dayInfo.day}
            </Text>
          )}

          {day && (
            <>
              <Text style={styles.dayCount}>
                {ticked.length} / {day.habits.length} habits
              </Text>
              {ticked.length > 0 ? (
                <View style={styles.tickList}>
                  {ticked.map((h) => (
                    <View key={h.id} style={styles.tickRow}>
                      <Ionicons name="checkmark-circle" size={15} color={t.success} />
                      <Text style={styles.tickText}>{h.label}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>Nothing ticked this day.</Text>
              )}

              {showDetail && (
                <View style={styles.detail}>
                  <DetailRow label="Mood" value={day.mood > 0 ? `${day.mood} / ${MOOD_SCALE_MAX}` : ''} />
                  <DetailRow label="Intention" value={day.intention} />
                  <DetailRow label="Gratitude" value={gratitude.join('\n')} />
                  <DetailRow label="Notes" value={day.notes.map((n) => n.text).join('\n\n')} />
                </View>
              )}

              <View style={styles.dayActions}>
                <Pressable style={styles.outlineButton} onPress={() => setShowDetail((v) => !v)}>
                  <Text style={styles.outlineButtonText}>{showDetail ? 'Hide detail' : 'Show detail'}</Text>
                </Pressable>
                <Pressable
                  style={styles.outlineButton}
                  onPress={() => router.push({ pathname: '/', params: { date: selectedDay } })}
                >
                  <Text style={styles.outlineButtonText}>Open on Today</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label.toUpperCase()}</Text>
      <Text style={value.trim() ? styles.detailValue : styles.emptyText}>{value.trim() || 'Nothing written.'}</Text>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: 16, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, maxWidth: '100%',
    },
    chipSelected: { borderColor: t.primary, backgroundColor: t.surfaceAlt },
    chipText: { color: t.body, fontSize: 12, fontWeight: '700', flexShrink: 1 },
    swatch: { width: 10, height: 10, borderRadius: 5 },

    card: { backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: 12 },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 10 },
    monthTitle: { color: t.primary, fontSize: 16, fontWeight: '800' },

    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    weekday: { width: `${100 / 7}%`, textAlign: 'center', color: t.muted, fontSize: 11, fontWeight: '700', marginBottom: 6 },
    cell: { width: `${100 / 7}%`, aspectRatio: 0.82, padding: 2 },
    cellInner: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    cellToday: { borderWidth: 2, borderColor: t.primary },
    cellSelected: { borderWidth: 2, borderColor: t.ink },
    cellFuture: { opacity: 0.35 },
    blockTint: { opacity: 0.18 },
    cellNum: { color: t.inkSoft, fontSize: 14, fontWeight: '700' },
    cellDay: { fontSize: 9, fontWeight: '800', marginTop: 1 },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent', marginTop: 3 },
    dotFilled: { backgroundColor: t.success },

    dayCard: { marginTop: 14, backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: 16, gap: 6 },
    dayTitle: { color: t.ink, fontSize: 16, fontWeight: '800' },
    daySub: { fontSize: 12, fontWeight: '800' },
    dayCount: { color: t.primary, fontSize: 13, fontWeight: '700', marginTop: 6 },
    tickList: { gap: 5, marginTop: 2 },
    tickRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    tickText: { color: t.body, fontSize: 13 },
    emptyText: { color: t.muted, fontSize: 13, fontStyle: 'italic' },

    detail: { marginTop: 10, gap: 12, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 12 },
    detailRow: { gap: 4 },
    detailLabel: { color: t.secondaryDim, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
    detailValue: { color: t.body, fontSize: 14, lineHeight: 21 },

    dayActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    outlineButton: { flex: 1, borderWidth: 1, borderColor: t.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    outlineButtonText: { color: t.primary, fontSize: 13, fontWeight: '700' },
  });
