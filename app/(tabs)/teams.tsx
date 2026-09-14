import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { Theme } from '../../constants/theme';

/**
 * Teams - deliberately not built yet, and the screen says why.
 *
 * This stays in the header menu (see AGENTS.md). It was thirteen lines reading
 * "Teams - coming soon", which reads as an unfinished app to a store reviewer and as a
 * wall to a new user on day one. The thinking behind it is worth more than the placeholder
 * was: the connection this supports is one you make in real life, and the app is late to
 * it on purpose.
 *
 * No email capture, no waitlist, no "notify me". That would be collecting an address with
 * nowhere to keep it, in an app whose whole privacy position is that nothing leaves the
 * device.
 */

const STAGES = [
  {
    icon: 'person-outline' as const,
    title: 'Solo',
    body: 'Where you are now, and where everyone starts. The work is yours before it is anyone else’s.',
    now: true,
  },
  {
    icon: 'people-outline' as const,
    title: 'Two of you',
    body: 'Pair up with someone you already know — a partner, a friend, a colleague — and go through it alongside each other.',
    now: false,
  },
  {
    icon: 'business-outline' as const,
    title: 'Groups and organisations',
    body: 'Once there is a network, teams for businesses and communities who want to run this together.',
    now: false,
  },
];

export default function TeamsScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
      <Text style={styles.eyebrow}>In development</Text>
      <Text style={styles.title}>Teams</Text>
      <Text style={styles.lede}>
        This one is late on purpose. iTHRIVE30 is built for a connection you make in real
        life, not one you make in an app.
      </Text>

      <View style={styles.card}>
        <Text style={styles.body}>
          There is no feed here, and there never will be. No follower counts, no matching
          with strangers, no leaderboard ranking you against people you have never met.
        </Text>
        <Text style={styles.body}>
          When Teams arrives it will do one thing: let two people who already know each
          other see how the other is going. The relationship comes first. The app supports
          it — it does not manufacture it.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>How it grows</Text>

      {STAGES.map((stage, i) => (
        <View key={stage.title} style={styles.stage}>
          <View style={styles.stageRail}>
            <View style={[styles.stageDot, stage.now && styles.stageDotNow]}>
              <Ionicons
                name={stage.icon}
                size={15}
                color={stage.now ? t.onPrimary : t.muted}
              />
            </View>
            {i < STAGES.length - 1 && <View style={styles.stageLine} />}
          </View>

          <View style={styles.stageBody}>
            <View style={styles.stageHeader}>
              <Text style={[styles.stageTitle, stage.now && styles.stageTitleNow]}>
                {stage.title}
              </Text>
              {stage.now && (
                <View style={styles.nowChip}>
                  <Text style={styles.nowChipText}>YOU ARE HERE</Text>
                </View>
              )}
            </View>
            <Text style={styles.stageText}>{stage.body}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.footnote}>
        Nothing you record leaves this phone today, and nothing will be shared later without
        you choosing to share it.
      </Text>
    </ScrollView>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ground },

    eyebrow: {
      color: t.primaryDim,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    title: { color: t.primary, fontSize: 26, fontWeight: '700', marginBottom: 10 },
    lede: { color: t.body, fontSize: 15, lineHeight: 22, marginBottom: 22 },

    card: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      padding: 18,
      marginBottom: 28,
      gap: 12,
    },
    body: { color: t.secondary, fontSize: 14, lineHeight: 21 },

    sectionLabel: {
      color: t.primaryDim,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 16,
    },

    stage: { flexDirection: 'row', gap: 14 },
    stageRail: { alignItems: 'center', width: 32 },
    stageDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stageDotNow: { backgroundColor: t.primary, borderColor: t.primary },
    stageLine: { flex: 1, width: 1, backgroundColor: t.border, marginVertical: 4 },

    stageBody: { flex: 1, paddingBottom: 24 },
    stageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
    stageTitle: { color: t.inkSoft, fontSize: 16, fontWeight: '700' },
    stageTitleNow: { color: t.primary },
    nowChip: {
      borderWidth: 1,
      borderColor: t.primaryDim,
      backgroundColor: t.primaryTint,
      borderRadius: 4,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    nowChipText: { color: t.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
    stageText: { color: t.muted, fontSize: 13.5, lineHeight: 20 },

    footnote: {
      color: t.faint,
      fontSize: 12,
      lineHeight: 18,
      fontStyle: 'italic',
      marginTop: 4,
    },
  });
