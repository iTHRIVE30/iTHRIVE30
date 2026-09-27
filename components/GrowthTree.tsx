import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { Theme } from '../constants/theme';
import { getGrowthPath, type GrowthPath, type PathNode, type PathState } from '../lib/growthTree';

/* ============================================================================
   THE GROWTH TREE — the whole of the Challenges tab's front page.

   Grows upward like a tree: roots at the bottom, the first challenge above
   them, each later challenge above that, and faint blank outlines at the top.
   Only what the user has reached is named - see lib/growthTree.ts.

   `revealLevel` plays the reveal: that challenge fades up out of its outline and
   the new blank outline above it appears. `refreshKey` re-reads the path without
   leaving the screen (after a Day 30 is answered).
   ============================================================================ */

const NODE_H = 86;
const STEM_H = 26;

export default function GrowthTree({
  onOpenLevel,
  revealLevel,
  refreshKey = 0,
  banner,
}: {
  onOpenLevel?: (levelNumber: number) => void;
  revealLevel?: number | null;
  refreshKey?: number;
  /** Shown above the tree - the celebration card after a Day 30. */
  banner?: ReactNode;
}) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const [path, setPath] = useState<GrowthPath | null>(null);

  const load = useCallback(() => {
    let alive = true;
    getGrowthPath()
      .then((p) => { if (alive) setPath(p); })
      .catch(() => { if (alive) setPath({ revealed: [], outlines: 0 }); });
    return () => { alive = false; };
  }, []);

  useFocusEffect(load);
  useEffect(load, [refreshKey, load]);

  // The reveal: 0 = still an outline, 1 = fully there.
  const [reveal] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!revealLevel || !path?.revealed.some((n) => n.level.number === revealLevel)) return;
    reveal.setValue(0);
    Animated.sequence([
      Animated.delay(700),
      Animated.timing(reveal, { toValue: 1, duration: 1600, useNativeDriver: true }),
    ]).start();
  }, [revealLevel, path, reveal]);

  if (!path) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }

  // Top of the screen is the top of the tree: outlines, then the latest challenge down to the first.
  const nodes = [...path.revealed].reverse();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {banner}

      <View style={styles.header}>
        <Text style={styles.kicker}>EDUCATE · ENHANCE · ENLIGHTEN</Text>
        <Text style={styles.title}>Your Growth Tree</Text>
        <Text style={styles.line}>Every challenge you finish becomes part of who you are.</Text>
      </View>

      <View style={styles.tree}>
        {Array.from({ length: path.outlines }, (_, i) => {
          // The lowest outline is the one a just-revealed challenge left behind, so the
          // newest blank space is the topmost one - it fades in with the reveal.
          const isNew = !!revealLevel && i === 0;
          return (
            <Animated.View key={`outline-${i}`} style={[styles.item, isNew && { opacity: reveal }]}>
              <View style={styles.outline} />
              <View style={[styles.stem, styles.stemFaint]} />
            </Animated.View>
          );
        })}

        {nodes.map((node) => {
          const revealing = node.level.number === revealLevel;
          return (
            <View key={node.level.id} style={styles.item}>
              <View style={{ width: '100%' }}>
                {/* The outline it grows out of stays underneath while it reveals. */}
                {revealing && <View style={[styles.outline, StyleSheet.absoluteFill]} />}
                <Animated.View
                  style={
                    revealing
                      ? {
                          opacity: reveal,
                          transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
                        }
                      : undefined
                  }
                >
                  <NodeCard node={node} onPress={onOpenLevel ? () => onOpenLevel(node.level.number) : undefined} />
                </Animated.View>
              </View>
              <View style={styles.stem} />
            </View>
          );
        })}

        {/* Roots. */}
        <Svg width={220} height={70} pointerEvents="none">
          {[-1, -0.5, 0, 0.5, 1].map((spread, i) => (
            <Path
              key={`root-${i}`}
              d={`M 110 0 C ${110 + spread * 30} 24 ${110 + spread * 60} 34 ${110 + spread * 90} 62`}
              stroke={t.primaryDim}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
              opacity={0.55}
            />
          ))}
        </Svg>
        <Text style={styles.motto}>CHANGE · GROW · EVOLVE</Text>
      </View>

      <Text style={styles.credit}>
        The knowledge in every challenge is developed and produced by Bondi Project Global.
      </Text>
    </ScrollView>
  );
}

function NodeCard({ node, onPress }: { node: PathNode; onPress?: () => void }) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const s = node.state;
  const status =
    s === 'complete' ? 'Complete' : s === 'open' ? 'Ready when you are' : `${node.answered} of ${node.total} days`;
  return (
    <Pressable style={[styles.node, nodeStyle(t, s)]} onPress={onPress} disabled={!onPress}>
      <Text style={[styles.nodeTitle, { color: s === 'complete' ? t.onPrimary : t.ink }]} numberOfLines={2}>
        {node.level.name}
      </Text>
      <Text style={[styles.nodeStatus, { color: s === 'complete' ? t.onPrimary : t.primary }]}>{status}</Text>
    </Pressable>
  );
}

function nodeStyle(t: Theme, s: PathState) {
  switch (s) {
    case 'complete': return { backgroundColor: t.primary, borderColor: t.primary };
    case 'current': return { backgroundColor: t.primaryTint, borderColor: t.primary };
    default: return { backgroundColor: t.surface, borderColor: t.primary };
  }
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.ground },
    content: { paddingHorizontal: 20, paddingBottom: 48 },
    loading: { flex: 1, backgroundColor: t.ground, alignItems: 'center', justifyContent: 'center' },

    header: { alignItems: 'center', paddingTop: 12, paddingBottom: 26 },
    kicker: { color: t.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2.2, textAlign: 'center' },
    title: { color: t.ink, fontSize: 28, fontWeight: '700', marginTop: 12 },
    line: { color: t.secondary, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 10, maxWidth: 320 },

    tree: { alignItems: 'center' },
    item: { width: '100%', maxWidth: 340, alignItems: 'center' },
    node: {
      width: '100%', height: NODE_H, borderWidth: 2, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 6,
    },
    nodeTitle: { fontSize: 19, fontWeight: '700', textAlign: 'center' },
    nodeStatus: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    outline: {
      width: '100%', height: NODE_H, borderWidth: 2, borderStyle: 'dashed', borderRadius: 12,
      borderColor: t.primaryDim, opacity: 0.35,
    },
    stem: { width: 8, height: STEM_H, borderRadius: 4, backgroundColor: t.primary },
    stemFaint: { backgroundColor: t.primaryDim, opacity: 0.3 },
    motto: { color: t.primaryDim, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 6 },

    credit: { color: t.secondaryDim, fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 28, paddingHorizontal: 12 },
  });
