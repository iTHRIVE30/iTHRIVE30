import { View, Text, Pressable, StyleSheet } from 'react-native';

import { useThemedStyles } from '../../hooks/useTheme';
import type { Theme } from '../../constants/theme';
import { copy } from '../../lib/challengeCopy';
import { LIFE_AREAS, toScores, withScore, zoneOf, type WheelScores } from '../../lib/lifeWheel';

/** One 1-10 row. Taps only - no slider to fight with while the sheet scrolls. */
function ScoreRow({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const on = value !== null && n <= value;
        return (
          <Pressable key={n} onPress={() => onChange(n)} style={[styles.cell, on && styles.cellOn]} hitSlop={2}>
            <Text style={[styles.cellText, on && styles.cellTextOn]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The life wheel as a question: eight areas, each with its 1, 5 and 10 anchors so a score
 * means the same thing on Day 1 and on Day 29, and the zone it lands in once scored.
 *
 * Second look (Day 29): `baseline` is the Day 1 wheel. It is shown as the starting value
 * but nothing is saved until an area is actually moved - an untouched second look is not
 * an answer.
 */
export function WheelField({
  value,
  baseline,
  onChange,
}: {
  value: unknown;
  baseline?: WheelScores | null;
  onChange: (next: string[]) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const isSecondLook = baseline !== undefined;
  const touched = Array.isArray(value) && value.length > 0;

  if (isSecondLook && !baseline) {
    return <Text style={styles.empty}>{copy('wheel.second_look.empty')}</Text>;
  }

  const shown: WheelScores = touched ? toScores(value) : baseline ?? toScores(value);
  // A second look starts from the Day 1 scores, so the first tap keeps every other area.
  const start = touched ? value : baseline ? baseline.map((s) => (s == null ? '' : String(s))) : value;

  return (
    <View style={{ gap: 18 }}>
      {LIFE_AREAS.map((area, i) => {
        const score = shown[i];
        const zone = zoneOf(score);
        return (
          <View key={area.id} style={{ gap: 6 }}>
            <View style={styles.areaHead}>
              <Text style={styles.areaName}>{area.name}</Text>
              {!!zone && <Text style={styles.zone}>{zone.name}</Text>}
            </View>
            <ScoreRow value={score} onChange={(v) => onChange(withScore(start, i, v))} />
            <View style={styles.anchors}>
              <Text style={styles.anchor}>1 · {area.a1}</Text>
              <Text style={styles.anchor}>5 · {area.a5}</Text>
              <Text style={styles.anchor}>10 · {area.a10}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * A reflection day's pulse: one score for the focus area, beside its Day 1 score. The area
 * is saved with the score, so changing the focus area later never relabels an old pulse.
 */
export function PulseField({
  area,
  day1Score,
  value,
  onChange,
}: {
  area: string;
  day1Score: number | null;
  value: unknown;
  onChange: (next: string[]) => void;
}) {
  const styles = useThemedStyles(createStyles);
  if (!area) return <Text style={styles.empty}>{copy('pulse.empty')}</Text>;
  const saved = Array.isArray(value) ? value : [];
  const score = Number(saved[1]) || null;
  const shownArea = typeof saved[0] === 'string' && saved[0] ? saved[0] : area;
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.areaHead}>
        <Text style={styles.areaName}>{shownArea}</Text>
        {day1Score !== null && (
          <Text style={styles.zone}>
            {copy('pulse.day1')} {day1Score}
          </Text>
        )}
      </View>
      <ScoreRow value={score} onChange={(v) => onChange([shownArea, String(v)])} />
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 5 },
    cell: {
      flex: 1,
      height: 34,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: t.borderStrong,
      backgroundColor: t.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellOn: { backgroundColor: t.primary, borderColor: t.primary },
    cellText: { color: t.secondaryDim, fontSize: 13, fontWeight: '700' },
    cellTextOn: { color: t.onPrimary },
    areaHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    areaName: { color: t.ink, fontSize: 15, fontWeight: '700' },
    zone: { color: t.primary, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
    anchors: { gap: 2 },
    anchor: { color: t.secondaryDim, fontSize: 12, lineHeight: 17 },
    empty: { color: t.secondary, fontSize: 14, fontStyle: 'italic', lineHeight: 21 },
  });
