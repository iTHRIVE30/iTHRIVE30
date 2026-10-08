import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LogoTone, logoSequence } from '../lib/brand';
import { DarkTheme } from '../constants/theme';

// The opening sequence stays on the brand palette in BOTH themes, deliberately.
//
// The native splash that runs before any JS is a fixed black image and cannot follow a
// user setting, so a light-mode splash here would flash black -> ivory -> app on every
// launch. Holding the dark brand for the two seconds of the sequence is the better trade,
// and the gold ring on black is the brand moment.
const GOLD = DarkTheme.primary;
const BLACK = DarkTheme.ground;
const TRACK = '#241f0c'; // dark gold, a shade off primaryTint - kept exact

const LOGO_SIZE = 240;
const RING_SIZE = 288;
const RING_STROKE = 3;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** How long the ring takes to sweep 0 -> 100%, and how long the whole thing fades out after. */
const SWEEP_MS = 2200;
const FADE_MS = 420;
/** Longest the ring waits on `holdUntil` before letting the app open regardless. */
export const HOLD_LIMIT_MS = 8000;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Opening sequence: a gold ring sweeps around the logo, and the lockup underneath changes
 * as it fills — mark (0-33%), "your next best self is here" (33-66%), "change | grow |
 * evolve" (66-100%). All three lockups share the same artboard, so only the tagline
 * appears to change.
 *
 * `onDone` fires once the sweep and the fade-out have both finished. If `holdUntil` is
 * given, the sequence waits for it to resolve before fading out — so the ring reaching
 * 100% genuinely means "ready", rather than being a fixed animation the app races.
 */
export default function SplashLoader({
  onDone,
  holdUntil,
  tone = 'onDark',
}: {
  onDone: () => void;
  holdUntil?: Promise<unknown>;
  tone?: LogoTone;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const finished = useRef(false);
  // Held in a ref so a new `onDone` from the parent never restarts the effect below. It
  // used to be a dependency: the parent re-rendered mid-fade, the cleanup cancelled the
  // fade's callback, `finished` stopped the rerun, and the ring sat on screen forever.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let cancelled = false;

    const sweep = new Promise<void>((resolve) => {
      Animated.timing(progress, {
        toValue: 1,
        duration: SWEEP_MS,
        easing: Easing.inOut(Easing.cubic),
        // The SVG stroke and the tagline opacities are JS-driven props, so the native
        // driver isn't available here. One value animating for ~2s is cheap.
        useNativeDriver: false,
      }).start(() => resolve());
    });

    // Wait for the animation AND any real work, whichever takes longer - but never forever.
    // A storage read that never settles must not trap someone on the loading ring.
    const hold = Promise.race([
      holdUntil ?? Promise.resolve(),
      new Promise<void>((resolve) => setTimeout(resolve, HOLD_LIMIT_MS)),
    ]);
    Promise.all([sweep, hold])
      .catch(() => {})
      .then(() => {
        if (cancelled || finished.current) return;
        finished.current = true;
        Animated.timing(fade, {
          toValue: 0,
          duration: FADE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          if (!cancelled) onDoneRef.current();
        });
      });

    return () => {
      cancelled = true;
    };
  }, [progress, fade, holdUntil]);

  const [markSrc, isHereSrc, cgeSrc] = logoSequence(tone);

  // Each lockup fades in as the ring crosses its third, and out again as the next takes
  // over. The short overlap either side of the hand-off is what keeps it smooth.
  const markOpacity = progress.interpolate({
    inputRange: [0, 0.27, 0.36],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });
  const isHereOpacity = progress.interpolate({
    inputRange: [0.27, 0.36, 0.60, 0.69],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });
  const cgeOpacity = progress.interpolate({
    inputRange: [0.60, 0.69, 1],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fade }]} pointerEvents="auto">
      <View style={styles.stage}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={TRACK}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={GOLD}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            // Start the sweep at 12 o'clock instead of 3 o'clock.
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>

        <View style={styles.logoWrap}>
          <Animated.Image source={markSrc} style={[styles.logo, { opacity: markOpacity }]} resizeMode="contain" />
          <Animated.Image source={isHereSrc} style={[styles.logo, { opacity: isHereOpacity }]} resizeMode="contain" />
          <Animated.Image source={cgeSrc} style={[styles.logo, { opacity: cgeOpacity }]} resizeMode="contain" />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: BLACK, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  stage: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { width: LOGO_SIZE, height: LOGO_SIZE, alignItems: 'center', justifyContent: 'center' },
  // All three stacked in the same spot so only the tagline appears to change.
  logo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: LOGO_SIZE, height: LOGO_SIZE },
});
