import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { Theme } from '../constants/theme';
import {
  getGrowthTreeState,
  type GrowthTreeState,
  type NodeState,
  type TreeNode,
} from '../lib/growthTree';

/* ============================================================================
   THE GROWTH TREE

   One picture of the whole programme: the trunk everybody climbs, the fork, and
   the branches above it — one branch per area of life. It fills in as the user
   actually does the work, so it reads as growth over time rather than as a map.

   NOTHING HERE IS HARDCODED TO THREE BRANCHES OR FOUR RUNGS. Every coordinate
   is computed from lib/growthTree.ts, so changing which levels are allocated to
   which branch — or adding a branch, or giving one branch more levels than
   another — redraws the tree correctly with no change to this file.

   The tree grows upward, exactly as a tree does: roots and Level 1 at the
   bottom, canopy at the top. You scroll down through it from canopy to roots.

   It follows the theme like any other screen. In dark mode that is the brand
   black and gold of the design sheet; in light mode it is Eucalypt.
   ============================================================================ */

// Layout constants. These are sizes, not structure — the structure comes from the data.
const PAD = 16;
const COL_MIN = 112; // narrowest a branch column may get before the canopy scrolls sideways
const RUNG_H = 64;
const RUNG_GAP = 10;
const LABEL_H = 34;
const BOUGH_H = 88;
const FORK_H = 104;
const TRUNK_H = 84;
const TRUNK_GAP = 22;
const ROOTS_H = 104;

const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'];

/** A level whose name is still just "Level 7" has not been named yet. */
function isUnnamed(node: TreeNode): boolean {
  return /^Level \d+$/.test(node.level.name);
}

/**
 * Rendered as the "Growth Tree" view of the Challenges tab rather than as its own screen,
 * so it is the same levels, one tap from the list. Tapping an open trunk level opens it.
 */
