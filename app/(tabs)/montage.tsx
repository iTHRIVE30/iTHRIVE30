import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { Montage, getMontages } from '../../lib/montageStore';
import {
  markScreenVisited,
  recordMontageViewed,
  recordSideBySideViewed,
} from '../../lib/rewardEvents';
import TransformationTile, { TILE_SIZE } from '../../components/TransformationTile';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { Theme } from '../../constants/theme';

/**
 * Transformation - the daily selfies of a Level laid out in order, with Day 1 and the
 * latest day side by side at the top.
 *
 * The filmstrip shows only the days that have a photo. Rendering 30 slots with gaps would
 * turn the screen into a record of what someone missed, which is the opposite of what this
 * is for and contradicts the never-blocking principle the whole app is built on. The
 * missed count is stated once, quietly, and never as a reproach.
 */

const STRIP_GAP = 8;
const STRIP_COLUMNS = 4;

export default function MontageScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();

  const [montages, setMontages] = useState<Montage[]>([]);
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const tileRef = useRef<View>(null);

  const load = useCallback(async () => {
    const list = await getMontages();
    setMontages(list);
    setActiveLevel((prev) => (prev !== null && list.some((m) => m.level === prev) ? prev : list[0]?.level ?? null));
  }, []);

  useFocusEffect(
    useCallback(() => {
      markScreenVisited('montage');
      load();
    }, [load])
  );

  const active = montages.find((m) => m.level === activeLevel) ?? null;

  // Opening a montage that can actually be watched is the badge-worthy moment, not landing
  // on the screen. Both writes are best-effort and never throw.
  const openLevel = (montage: Montage) => {
    setActiveLevel(montage.level);
    if (montage.available) {
      recordMontageViewed(montage.level);
      recordSideBySideViewed();
    }
  };

  const handleShare = async () => {
    if (!active?.first || !active.last) return;
    setSharing(true);
    try {
      const uri = await captureRef(tileRef, { format: 'png', quality: 1, width: TILE_SIZE, height: TILE_SIZE });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Not available', "This device can't open the share sheet.");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your transformation' });
    } catch {
      Alert.alert('Could not share', 'Something went wrong building the image. Try again in a moment.');
    } finally {
      setSharing(false);
    }
  };

  const tileSize = Math.floor((width - 40 - STRIP_GAP * (STRIP_COLUMNS - 1)) / STRIP_COLUMNS);
  const previewScale = Math.min((width - 72) / TILE_SIZE, 0.34);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text style={styles.title}>Transformation</Text>
        <Text style={styles.subtitle}>Your own days, in the order you lived them</Text>

        {montages.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="camera-outline" size={30} color={t.muted} />
            <Text style={styles.emptyTitle}>Nothing to show yet</Text>
            <Text style={styles.emptyBody}>
              Take your daily selfie on the Today tab. Once there are two, they&apos;ll appear here
              side by side.
            </Text>
          </View>
        )}

        {montages.length > 1 && (
          <View style={styles.levelRow}>
            {montages.map((m) => {
              const on = m.level === activeLevel;
              return (
                <Pressable
                  key={m.level}
                  onPress={() => openLevel(m)}
                  style={[styles.levelChip, on && styles.levelChipOn]}
                >
                  <Text style={[styles.levelChipText, on && styles.levelChipTextOn]}>Level {m.level}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {active && !active.available && (
          <View style={styles.emptyCard}>
            <Ionicons name="hourglass-outline" size={30} color={t.muted} />
            <Text style={styles.emptyTitle}>
              {active.photos.length === 0 ? 'No photos in this Level yet' : 'One photo so far'}
            </Text>
            <Text style={styles.emptyBody}>
              A comparison needs two. Keep going — the second one is the whole point.
            </Text>
          </View>
        )}

        {active?.available && active.first && active.last && (
          <>
            {/* Before and after, equal size. See TransformationTile for why. */}
            <View style={styles.pairCard}>
              <View style={styles.pairRow}>
                <View style={styles.pairHalf}>
                  <Image source={{ uri: active.first.uri }} style={styles.pairPhoto} resizeMode="cover" />
                  <Text style={styles.pairLabel}>DAY {active.first.day}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={t.primary} />
                <View style={styles.pairHalf}>
                  <Image source={{ uri: active.last.uri }} style={styles.pairPhoto} resizeMode="cover" />
                  <Text style={styles.pairLabel}>DAY {active.last.day}</Text>
                </View>
              </View>

              <Text style={styles.pairMeta}>
                {active.photos.length} {active.photos.length === 1 ? 'day' : 'days'} recorded
                {active.levelComplete ? '  ·  Level complete' : ''}
              </Text>

              <Pressable
                style={[styles.shareButton, sharing && styles.shareButtonBusy]}
                onPress={handleShare}
                disabled={sharing}
              >
                <Ionicons name="share-outline" size={16} color={t.onPrimary} />
                <Text style={styles.shareButtonText}>{sharing ? 'Preparing…' : 'Share this'}</Text>
              </Pressable>
            </View>

            <Text style={styles.stripTitle}>Every day you photographed</Text>
            <View style={styles.strip}>
              {active.photos.map((p) => (
                <View key={p.dateKey} style={{ width: tileSize }}>
                  <Image
                    source={{ uri: p.uri }}
                    style={[styles.stripPhoto, { width: tileSize, height: tileSize }]}
                    resizeMode="cover"
                  />
                  <Text style={styles.stripDay}>{p.day}</Text>
                </View>
              ))}
            </View>

            <View style={styles.previewBlock}>
              <Text style={styles.previewLabel}>What gets shared</Text>
              <View
                style={[
                  styles.previewFrame,
                  { width: TILE_SIZE * previewScale, height: TILE_SIZE * previewScale },
                ]}
              >
                <View style={{ transform: [{ scale: previewScale }], width: TILE_SIZE, height: TILE_SIZE }}>
                  <TransformationTile
                    first={active.first}
                    last={active.last}
                    levelName={active.levelName}
                    dayCount={active.photos.length}
                  />
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/*
        The real tile, rendered off-screen at full 1080x1080 and captured rather than
        scaled, so the shared PNG is full resolution no matter what device made it.
      */}
      {active?.available && active.first && active.last && (
        <View style={styles.captureHost} pointerEvents="none">
          <ViewShot>
            <View ref={tileRef} collapsable={false}>
              <TransformationTile
                first={active.first}
                last={active.last}
                levelName={active.levelName}
                dayCount={active.photos.length}
              />
            </View>
          </ViewShot>
        </View>
      )}
    </>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ground },
    title: { color: t.primary, fontSize: 26, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: t.secondary, fontSize: 14, marginBottom: 22 },

    emptyCard: {
      alignItems: 'center',
      gap: 10,
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      padding: 28,
    },
    emptyTitle: { color: t.inkSoft, fontSize: 15, fontWeight: '700' },
    emptyBody: { color: t.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },

    levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
    levelChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    levelChipOn: { backgroundColor: t.primary, borderColor: t.primary },
    levelChipText: { color: t.secondary, fontSize: 13, fontWeight: '600' },
    levelChipTextOn: { color: t.onPrimary, fontWeight: '700' },

    pairCard: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      padding: 16,
      marginBottom: 24,
    },
    pairRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pairHalf: { flex: 1 },
    pairPhoto: {
      width: '100%',
      aspectRatio: 3 / 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.primaryDim,
      backgroundColor: t.surfaceAlt,
    },
    pairLabel: {
      color: t.primary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.6,
      textAlign: 'center',
      marginTop: 8,
    },
    pairMeta: {
      color: t.muted,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 14,
    },

    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      backgroundColor: t.primary,
      borderRadius: 10,
      paddingVertical: 12,
      marginTop: 14,
    },
    shareButtonBusy: { opacity: 0.5 },
    shareButtonText: { color: t.onPrimary, fontWeight: '700', fontSize: 13 },

    stripTitle: {
      color: t.primaryDim,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    strip: { flexDirection: 'row', flexWrap: 'wrap', gap: STRIP_GAP },
    stripPhoto: { borderRadius: 8, backgroundColor: t.surfaceAlt },
    stripDay: { color: t.muted, fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 4 },

    previewBlock: { marginTop: 28, alignItems: 'center' },
    previewLabel: {
      color: t.primaryDim,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    previewFrame: { overflow: 'hidden', borderRadius: 10, borderWidth: 1, borderColor: t.border },

    captureHost: { position: 'absolute', top: -99999, left: -99999, width: TILE_SIZE, height: TILE_SIZE },
  });
