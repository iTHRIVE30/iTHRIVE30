import { View, Text, StyleSheet } from 'react-native';

import { useThemedStyles } from '../../hooks/useTheme';
import type { Theme } from '../../constants/theme';
import LifeWheelChart from '../LifeWheelChart';
import { copy } from '../../lib/challengeCopy';
import { fillRevealSummary, hasAnyScore, revealCounts, toScores } from '../../lib/lifeWheel';
import { answerById, currentValue, type FoundationStore } from '../../lib/foundations';
import {
  getLevelDays,
  type ChallengeAnswer,
  type ChallengeDayDef,
  type ChallengePanel,
  type ChallengeResponses,
} from '../../lib/challengeStore';

type Ctx = {
  day: ChallengeDayDef;
  answers: ChallengeAnswer[];
  store: FoundationStore;
  responses: ChallengeResponses;
};

function asText(value: ChallengeAnswer | undefined): string {
  if (value === undefined) return '';
  return Array.isArray(value) ? value.filter(Boolean).join(' · ') : String(value).trim();
}

/** The week a reflection day looks back on: Days 1-6 for Day 7, 8-13 for Day 14, and so on. */
function weekBefore(reflectionDay: number): ChallengeDayDef[] {
  return getLevelDays(1).filter((d) => d.day >= reflectionDay - 6 && d.day < reflectionDay);
}

export default function DayPanel({ panel, ctx }: { panel: ChallengePanel; ctx: Ctx }) {
  const styles = useThemedStyles(createStyles);
  const { day, answers, store, responses } = ctx;

  switch (panel.kind) {
    case 'after_save': {
      if (!hasAnyScore(answers[panel.afterField])) return null;
      return <Text style={styles.note}>{panel.text}</Text>;
    }

    case 'vision': {
      const words = asText(answerById(panel.source, store, responses));
      return (
        <View style={styles.echo}>
          <Text style={styles.label}>{copy('vision.label').toUpperCase()}</Text>
          <Text style={words ? styles.echoText : styles.empty}>{words || copy('vision.empty')}</Text>
        </View>
      );
    }

    case 'replay': {
      const earlier = asText(answerById(panel.source, store, responses));
      return (
        <View style={styles.echo}>
          <Text style={styles.label}>{panel.label.toUpperCase()}</Text>
          <Text style={earlier ? styles.echoText : styles.empty}>{earlier || copy('replay.empty')}</Text>
        </View>
      );
    }

    case 'said_and_did': {
      // What you DID, never what you missed: only ticked actions are listed.
      const done = weekBefore(day.day).filter(
        (d) => !!d.actionCheck && !!responses[d.id]?.answers[d.fields.length]
      );
      return (
        <View style={styles.card}>
          <Text style={styles.label}>{copy('did.label').toUpperCase()}</Text>
          {done.length === 0 ? (
            <Text style={styles.empty}>{copy('did.empty')}</Text>
          ) : (
            done.map((d) => (
              <Text key={d.id} style={styles.didLine}>
                Day {d.day} · {d.title}
              </Text>
            ))
          )}
        </View>
      );
    }

    case 'wheel_contrast': {
      const wheel = currentValue('wheel', store, responses);
      const words = asText(panel.wordsField >= 0 ? answers[panel.wordsField] : undefined);
      return (
        <View style={styles.card}>
          <Text style={styles.label}>{panel.title.toUpperCase()}</Text>
          {hasAnyScore(wheel) ? (
            <LifeWheelChart series={[{ scores: toScores(wheel) }]} size={260} />
          ) : (
            <Text style={styles.empty}>{copy('wheel.contrast.empty')}</Text>
          )}
          {!!words && <Text style={styles.words}>{words}</Text>}
          <Text style={styles.note}>{panel.text}</Text>
        </View>
      );
    }

    case 'wheel_reveal': {
      // Baseline: the Day 1 wheel's current version - the second look when there is one
      // (their honest start), otherwise the original (Andrew, 8 Oct).
      const baseline = currentValue('wheel', store, responses);
      const now = answerById('foundation.d29.q1', store, responses);
      if (!hasAnyScore(baseline) || !hasAnyScore(now)) {
        return (
          <View style={styles.card}>
            <Text style={styles.label}>{panel.title.toUpperCase()}</Text>
            <Text style={styles.empty}>{copy('reveal.empty')}</Text>
          </View>
        );
      }
      const counts = revealCounts(toScores(baseline), toScores(now));
      const summary = counts.moved === 0 ? copy('reveal.none_moved') : fillRevealSummary(panel.summary, counts);
      return (
        <View style={styles.card}>
          <Text style={styles.label}>{panel.title.toUpperCase()}</Text>
          <LifeWheelChart
            series={[{ scores: toScores(baseline), dashed: true }, { scores: toScores(now) }]}
            size={280}
          />
          <View style={styles.legend}>
            <Text style={styles.legendDashed}>- - {copy('reveal.label.baseline')}</Text>
            <Text style={styles.legendSolid}>━ {copy('reveal.label.now')}</Text>
          </View>
          <Text style={styles.summary}>{summary}</Text>
        </View>
      );
    }
  }
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    echo: { marginTop: 24, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: t.primaryDim, gap: 6 },
    card: {
      marginTop: 24,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      padding: 16,
      gap: 10,
    },
    label: { color: t.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
    echoText: { color: t.ink, fontSize: 17, fontWeight: '600', lineHeight: 25 },
    empty: { color: t.secondary, fontSize: 14, fontStyle: 'italic', lineHeight: 21 },
    note: { color: t.secondary, fontSize: 13, lineHeight: 20, marginTop: 10 },
    words: { color: t.ink, fontSize: 16, fontWeight: '700', textAlign: 'center' },
    didLine: { color: t.body, fontSize: 14, lineHeight: 21 },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: 18 },
    legendDashed: { color: t.secondary, fontSize: 12 },
    legendSolid: { color: t.primary, fontSize: 12, fontWeight: '700' },
    summary: { color: t.inkSoft, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  });
