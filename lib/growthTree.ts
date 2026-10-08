import {
  DAYS_PER_LEVEL,
  LEVELS,
  getChallengeResponses,
  getLevelDays,
  getLevelProgress,
  getLevelStartDate,
  isLevelComplete,
  isLevelUnlocked,
  type LevelDef,
} from './challengeStore';

/* ============================================================================
   THE GROWTH TREE — the Challenges tab. It grows as you do.

   It shows only what you have reached. Every challenge you have unlocked is on
   the path with its title; above the highest one sit OUTLINES_AHEAD faint, blank
   outlines - a hint that there is more to come, and nothing else. No names, no
   count, no map of everything still ahead.

   On a first day that is one challenge and two outlines. Answer Day 30 and the
   next challenge reveals itself where the first outline was, and a new blank
   outline appears above it (see the celebration in app/(tabs)/challenges.tsx).

   "Level" is an internal word only. The app shows each challenge by its title.

   The branching tree (a trunk, a fork at Level 4, then a branch per area of life)
   is set aside until content past Level 3 exists - there is nothing to branch to
   yet. When it is, the fork and branches belong here.
   ============================================================================ */

/** How many blank outlines sit above the highest challenge reached. */
export const OUTLINES_AHEAD = 2;

/**
 * complete: every day answered. current: started, still going (Day 30 may already be
 * answered with earlier days skipped). open: unlocked, waiting to be started.
 */
export type PathState = 'complete' | 'current' | 'open';

export type PathNode = {
  level: LevelDef;
  state: PathState;
  answered: number;
  total: number;
};

export type GrowthPath = {
  /** Reached challenges, first to latest. */
  revealed: PathNode[];
  /** How many faint outlines to draw above them. */
  outlines: number;
};

export async function getGrowthPath(): Promise<GrowthPath> {
  const responses = await getChallengeResponses();
  const revealed: PathNode[] = [];

  for (const level of LEVELS) {
    const total = getLevelDays(level.number).length;
    if (total === 0 || !(await isLevelUnlocked(level.number, responses))) break;
    const { completedContentDays: answered } = await getLevelProgress(level.number);
    const started = level.number === 1 || !!(await getLevelStartDate(level.number));
    const state: PathState = isLevelComplete(level.number, responses) ? 'complete' : started ? 'current' : 'open';
    // Counted against all 30 days, not just the ones written so far.
    revealed.push({ level, state, answered, total: DAYS_PER_LEVEL });
  }

  return {
    revealed,
    outlines: Math.max(0, Math.min(OUTLINES_AHEAD, LEVELS.length - revealed.length)),
  };
}
