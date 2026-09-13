import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Animated, Easing, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { DailyHeroContent } from '../lib/dailyHero';
import { LOGO_CGE } from '../lib/brand';

const GOLD = '#D4AF37';
const BLACK = '#0B0B0B';

/**
 * The once-a-day welcome: the day's picture, the day's challenge quote over it, and a way
 * in. Shown after the loading sequence on the first open of each calendar day.
 *
 * Everything here degrades: no picture falls back to black, no quote falls back to the
 * brand line. It should never be the reason someone can't get into the app.
 */
export default function DailyHero({
  content,
  onDismiss,
}: {
  content: DailyHeroContent;
  onDismiss: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const [enter] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 900,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  const dismiss = () => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  const rise = enter.interpolate({ inputRange: [0, 1], outputRange: [26, 0] });
  const hasQuote = !!content.quote;
  // A byline means it's a quotation - set it in quote marks. Without one it's one of the
  // app's own first-person affirmations, which reads better plain than in someone else's
  // quotation marks.
  const isQuotation = hasQuote && !!content.attribution;

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      {content.image !== null && (
        <Image source={content.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}

      {/* Scrim: dark at both ends so the logo and the quote stay readable over any photo.
          Drawn with react-native-svg, which is already a dependency - no gradient library. */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="heroScrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={BLACK} stopOpacity="0.92" />
            <Stop offset="0.34" stopColor={BLACK} stopOpacity="0.45" />
            <Stop offset="0.62" stopColor={BLACK} stopOpacity="0.72" />
            <Stop offset="1" stopColor={BLACK} stopOpacity="0.97" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#heroScrim)" />
      </Svg>

      <View style={styles.content}>
        <Animated.View style={{ opacity: enter, transform: [{ translateY: rise }] }}>
          <Image source={LOGO_CGE.onDark} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        <Animated.View style={[styles.middle, { opacity: enter, transform: [{ translateY: rise }] }]}>
          {!!content.levelName && (
            <Text style={styles.eyebrow}>
              {content.levelName.toUpperCase()}
              {content.levelDay > 0 ? `  ·  DAY ${content.levelDay}` : ''}
            </Text>
          )}

          {isQuotation && <Text style={styles.quoteMark}>“</Text>}

          <Text style={[styles.quote, !isQuotation && styles.affirmation]}>
            {hasQuote ? content.quote : 'Your next best self awaits.'}
          </Text>

          {!!content.attribution && <Text style={styles.attribution}>— {content.attribution}</Text>}

          {!!content.challengeTitle && (
            <View style={styles.titleRow}>
              <View style={styles.rule} />
              <Text style={styles.challengeTitle}>{content.challengeTitle}</Text>
            </View>
          )}
          {!!content.theme && <Text style={styles.theme}>{content.theme}</Text>}
        </Animated.View>

        <Animated.View style={{ opacity: enter, transform: [{ translateY: rise }] }}>
          <Pressable style={styles.button} onPress={dismiss}>
            <Text style={styles.buttonText}>Begin Today</Text>
            <Ionicons name="arrow-forward" size={17} color={BLACK} />
          </Pressable>
          <Text style={styles.motto}>Change  ·  Grow  ·  Evolve</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: BLACK, zIndex: 90 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 78, paddingBottom: 54, justifyContent: 'space-between' },
  logo: { width: 190, height: 76, alignSelf: 'center' },

  middle: { flex: 1, justifyContent: 'center', paddingBottom: 20 },
  eyebrow: { color: GOLD, fontSize: 11, fontWeight: '800', letterSpacing: 2.2, marginBottom: 18 },
  quoteMark: { color: GOLD, fontSize: 62, lineHeight: 62, height: 40, fontWeight: '700', opacity: 0.55 },
  quote: { color: '#fff', fontSize: 26, lineHeight: 36, fontWeight: '600', fontStyle: 'italic' },
  // Affirmations are the user's own words, so they're set upright rather than as a citation.
  affirmation: { fontStyle: 'normal', fontSize: 28, lineHeight: 38 },
  attribution: { color: GOLD, fontSize: 13, fontWeight: '700', letterSpacing: 0.6, marginTop: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 26 },
  rule: { width: 26, height: 2, backgroundColor: GOLD },
  challengeTitle: { color: GOLD, fontSize: 15, fontWeight: '700', flex: 1 },
  theme: { color: '#b9b9b9', fontSize: 13, marginTop: 6, marginLeft: 36 },

  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16 },
  buttonText: { color: BLACK, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  motto: { color: '#7a7a7a', fontSize: 11, letterSpacing: 1.6, textAlign: 'center', marginTop: 16, textTransform: 'uppercase' },
});
