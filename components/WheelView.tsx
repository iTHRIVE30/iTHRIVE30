import { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useThemedStyles } from '../hooks/useTheme';
import type { Theme } from '../constants/theme';
import LifeWheelChart, { type WheelSeries } from './LifeWheelChart';
import { copy } from '../lib/challengeCopy';
import { LIFE_AREAS, hasAnyScore, toScores, zoneOf } from '../lib/lifeWheel';
import { answerById, focusArea, getFoundations, type FoundationStore } from '../lib/foundations';
import { getChallengeResponses, getLevelDays, type ChallengeResponses } from '../lib/challengeStore';

/**
 * The Wheel view on the Progress tab: the growth record's measures. The life wheel (Day 1,
 * the second look, Day 29), the focus-area pulse from each reflection day, and the actions
 * ticked done, week by week.
 *
 * Rules (growth record): the Thriver against themselves only - no averages, no other
 * Thrivers - and only what was done, never a count of what wasn't.
 */
export default function WheelView() {
  const styles = useThemedStyles(createStyles);
  const [store, setStore] = useState<FoundationStore>({});
  const [responses, setResponses] = useState<ChallengeResponses>({});

  useFocusEffect(
    useCallback(() => {
      Promise.all([getFoundations(), getChallengeResponses()])
        .then(([s, r]) => {
          setStore(s);
          setResponses(r);
        })
        .catch(() => {});
    }, [])
  );

  const versions = store.wheel ?? [];
  const original = versions[0]?.value ?? answerById('foundation.d01.q1', store, responses);
  const secondLook = [...versions].reverse().find((v) => v.source === 'foundation.d29.q2')?.value;
  const now = answerById('foundation.d29.q1', store, responses);

  if (!hasAnyScore(original)) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{copy('wheelview.title')}</Text>
        <Text style={styles.empty}>{copy('wheelview.empty')}</Text>
      </View>
    );
  }

  const day1 = toScores(secondLook ?? original);
  const day29 = hasAnyScore(now) ? toScores(now) : null;
  const series: WheelSeries[] = day29 ? [{ scores: day1, dashed: true }, { scores: day29 }] : [{ scores: day1 }];

  const area = focusArea(store, responses);
  const days = getLevelDays(1);
  const pulses = days
    .filter((d) => d.kind === 'reflection')
    .map((d) => {
      const i = d.fields.findIndex((f) => f.type === 'pulse');
      const v = i >= 0 ? responses[d.id]?.answers[i] : undefined;
      return Array.isArray(v) && v[1] ? { day: d.day, area: v[0], score: Number(v[1]) } : null;
    })
    .filter((p): p is { day: number; area: string; score: number } => !!p);

  // Ticked actions per week. Done only - a week with none simply isn't listed.
  const weeks = [1, 2, 3, 4, 5]
    .map((w) => {
      const inWeek = days.filter((d) => Math.min(5, Math.ceil(d.day / 7)) === w && d.actionCheck);
      const done = inWeek.filter((d) => !!responses[d.id]?.answers[d.fields.length]).length;
      return { week: w, done };
    })
    .filter((w) => w.done > 0);

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <Text style={styles.title}>{copy('wheelview.title')}</Text>
        <Text style={styles.subtitle}>{copy('wheelview.subtitle')}</Text>
        <LifeWheelChart series={series} size={300} />
        {!!secondLook && <Text style={styles.note}>{copy('wheelview.second_look')}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{copy('wheelview.areas').toUpperCase()}</Text>
        <View style={styles.row}>
          <Text style={[styles.cellArea, styles.head]} />
          <Text style={[styles.cellNum, styles.head]}>{copy('wheelview.col.day1')}</Text>
          {day29 && <Text style={[styles.cellNum, styles.head]}>{copy('wheelview.col.now')}</Text>}
        </View>
        {LIFE_AREAS.map((a, i) => (
          <View key={a.id} style={styles.row}>
            <Text style={[styles.cellArea, a.name === area && styles.focus]}>{a.name}</Text>
            <Text style={styles.cellNum}>
              {day1[i] ?? '–'} <Text style={styles.zone}>{zoneOf(day1[i])?.name ?? ''}</Text>
            </Text>
            {day29 && (
              <Text style={styles.cellNum}>
                {day29[i] ?? '–'} <Text style={styles.zone}>{zoneOf(day29[i])?.name ?? ''}</Text>
              </Text>
            )}
          </View>
        ))}
      </View>

      {!!area && (
        <View style={styles.card}>
          <Text style={styles.label}>{copy('wheelview.focus').toUpperCase()}</Text>
          <Text style={styles.big}>{area}</Text>
          {pulses.length > 0 && <Text style={styles.subtitle}>{copy('wheelview.pulses')}</Text>}
          {pulses.map((p) => (
            <Text key={p.day} style={styles.line}>
              Day {p.day} · {p.score} · {zoneOf(p.score)?.name}
            </Text>
          ))}
        </View>
      )}

      {weeks.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.label}>{copy('wheelview.did').toUpperCase()}</Text>
          {weeks.map((w) => (
            <Text key={w.week} style={styles.line}>
              {copy('wheelview.week')} {w.week} · {w.done}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16, gap: 10 },
    title: { color: t.ink, fontSize: 18, fontWeight: '700' },
    subtitle: { color: t.secondary, fontSize: 13, lineHeight: 19 },
    empty: { color: t.secondary, fontSize: 14, fontStyle: 'italic', lineHeight: 21 },
    note: { color: t.secondaryDim, fontSize: 12, textAlign: 'center' },
    label: { color: t.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
    row: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: 3 },
    head: { color: t.secondaryDim, fontSize: 11, fontWeight: '700' },
    cellArea: { flex: 1.4, color: t.body, fontSize: 14 },
    cellNum: { flex: 1, color: t.ink, fontSize: 14, fontWeight: '700' },
    zone: { color: t.secondaryDim, fontSize: 11, fontWeight: '400' },
    focus: { color: t.primary, fontWeight: '700' },
    big: { color: t.ink, fontSize: 20, fontWeight: '700' },
    line: { color: t.body, fontSize: 14, lineHeight: 21 },
  });
