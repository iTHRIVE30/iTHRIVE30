import { forwardRef } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LOGO_CGE } from '../lib/brand';
import type { MontagePhoto } from '../lib/montageStore';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { Theme } from '../constants/theme';

/** Square, so it drops straight into a social post without being cropped. */
export const TILE_SIZE = 1080;

/**
 * The branded before-and-after tile a transformation gets shared as.
 *
 * Same construction as AcknowledgementTile: rendered at a fixed 1080x1080 off-screen and
 * captured with react-native-view-shot, so the shared PNG is identical on every device
 * regardless of screen size. The caller scales it down for the on-screen preview.
 *
 * The two photographs are given equal weight and equal size deliberately. Making the
 * "after" larger, or warming it, would be the app editorialising about someone's body -
 * the honest presentation is the same frame twice, and let the person decide what changed.
 */
const TransformationTile = forwardRef<
  View,
  { first: MontagePhoto; last: MontagePhoto; levelName: string; dayCount: number }
>(function TransformationTile({ first, last, levelName, dayCount }, ref) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View ref={ref} collapsable={false} style={styles.tile}>
      <View style={styles.inner}>
        <Image source={LOGO_CGE[t.logoTone]} style={styles.logo} resizeMode="contain" />

        <View style={styles.pair}>
          <View style={styles.half}>
            <Image source={{ uri: first.uri }} style={styles.photo} resizeMode="cover" />
            <Text style={styles.dayLabel}>DAY {first.day}</Text>
          </View>
          <View style={styles.gap} />
          <View style={styles.half}>
            <Image source={{ uri: last.uri }} style={styles.photo} resizeMode="cover" />
            <Text style={styles.dayLabel}>DAY {last.day}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.rule} />
          <Text style={styles.caption}>
            {levelName.toUpperCase()}  ·  {dayCount} {dayCount === 1 ? 'DAY' : 'DAYS'} RECORDED
          </Text>
          <Text style={styles.motto}>CHANGE  ·  GROW  ·  EVOLVE</Text>
        </View>
      </View>
    </View>
  );
});

export default TransformationTile;

const createStyles = (t: Theme) =>
  StyleSheet.create({
    tile: { width: TILE_SIZE, height: TILE_SIZE, backgroundColor: t.ground, padding: 44 },
    inner: {
      flex: 1,
      borderWidth: 3,
      borderColor: t.primary,
      borderRadius: 24,
      padding: 40,
      justifyContent: 'space-between',
    },
    logo: { width: 300, height: 120, alignSelf: 'center' },

    pair: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    half: { flex: 1 },
    gap: { width: 24 },
    photo: {
      width: '100%',
      aspectRatio: 3 / 4,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: t.primaryDim,
      backgroundColor: t.surface,
    },
    dayLabel: {
      color: t.primary,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: 4,
      textAlign: 'center',
      marginTop: 18,
    },

    footer: { alignItems: 'center' },
    rule: { width: 90, height: 3, backgroundColor: t.primary, marginBottom: 22 },
    caption: { color: t.inkSoft, fontSize: 26, fontWeight: '700', letterSpacing: 2, marginBottom: 14 },
    motto: { color: t.primaryDim, fontSize: 22, letterSpacing: 5, fontWeight: '700' },
  });
