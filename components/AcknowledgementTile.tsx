import { forwardRef } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Acknowledgement, formatAcknowledgementDate } from '../lib/acknowledgementStore';
import { LOGO_CGE } from '../lib/brand';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { Theme } from '../constants/theme';

/** Square, so it drops straight into a social post without being cropped. */
export const TILE_SIZE = 1080;

/**
 * The branded tile a self-acknowledgement gets shared as.
 *
 * Rendered at a fixed 1080x1080 and captured with react-native-view-shot, so what gets
 * shared is the same on every device regardless of screen size. It's laid out for capture,
 * not for the screen - the caller scales it down for the on-screen preview.
 *
 * NOTE: this follows the app theme, per the Eucalypt handoff, so a light-mode user shares
 * a light tile. That is a deliberate call and the one worth revisiting: the tile is a brand
 * artefact leaving the app, and two users posting the same programme will produce tiles
 * that look like different products. To pin it to the brand instead, swap `useTheme()` for
 * the imported `DarkTheme` - nothing else needs to change.
 */
const AcknowledgementTile = forwardRef<View, { entry: Acknowledgement }>(function AcknowledgementTile(
  { entry },
  ref
) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View ref={ref} collapsable={false} style={styles.tile}>
      <View style={styles.inner}>
        <Image source={LOGO_CGE[t.logoTone]} style={styles.logo} resizeMode="contain" />

        <View style={styles.body}>
          {!!entry.occasion && <Text style={styles.occasion}>{entry.occasion.toUpperCase()}</Text>}
          <Text style={styles.quoteMark}>“</Text>
          <Text style={styles.text} numberOfLines={9}>{entry.text}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.rule} />
          <Text style={styles.date}>{formatAcknowledgementDate(entry.createdAt)}</Text>
          <Text style={styles.motto}>CHANGE  ·  GROW  ·  EVOLVE</Text>
        </View>
      </View>
    </View>
  );
});

export default AcknowledgementTile;

const createStyles = (t: Theme) =>
  StyleSheet.create({
    tile: { width: TILE_SIZE, height: TILE_SIZE, backgroundColor: t.ground, padding: 56 },
    inner: {
      flex: 1,
      borderWidth: 3,
      borderColor: t.primary,
      borderRadius: 24,
      padding: 64,
      justifyContent: 'space-between',
    },
    logo: { width: 380, height: 150, alignSelf: 'center' },
    body: { flex: 1, justifyContent: 'center' },
    occasion: { color: t.primary, fontSize: 30, fontWeight: '800', letterSpacing: 5, marginBottom: 28 },
    quoteMark: { color: t.primary, fontSize: 150, lineHeight: 150, height: 96, fontWeight: '700', opacity: 0.5 },
    text: { color: t.ink, fontSize: 62, lineHeight: 84, fontWeight: '600', fontStyle: 'italic' },
    footer: { alignItems: 'center' },
    rule: { width: 90, height: 3, backgroundColor: t.primary, marginBottom: 26 },
    date: { color: t.secondaryDim, fontSize: 30, marginBottom: 14 },
    motto: { color: t.primaryDim, fontSize: 24, letterSpacing: 5, fontWeight: '700' },
  });