export default function GrowthTree({ onOpenLevel }: { onOpenLevel?: (levelNumber: number) => void }) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();

  const [state, setState] = useState<GrowthTreeState | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getGrowthTreeState()
        .then((s) => { if (alive) setState(s); })
        .catch(() => { if (alive) setState(null); });
      return () => { alive = false; };
    }, [])
  );

  if (!state) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }

  const branchCount = state.branches.length;
  const maxRungs = state.branches.reduce((m, b) => Math.max(m, b.nodes.length), 0);

  // The canopy gets as wide as it needs to be. If the branches won't fit at a
  // readable width, the whole tree scrolls sideways rather than being squeezed.
  const colW = branchCount > 0 ? Math.max(COL_MIN, (width - PAD * 2) / branchCount) : width;
  const canvasW = Math.max(width, PAD * 2 + colW * branchCount);

  // --- Vertical layout, top (canopy) to bottom (roots) ---
  const canopyTop = 0;
  const rowY = (r: number) => canopyTop + r * (RUNG_H + RUNG_GAP);
  const canopyBottom = maxRungs > 0 ? rowY(maxRungs - 1) + RUNG_H : canopyTop;

  const labelY = canopyBottom + 14;
  const boughTop = labelY + LABEL_H + 10;
  const forkTop = boughTop + BOUGH_H;

  const trunkTop = forkTop + FORK_H + TRUNK_GAP;
  const trunkNodeY = (i: number) => trunkTop + i * (TRUNK_H + TRUNK_GAP);
  // The trunk reads downward from the highest level to Level 1.
  const trunkDescending = [...state.trunk].reverse();
  const trunkBottom =
    trunkDescending.length > 0
      ? trunkNodeY(trunkDescending.length - 1) + TRUNK_H
      : trunkTop;

  const rootsTop = trunkBottom + 20;
  const canvasH = rootsTop + ROOTS_H;

  const centreX = canvasW / 2;
  const colCentre = (i: number) => PAD + colW * (i + 0.5);

  // Card geometry inside a column, with a gutter so neighbouring cards breathe.
  const cardW = colW - 12;
  const cardX = (i: number) => colCentre(i) - cardW / 2;

  const forkW = Math.min(canvasW - PAD * 2, 320);
  const trunkW = Math.min(canvasW - PAD * 2, 340);

  // How far up the shared climb the trunk has actually filled.
  const trunkLineTop = forkTop + FORK_H / 2;
  const trunkLineBottom = trunkBottom;
  const trunkLineLen = trunkLineBottom - trunkLineTop;
  const trunkFilledTop = trunkLineBottom - trunkLineLen * state.trunkFraction;

  const limbColour = state.branchesOpen ? t.primary : t.primaryDim;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>CHANGE · GROW · EVOLVE</Text>
        <Text style={styles.title}>The Growth Tree</Text>
        <Text style={styles.blurb}>
          One trunk everybody climbs, then the tree divides. Every branch is an area of your
          life, and it fills in as you do the work.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ width: canvasW }}
      >
        <View style={{ width: canvasW, height: canvasH }}>
          {/* The limbs sit behind every card. */}
          <Svg
            width={canvasW}
            height={canvasH}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {/* Roots, spreading below Level 1. */}
            {[-1, -0.5, 0, 0.5, 1].map((spread, i) => (
              <Path
                key={`root-${i}`}
                d={`M ${centreX} ${trunkBottom} C ${centreX + spread * 40} ${trunkBottom + 34} ${
                  centreX + spread * 70
                } ${trunkBottom + 46} ${centreX + spread * 96} ${rootsTop + ROOTS_H - 26}`}
                stroke={t.primaryDim}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
                opacity={0.55}
              />
            ))}

            {/* The trunk: the unfilled length, then the filled length over it. */}
            <Path
              d={`M ${centreX} ${trunkLineBottom} L ${centreX} ${trunkLineTop}`}
              stroke={t.primaryDim}
              strokeWidth={10}
              strokeLinecap="round"
              fill="none"
              opacity={0.45}
            />
            {state.trunkFraction > 0 && (
              <Path
                d={`M ${centreX} ${trunkLineBottom} L ${centreX} ${trunkFilledTop}`}
                stroke={t.primary}
                strokeWidth={10}
                strokeLinecap="round"
                fill="none"
              />
            )}

            {/* The boughs: the fork opening into however many branches there are. */}
            {state.branches.map((b, i) => (
              <Path
                key={`bough-${b.branch.id}`}
                d={`M ${centreX} ${boughTop + BOUGH_H} C ${centreX} ${boughTop + BOUGH_H / 2} ${
                  colCentre(i)
                } ${boughTop + BOUGH_H / 2} ${colCentre(i)} ${boughTop}`}
                stroke={limbColour}
                strokeWidth={7}
                strokeLinecap="round"
                fill="none"
                opacity={state.branchesOpen ? 1 : 0.5}
              />
            ))}

            {/* Each branch's own stem, running up behind its rungs. It starts at the
                bottom of the canopy, not at the bough tip, so it never crosses the
                branch name sitting in the gap between the two. */}
            {state.branches.map((b, i) => {
              const topRow = maxRungs - b.nodes.length;
              return (
                <Path
                  key={`stem-${b.branch.id}`}
                  d={`M ${colCentre(i)} ${canopyBottom} L ${colCentre(i)} ${rowY(topRow)}`}
                  stroke={limbColour}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeDasharray="2 14"
                  fill="none"
                  opacity={state.branchesOpen ? 0.9 : 0.45}
                />
              );
            })}

            <Circle cx={centreX} cy={boughTop + BOUGH_H} r={11} fill={limbColour} />
          </Svg>

          {/* --- Canopy: one column per branch, bottom-aligned so every branch
                  starts its climb on the same rung. --- */}
          {state.branches.map((b, i) =>
            b.nodes.map((node, j) => {
              // j counts up the branch; the first level climbed sits on the
              // bottom rung, so it draws at the last row.
              const row = maxRungs - 1 - j;
              return (
                <View
                  key={node.level.id}
                  style={[
                    styles.rung,
                    rungStyle(t, node.state),
                    { left: cardX(i), top: rowY(row), width: cardW, height: RUNG_H },
                  ]}
                >
                  <Text style={[styles.rungOrdinal, ordinalStyle(t, node.state)]}>
                    {(ORDINALS[j] ?? `#${j + 1}`).toUpperCase()}
                  </Text>
                  <Text
                    style={[styles.rungName, rungNameStyle(t, node.state)]}
                    numberOfLines={2}
                  >
                    {isUnnamed(node) ? 'Locked' : node.level.name}
                  </Text>
                </View>
              );
            })
          )}

          {/* Branch names. */}
          {state.branches.map((b, i) => (
            <View
              key={`label-${b.branch.id}`}
              style={[styles.branchLabel, { left: cardX(i), top: labelY, width: cardW }]}
            >
              <Text style={styles.branchLabelText} numberOfLines={2}>
                {b.branch.name}
              </Text>
              {b.fraction > 0 && (
                <Text style={styles.branchPct}>{Math.round(b.fraction * 100)}%</Text>
              )}
            </View>
          ))}

          {/* The fork. */}
          <View
            style={[
              styles.forkCard,
              { left: centreX - forkW / 2, top: forkTop, width: forkW, height: FORK_H },
            ]}
          >
            <Text style={styles.forkKicker}>
              LEVEL {state.fork.level.number} · THE FORK
            </Text>
            <Text style={styles.forkName} numberOfLines={1}>
              {isUnnamed(state.fork) ? 'Name to come' : state.fork.level.name}
            </Text>
            <Text style={styles.forkSub}>
              {state.branchesOpen
                ? 'The trunk is behind you. Every branch is open.'
                : 'The trunk ends here. Then the branches open.'}
            </Text>
          </View>

          {/* The trunk levels, highest first. */}
          {trunkDescending.map((node, i) => (
            <Pressable
              key={node.level.id}
              disabled={!onOpenLevel || node.state === 'locked'}
              onPress={() => onOpenLevel?.(node.level.number)}
              style={[
                styles.trunkCard,
                trunkCardStyle(t, node.state),
                { left: centreX - trunkW / 2, top: trunkNodeY(i), width: trunkW, height: TRUNK_H },
              ]}
            >
              <Text style={[styles.trunkKicker, trunkKickerStyle(t, node.state)]}>
                LEVEL {node.level.number} · {node.state === 'complete' ? 'COMPLETE' : `${Math.round(node.fraction * 100)}%`}
              </Text>
              <Text
                style={[styles.trunkName, trunkNameStyle(t, node.state)]}
                numberOfLines={2}
              >
                {node.level.name}
              </Text>
            </Pressable>
          ))}

          {/* Roots. */}
          <View style={[styles.roots, { top: rootsTop + ROOTS_H - 22, width: canvasW }]}>
            <Text style={styles.rootsText}>THE ROOTS · WHERE EVERYONE STARTS</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerHeading}>How the tree grows</Text>
        <Step n={1} title="The trunk runs in order">
          {`Levels ${state.trunk.map((n) => n.level.number).join(', ')}, in order. Everybody climbs the same trunk and arrives at the fork with the same language.`}
        </Step>
        <Step n={2} title={`Level ${state.fork.level.number} divides into ${branchCount}`}>
          Finishing the trunk opens every branch. You take one at a time, and the rest stay
          open and waiting.
        </Step>
        <Step n={3} title="Each branch is a climb">
          The first level on a branch is open the moment you choose it. Each one after opens
          when the one below is finished.
        </Step>
        <Step n={4} title="Every branch you finish stays yours">
          A finished branch stays finished. Coming back to start another begins at its first,
          with the trunk already behind you.
        </Step>

        <View style={styles.openNote}>
          <Text style={styles.openNoteLabel}>STILL OPEN</Text>
          <Text style={styles.openNoteText}>
            What the branches are called, and what the levels above the fork are, is still
            being decided. The tree draws whatever gets allocated to each branch.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.step}>
      <Text style={styles.stepNum}>{n}</Text>
      <View style={styles.stepBody}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepText}>{children}</Text>
      </View>
    </View>
  );
}

