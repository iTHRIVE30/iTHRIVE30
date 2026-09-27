import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { getDaysWithData, getTodayKey } from '../lib/habitStore';
import { getStartedLevels, type StartedLevel } from '../lib/challengeStore';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import { levelColors, type Theme } from '../constants/theme';

/* ============================================================================
   HABIT CALENDAR — the Progress tab's "Calendar" view.

   Every day of the habit tracker, a month at a time, going right back to the
   start. Each Level's 30 days are shaded as a block in that Level's colour with
   its day numbers, so you can see where each challenge sat on the calendar.
   The Level chips jump straight to the month a Level began. Tapping any day up
   to today opens it on Today, where it can be viewed or edited like any other.

   The Today strip only ever holds 30 days; this is how everything older is reached.
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

/** The month's 42-cell grid (Monday first): a date key, or null for the padding either side. */
function monthGrid(mo: Month): (string | null)[] {
  const first = new Date(mo.y, mo.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(mo.y, mo.m + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(dateKey(new Date(mo.y, mo.m, day)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function HabitCalendar() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const todayKey = getTodayKey();

  const [levels, setLevels] = useState<StartedLevel[]>([]);
  const [month, setMonth] = useState<Month>(() => monthOf(todayKey));
  const [hasData, setHasData] = useState<Record<string, boolean>>({});

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

  /** date -> the Level it belongs to and its day number within that Level. */
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

  const openDay = (key: string) => {
    router.push({ pathname: '/', params: { date: key } });
  };

  const title = new Date(month.y, month.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <View>
      {levels.length > 0 && (
        <View style={styles.chipRow}>
          {levels.map((l) => {
            const color = levelByDate[l.startDate]?.color ?? t.primary;
            const selected = monthIndex(monthOf(l.startDate)) === monthIndex(month);
            return (
              <Pressable
                key={l.level.number}
                style={[styles.chip, selected && { borderColor: color }]}
                onPress={() => setMonth(monthOf(l.startDate))}
              >
                <View style={[styles.swatch, { backgroundColor: color }]} />
                <Text style={styles.chipText}>Level {l.level.number}</Text>
              </Pressable>
            );
          })}
          <Pressable style={styles.chip} onPress={() => setMonth(maxMonth)}>
            <Text style={styles.chipText}>This month</Text>
          </Pressable>
        </View>
      )}

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
            return (
              <Pressable
                key={key}
                style={styles.cell}
                onPress={() => openDay(key)}
                disabled={future}
                accessibilityLabel={`${key}${info ? `, Level ${info.level.level.number} day ${info.day}` : ''}`}
              >
                <View style={[styles.cellInner, isToday && styles.cellToday, future && styles.cellFuture]}>
                  {/* The Level block: a tint behind the day, in that Level's colour. */}
                  {!!info && <View style={[StyleSheet.absoluteFill, styles.blockTint, { backgroundColor: info.color }]} />}
                  <Text style={styles.cellNum}>{new Date(key + 'T00:00:00').getDate()}</Text>
                  {!!info && (
                    <Text style={[styles.cellDay, { color: info.color }]}>D{info.day}</Text>
                  )}
                  <View style={[styles.dot, hasData[key] && styles.dotFilled]} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {levels.length > 0 && (
        <View style={styles.legend}>
          {levels.map((l) => (
            <View key={l.level.number} style={styles.legendRow}>
              <View style={[styles.swatch, { backgroundColor: levelByDate[l.startDate]?.color ?? t.primary }]} />
              <Text style={styles.legendText}>
                Level {l.level.number} · {l.level.name}
              </Text>
            </View>
          ))}
          <View style={styles.legendRow}>
            <View style={[styles.dot, styles.dotFilled, { marginTop: 0 }]} />
            <Text style={styles.legendText}>Something logged that day. Tap any day to open it.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: 16, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface,
    },
    chipText: { color: t.body, fontSize: 12, fontWeight: '700' },
    swatch: { width: 10, height: 10, borderRadius: 5 },

    card: { backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: 12 },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 10 },
    monthTitle: { color: t.primary, fontSize: 16, fontWeight: '800' },

    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    weekday: { width: `${100 / 7}%`, textAlign: 'center', color: t.muted, fontSize: 11, fontWeight: '700', marginBottom: 6 },
    cell: { width: `${100 / 7}%`, aspectRatio: 0.82, padding: 2 },
    cellInner: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    cellToday: { borderWidth: 2, borderColor: t.primary },
    cellFuture: { opacity: 0.35 },
    blockTint: { opacity: 0.18 },
    cellNum: { color: t.inkSoft, fontSize: 14, fontWeight: '700' },
    cellDay: { fontSize: 9, fontWeight: '800', marginTop: 1 },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent', marginTop: 3 },
    dotFilled: { backgroundColor: t.success },

    legend: { marginTop: 14, gap: 8 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendText: { color: t.secondary, fontSize: 12, flexShrink: 1 },
  });
