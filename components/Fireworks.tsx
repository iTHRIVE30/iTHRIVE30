import { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, useWindowDimensions } from 'react-native';

const COLORS = ['#D4AF37', '#FFFFFF', '#8a7433', '#F0D385'];
const PARTICLE_COUNT = 26;

/**
 * Fires a burst of particles from the center of the screen whenever `trigger` changes
 * to a new non-zero value. Bump a counter in state and pass it in to fire again.
 */
export default function Fireworks({ trigger }: { trigger: number }) {
  // Read the size per render, not once at module load. A module-scope Dimensions.get()
  // is captured before the first render and never updates, so the burst would fire from
  // the wrong place after a rotation, on a foldable, or in iPad split view.
  const { width, height } = useWindowDimensions();

  // Lazy state initialiser, not useRef(...) - the particle shapes are randomised, and calling
  // Math.random() straight in the render body is impure (React Compiler flags it). A lazy
  // initialiser runs exactly once, which is what we actually want here.
  const [particles] = useState(() =>
    Array.from({ length: PARTICLE_COUNT }, () => ({
      anim: new Animated.Value(0),
      angle: Math.random() * Math.PI * 2,
      distance: 90 + Math.random() * 140,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 6,
    }))
  );

  const lastTrigger = useRef(0);

  useEffect(() => {
    if (trigger === 0 || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    particles.forEach((p) => p.anim.setValue(0));
    Animated.stagger(
      8,
      particles.map((p) =>
        Animated.timing(p.anim, { toValue: 1, duration: 900, useNativeDriver: true })
      )
    ).start();
  }, [trigger, particles]);

  if (trigger === 0) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p, i) => {
        const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.distance] });
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * p.distance] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                top: height / 2,
                left: width / 2,
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateX }, { translateY }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute' },
});