// --- State-dependent colouring. Kept as functions so the token layer stays the
//     only place a colour is named. ---

function rungStyle(t: Theme, s: NodeState) {
  switch (s) {
    case 'complete': return { backgroundColor: t.primary, borderColor: t.primary, borderStyle: 'solid' as const };
    case 'current': return { backgroundColor: t.primaryTint, borderColor: t.primary, borderStyle: 'solid' as const };
    case 'open': return { backgroundColor: t.surface, borderColor: t.primaryDim, borderStyle: 'solid' as const };
    default: return { backgroundColor: t.surface, borderColor: t.primaryDim, borderStyle: 'dashed' as const };
  }
}
function ordinalStyle(t: Theme, s: NodeState) {
  return { color: s === 'complete' ? t.onPrimary : s === 'locked' ? t.primaryDim : t.primary };
}
function rungNameStyle(t: Theme, s: NodeState) {
  return { color: s === 'complete' ? t.onPrimary : s === 'locked' ? t.secondary : t.ink };
}
function trunkCardStyle(t: Theme, s: NodeState) {
  switch (s) {
    case 'complete': return { backgroundColor: t.primary, borderColor: t.primary };
    case 'current': return { backgroundColor: t.primaryTint, borderColor: t.primary };
    default: return { backgroundColor: t.surface, borderColor: t.border };
  }
}
function trunkKickerStyle(t: Theme, s: NodeState) {
  return { color: s === 'complete' ? t.onPrimary : t.primary };
}
function trunkNameStyle(t: Theme, s: NodeState) {
  return { color: s === 'complete' ? t.onPrimary : t.ink };
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.ground },
    screenContent: { paddingBottom: 48 },
    loading: { flex: 1, backgroundColor: t.ground, alignItems: 'center', justifyContent: 'center' },


    header: { paddingHorizontal: PAD, paddingTop: 22, paddingBottom: 26, alignItems: 'center' },
    kicker: { color: t.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2.4 },
    title: { color: t.ink, fontSize: 28, fontWeight: '700', letterSpacing: 0.5, marginTop: 12 },
    blurb: {
      color: t.secondary,
      fontSize: 14,
      lineHeight: 22,
      textAlign: 'center',
      marginTop: 10,
      maxWidth: 340,
    },

    rung: {
      position: 'absolute',
      borderWidth: 2,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      gap: 4,
    },
    rungOrdinal: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
    rungName: { fontSize: 13, fontWeight: '700', textAlign: 'center' },

    branchLabel: { position: 'absolute', alignItems: 'center', height: LABEL_H, gap: 2 },
    branchLabelText: {
      color: t.primaryDim,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textAlign: 'center',
    },
    branchPct: { color: t.primary, fontSize: 11, fontWeight: '700' },

    forkCard: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: t.primary,
      borderRadius: 10,
      backgroundColor: t.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      gap: 5,
    },
    forkKicker: { color: t.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
    forkName: { color: t.ink, fontSize: 20, fontWeight: '700' },
    forkSub: { color: t.secondary, fontSize: 12, lineHeight: 18, textAlign: 'center' },

    trunkCard: {
      position: 'absolute',
      borderWidth: 2,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      gap: 6,
    },
    trunkKicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
    trunkName: { fontSize: 19, fontWeight: '700', textAlign: 'center' },

    roots: { position: 'absolute', left: 0, alignItems: 'center' },
    rootsText: { color: t.primaryDim, fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },

    footer: { paddingHorizontal: PAD, paddingTop: 34, gap: 18 },
    footerHeading: { color: t.ink, fontSize: 18, fontWeight: '700' },
    step: { flexDirection: 'row', gap: 14 },
    stepNum: {
      color: t.primary,
      fontSize: 13,
      fontWeight: '700',
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: t.primaryTintBorder,
      backgroundColor: t.primaryTint,
      textAlign: 'center',
      lineHeight: 24,
    },
    stepBody: { flex: 1, gap: 4 },
    stepTitle: { color: t.inkSoft, fontSize: 15, fontWeight: '700' },
    stepText: { color: t.secondary, fontSize: 14, lineHeight: 22 },

    openNote: {
      marginTop: 6,
      padding: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surfaceSunken,
      gap: 8,
    },
    openNoteLabel: { color: t.primaryDim, fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
    openNoteText: { color: t.secondary, fontSize: 13, lineHeight: 21 },
  });
