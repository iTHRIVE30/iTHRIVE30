import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import {
  getPerfectDayStreak,
  PerfectDayStreak,
  getTotalChallengesCompleted,
} from '../../lib/analytics';
import { AchievementStatus, getBadgeSummary } from '../../lib/achievements';
import { Goal, Milestone, getGoals, getMilestones } from '../../lib/goalsStore';
import {
  Acknowledgement,
  addAcknowledgement,
  deleteAcknowledgement,
  formatAcknowledgementDate,
  getAcknowledgements,
} from '../../lib/acknowledgementStore';
import AcknowledgementTile, { TILE_SIZE } from '../../components/AcknowledgementTile';
import Fireworks from '../../components/Fireworks';
import { markScreenVisited } from '../../lib/rewardEvents';
import KeyboardAwareScrollView from '../../components/KeyboardAwareScrollView';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { Theme } from '../../constants/theme';


/**
 * Wins is for things that actually mattered: the streak quadrants, goals and milestones you
 * finished, the handful of badges that took months, and your own words about yourself.
 *
 * The full 357-badge list deliberately lives in My Journey instead - a running count in a
 * prime position turns the programme into a scoreboard, which is the opposite of the point.
 */
export default function WinsScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();

  const [perfectStreak, setPerfectStreak] = useState<PerfectDayStreak>({ current: 0, best: 0, totalPerfectDays: 0 });
  const [challengesCompleted, setChallengesCompleted] = useState(0);
  const [majorBadges, setMajorBadges] = useState<AchievementStatus[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>([]);

  const [composerOpen, setComposerOpen] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftOccasion, setDraftOccasion] = useState('');
  const [previewing, setPreviewing] = useState<Acknowledgement | null>(null);
  const [sharing, setSharing] = useState(false);
  const [celebrateTrigger, setCelebrateTrigger] = useState(0);

  const tileRef = useRef<View>(null);

  const loadData = useCallback(async () => {
    const [perfect, completed, summary, goalList, milestoneList, acks] = await Promise.all([
      getPerfectDayStreak(),
      getTotalChallengesCompleted(),
      getBadgeSummary(),
      getGoals(),
      getMilestones(),
      getAcknowledgements(),
    ]);
    setPerfectStreak(perfect);
    setChallengesCompleted(completed);
    // Only the badges that represent months of work, and only once earned.
    setMajorBadges(summary.statuses.filter((s) => s.earned && s.significance === 'major'));
    setGoals(goalList);
    setMilestones(milestoneList);
    setAcknowledgements(acks);
  }, []);

  useFocusEffect(
    useCallback(() => {
      markScreenVisited('wins');
      loadData();
    }, [loadData])
  );

  const achievedGoals = goals.filter((g) => g.completed);
  const achievedMilestones = milestones.filter((m) => m.achieved);

  const handleSave = async () => {
    if (!draftText.trim()) return;
    const updated = await addAcknowledgement(draftText, draftOccasion);
    setAcknowledgements(updated);
    setDraftText('');
    setDraftOccasion('');
    setComposerOpen(false);
    setCelebrateTrigger((t) => t + 1);
  };

  const handleDelete = (entry: Acknowledgement) => {
    Alert.alert('Delete this?', 'This acknowledgement will be removed.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setAcknowledgements(await deleteAcknowledgement(entry.id));
          setPreviewing(null);
        },
      },
    ]);
  };

  /** Captures the off-screen 1080x1080 tile and hands the PNG to the share sheet. */
  const handleShare = async () => {
    if (!previewing || sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(tileRef, { format: 'png', quality: 1, width: TILE_SIZE, height: TILE_SIZE });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Not available', "This device can't open the share sheet.");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your acknowledgement' });
    } catch (err) {
      console.log('Acknowledgement share error:', err);
      Alert.alert('Could not share', 'Something went wrong creating the image. Try again in a moment.');
    } finally {
      setSharing(false);
    }
  };

  // The preview shrinks the real 1080px tile to fit the screen, so what you see is exactly
  // what gets shared.
  const previewScale = Math.min((width - 72) / TILE_SIZE, 0.34);

  return (
    <>
      <KeyboardAwareScrollView style={styles.container}>
        <Text style={styles.title}>Wins</Text>
        <Text style={styles.subtitle}>What you&apos;ve actually done</Text>

        {/* ---- Streak quadrants ---- */}
        {perfectStreak.current > 0 && (
          <View style={styles.celebrateCard}>
            <View style={styles.celebrateStarsRow}>
              <Ionicons name="star" size={12} color={t.primary} />
              <Ionicons name="star" size={20} color={t.primary} />
              <Ionicons name="star" size={12} color={t.primary} />
            </View>
            <Text style={styles.celebrateTitle}>WELL DONE!</Text>
            <Text style={styles.celebrateSubtitle}>{perfectStreak.current}-day 100% streak going strong</Text>
          </View>
        )}

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={22} color={t.primary} />
            <Text style={styles.statValue}>{perfectStreak.current}</Text>
            <Text style={styles.statLabel}>100% Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={22} color={t.primary} />
            <Text style={styles.statValue}>{perfectStreak.best}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-done" size={22} color={t.primary} />
            <Text style={styles.statValue}>{perfectStreak.totalPerfectDays}</Text>
            <Text style={styles.statLabel}>100% Days</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flag" size={22} color={t.primary} />
            <Text style={styles.statValue}>{challengesCompleted}</Text>
            <Text style={styles.statLabel}>Challenges</Text>
          </View>
        </View>

        {/* ---- Self-acknowledgement ---- */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>In Your Own Words</Text>
          <Pressable style={styles.addButton} onPress={() => setComposerOpen(true)}>
            <Ionicons name="add" size={15} color={t.ground} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
        <Text style={styles.helperText}>
          Something you want to say about yourself, in your words. Nobody grades this one.
        </Text>

        {acknowledgements.length === 0 && (
          <Text style={styles.emptyText}>
            Nothing here yet. When something lands — a hard week survived, a habit that finally
            stuck — write it down before you forget it mattered.
          </Text>
        )}

        {acknowledgements.map((entry) => (
          <Pressable key={entry.id} style={styles.ackCard} onPress={() => setPreviewing(entry)}>
            {!!entry.occasion && <Text style={styles.ackOccasion}>{entry.occasion.toUpperCase()}</Text>}
            <Text style={styles.ackText}>{entry.text}</Text>
            <View style={styles.ackFooter}>
              <Text style={styles.ackDate}>{formatAcknowledgementDate(entry.createdAt)}</Text>
              <View style={styles.ackShareHint}>
                <Ionicons name="share-outline" size={13} color={t.primaryDim} />
                <Text style={styles.ackShareHintText}>Tap to share</Text>
              </View>
            </View>
          </Pressable>
        ))}

        {/* ---- Goals achieved ---- */}
        <Text style={styles.sectionTitle}>Goals Achieved</Text>
        {achievedGoals.length === 0 ? (
          <Text style={styles.emptyText}>Goals you finish will be listed here. Set them in Progress.</Text>
        ) : (
          achievedGoals.map((g) => (
            <View key={g.id} style={styles.winRow}>
              <Ionicons name="checkmark-circle" size={18} color={t.primary} />
              <Text style={styles.winRowText}>{g.text}</Text>
            </View>
          ))
        )}

        {/* ---- Milestones reached ---- */}
        <Text style={styles.sectionTitle}>Milestones Reached</Text>
        {achievedMilestones.length === 0 ? (
          <Text style={styles.emptyText}>Milestones you hit will be listed here. Set them in Progress.</Text>
        ) : (
          achievedMilestones.map((m) => (
            <View key={m.id} style={styles.winRow}>
              <Ionicons name="ribbon" size={18} color={t.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.winRowText}>{m.targetText}</Text>
                {!!m.rewardText && <Text style={styles.winRowSub}>Reward: {m.rewardText}</Text>}
              </View>
            </View>
          ))
        )}

        {/* ---- Major badges only ---- */}
        <Text style={styles.sectionTitle}>Major Milestones</Text>
        {majorBadges.length === 0 ? (
          <Text style={styles.emptyText}>
            These take months, not days. Every badge you earn along the way is in My Journey.
          </Text>
        ) : (
          majorBadges.map((s) => (
            <View key={s.achievement.id} style={styles.majorCard}>
              <View style={styles.majorHeader}>
                <Ionicons name="ribbon" size={18} color={t.primary} />
                <Text style={styles.majorName}>{s.achievement.name}</Text>
              </View>
              <Text style={styles.majorEncouragement}>{s.encouragement}</Text>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </KeyboardAwareScrollView>

      {/* ---- Composer ---- */}
      <Modal visible={composerOpen} transparent animationType="slide" onRequestClose={() => setComposerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.composerCard}>
            <Text style={styles.composerTitle}>Acknowledge yourself</Text>
            <Text style={styles.composerHint}>
              What do you want to remember about this? Write it the way you&apos;d say it to
              someone you were proud of.
            </Text>

            <Text style={styles.formLabel}>What&apos;s it for? (optional)</Text>
            <TextInput
              style={styles.formInput}
              value={draftOccasion}
              onChangeText={setDraftOccasion}
              placeholder="e.g. 90 days alcohol-free"
              placeholderTextColor={t.muted}
              maxLength={40}
            />

            <Text style={styles.formLabel}>In your own words</Text>
            <TextInput
              style={[styles.formInput, styles.formInputLarge]}
              value={draftText}
              onChangeText={setDraftText}
              placeholder="I did something I genuinely didn't think I could..."
              placeholderTextColor={t.muted}
              multiline
              maxLength={280}
            />
            <Text style={styles.charCount}>{draftText.length} / 280</Text>

            <View style={styles.composerButtonRow}>
              <Pressable style={styles.secondaryButton} onPress={() => setComposerOpen(false)}>
                <Text style={styles.secondaryButtonText}>Not now</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, !draftText.trim() && styles.primaryButtonDisabled]}
                onPress={handleSave}
                disabled={!draftText.trim()}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---- Preview + share ---- */}
      <Modal visible={!!previewing} transparent animationType="fade" onRequestClose={() => setPreviewing(null)}>
        <View style={styles.previewBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPreviewing(null)} />
          {!!previewing && (
            <>
              <View style={[styles.previewFrame, { width: TILE_SIZE * previewScale, height: TILE_SIZE * previewScale }]}>
                <View style={{ transform: [{ scale: previewScale }], width: TILE_SIZE, height: TILE_SIZE }}>
                  <AcknowledgementTile entry={previewing} />
                </View>
              </View>

              <View style={styles.previewActions}>
                <Pressable style={styles.secondaryButton} onPress={() => handleDelete(previewing)}>
                  <Ionicons name="trash-outline" size={15} color={t.secondary} />
                  <Text style={styles.secondaryButtonText}>Delete</Text>
                </Pressable>
                <Pressable style={styles.primaryButton} onPress={handleShare} disabled={sharing}>
                  <Ionicons name="share-outline" size={16} color={t.ground} />
                  <Text style={styles.primaryButtonText}>{sharing ? 'Preparing…' : 'Share'}</Text>
                </Pressable>
              </View>

              <Pressable style={styles.previewClose} onPress={() => setPreviewing(null)} hitSlop={10}>
                <Ionicons name="close" size={26} color={t.ink} />
              </Pressable>
            </>
          )}
        </View>
      </Modal>

      {/*
        The capture source. Rendered at full 1080x1080 off the bottom of the screen rather
        than scaled, so the shared PNG is full resolution no matter what device made it.
      */}
      <View style={styles.captureHost} pointerEvents="none">
        <ViewShot>
          {!!previewing && <AcknowledgementTile ref={tileRef} entry={previewing} />}
        </ViewShot>
      </View>

      <Fireworks trigger={celebrateTrigger} />
    </>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ground },
    title: { color: t.primary, fontSize: 26, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: t.secondary, fontSize: 14, marginBottom: 20 },

    celebrateCard: { alignItems: 'center', backgroundColor: t.ground, borderWidth: 2, borderColor: t.primary, borderRadius: 16, paddingVertical: 20, marginBottom: 20 },
    celebrateStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    celebrateTitle: { color: t.primary, fontSize: 18, fontWeight: '800', letterSpacing: 2 },
    celebrateSubtitle: { color: t.body, fontSize: 13, marginTop: 4 },

    statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    statCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: 16, alignItems: 'center' },
    statValue: { color: t.primary, fontSize: 26, fontWeight: '700', marginTop: 6 },
    statLabel: { color: t.secondaryDim, fontSize: 12, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26 },
    sectionTitle: { color: t.primary, fontSize: 16, fontWeight: '700', marginTop: 26, marginBottom: 10 },
    helperText: { color: t.secondaryDim, fontSize: 12, lineHeight: 17, marginBottom: 14 },
    emptyText: { color: t.muted, fontSize: 13, fontStyle: 'italic', lineHeight: 19, marginBottom: 10 },

    addButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.primary, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 6 },
    addButtonText: { color: t.ground, fontSize: 12, fontWeight: '800' },

    ackCard: { backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.primaryDim, padding: 16, marginBottom: 10 },
    ackOccasion: { color: t.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 8 },
    ackText: { color: t.inkSoft, fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
    ackFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
    ackDate: { color: t.muted, fontSize: 11 },
    ackShareHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ackShareHintText: { color: t.primaryDim, fontSize: 11, fontWeight: '600' },

    winRow: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 14, marginBottom: 8 },
    winRowText: { color: t.inkSoft, fontSize: 14, flex: 1, lineHeight: 20 },
    winRowSub: { color: t.primaryDim, fontSize: 12, marginTop: 3 },

    majorCard: { backgroundColor: t.primaryTintAlt, borderRadius: 12, borderWidth: 1, borderColor: t.primaryDim, padding: 15, marginBottom: 10 },
    majorHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    majorName: { color: t.primary, fontSize: 14, fontWeight: '800', flex: 1 },
    majorEncouragement: { color: t.encouragement, fontSize: 13, lineHeight: 19, marginTop: 8, fontStyle: 'italic' },

    modalBackdrop: { flex: 1, backgroundColor: t.scrim, justifyContent: 'flex-end' },
    composerCard: { backgroundColor: t.surfaceSunken, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: t.borderMuted, padding: 22, paddingBottom: 34 },
    composerTitle: { color: t.primary, fontSize: 19, fontWeight: '800' },
    composerHint: { color: t.secondaryDim, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 6 },
    formLabel: { color: t.secondary, fontSize: 12, marginTop: 14, marginBottom: 6 },
    formInput: { color: t.ink, fontSize: 15, backgroundColor: t.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: t.borderMuted, padding: 12 },
    formInputLarge: { minHeight: 110, textAlignVertical: 'top', lineHeight: 21 },
    charCount: { color: t.muted, fontSize: 11, textAlign: 'right', marginTop: 6 },
    composerButtonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    primaryButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: t.primary, borderRadius: 11, paddingVertical: 14 },
    primaryButtonDisabled: { opacity: 0.4 },
    primaryButtonText: { color: t.ground, fontSize: 14, fontWeight: '800' },
    secondaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: t.borderStrong, borderRadius: 11, paddingVertical: 14 },
    secondaryButtonText: { color: t.secondary, fontSize: 14, fontWeight: '600' },

    previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center', padding: 28 },
    previewFrame: { overflow: 'hidden', borderRadius: 12 },
    previewActions: { flexDirection: 'row', gap: 12, marginTop: 28, alignSelf: 'stretch', paddingHorizontal: 8 },
    previewClose: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

    // Off-screen, but still laid out and rendered - that's what makes it capturable.
    captureHost: { position: 'absolute', top: -99999, left: -99999, width: TILE_SIZE, height: TILE_SIZE },
  });
