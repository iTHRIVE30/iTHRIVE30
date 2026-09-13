// Public API for the badges system. Screens import from here only.
//
// Everything is derived from data that already exists on the device - the habit log,
// reflections, challenge responses and goals. There is no ledger to keep in sync and
// nothing to migrate. Open Wins and the whole thing is recomputed.
//
// **There are no points.** An earlier version scored every badge, multiplied the total by
// your Level, and dangled merch behind point thresholds. That was dropped deliberately: it
// pointed attention at an external scoreboard instead of at the work. What a badge gives
// you now is a sentence about what you actually did - "that's 200 days, which is roughly
// $2,860 you haven't spent on alcohol" - and, at the tiers that take months, a nudge to
// mark it yourself. Self-validation, not a currency.
//
// Completing a Challenge day is still not an award. It fires the confetti and nothing else.

import { ACHIEVEMENTS } from './data';
import { buildRewardContext } from './context';
import { evaluateRule } from './evaluate';
import { encouragementFor } from './encouragement';
import { Achievement, AchievementStatus, BadgeSummary } from './types';
import { recordEarnedAchievements } from '../rewardEvents';

export * from './types';
export { ACHIEVEMENTS } from './data';
export { CORE_HABIT_IDS, CUSTOM_HABIT_IDS } from './context';
export { encouragementFor, PAYOFF_ASSUMPTIONS } from './encouragement';

/** Display order for the category sections in Wins. */
export const CATEGORY_ORDER = [
  'Daily Streak',
  'Habit Mastery',
  'Reflection & Mindset',
  'Combo & Multi-Habit',
  'Challenge & Program',
  'Compound Growth',
  'Goals & My Journey',
  'Mood & Emotional Growth',
  'Resilience & Comeback',
  'Meta & App Engagement',
  'Personalization',
  'Seasonal & Special',
  'Selfie & Transformation',
  'Social & Team',
];

/**
 * Weight above which a badge counts as a real milestone rather than a step along the way.
 * Chosen from the spreadsheet's own difficulty curve - it lands on the badges that take
 * months (long streaks, finished Levels, 100+ day habits, achieved goals) and leaves the
 * early-tier ones out of Wins.
 */
const MAJOR_WEIGHT = 600;

export function significanceOf(achievement: Achievement): 'minor' | 'major' {
  return achievement.points >= MAJOR_WEIGHT ? 'major' : 'minor';
}

export function sortCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
  });
}

/**
 * Every badge's status plus the headline counts.
 *
 * Cost is one pass over the habit log plus two AsyncStorage round trips, then 357 cheap
 * predicate checks. Safe to call on every focus of the Wins tab.
 */
export async function getBadgeSummary(): Promise<BadgeSummary> {
  const ctx = await buildRewardContext();

  // Anything earned before stays earned. A few rules describe a state rather than a total -
  // "3 or more active goals at the same time", "a goal held 12+ months" - and those stop
  // being true the moment the user succeeds at them. Nobody should lose a badge for
  // finishing a goal.
  const previouslyEarned = new Set(ctx.events.earnedAchievementIds);

  const statuses: AchievementStatus[] = ACHIEVEMENTS.map((achievement) => {
    const { current, target } = evaluateRule(achievement.rule, ctx);
    const safeTarget = target > 0 ? target : 1;
    const meetsNow = current >= safeTarget;
    // `manual` badges are never sticky - if one becomes buildable later, its rule changes
    // and it earns honestly rather than being grandfathered in.
    const lockedReason = achievement.rule.kind === 'manual' ? achievement.rule.reason : undefined;
    const earned = meetsNow || (!lockedReason && previouslyEarned.has(achievement.id));
    return {
      achievement,
      earned,
      progress: earned ? 1 : Math.max(0, Math.min(1, current / safeTarget)),
      current: earned ? safeTarget : Math.min(current, safeTarget),
      target: safeTarget,
      lockedReason,
      encouragement: encouragementFor(achievement),
      significance: significanceOf(achievement),
    };
  });

  const earned = statuses.filter((s) => s.earned);

  // Persist the earned set before returning. This has to be awaited: the next call reads
  // `earnedAchievementIds` at the very top, so a fire-and-forget write here would race and
  // the stickiness guarantee above would only hold some of the time.
  const earnedIds = earned.map((s) => s.achievement.id);
  if (earnedIds.some((id) => !previouslyEarned.has(id))) {
    await recordEarnedAchievements(earnedIds);
  }

  const earnable = statuses.filter((s) => !s.lockedReason);

  // "Next up" is about momentum: the closest things actually within reach, ignoring
  // anything not started and anything that can't be earned yet. Ties break toward the
  // harder badge, using the spreadsheet's difficulty weight.
  const nextUp = statuses
    .filter((s) => !s.earned && !s.lockedReason && s.progress > 0)
    .sort((a, b) => b.progress - a.progress || a.achievement.points - b.achievement.points)
    .slice(0, 5);

  // Earned order follows the stored list, which is append-only, so the tail is the newest.
  const earnedOrder = ctx.events.earnedAchievementIds;
  const recentlyEarned = [...earned]
    .sort((a, b) => earnedOrder.indexOf(b.achievement.id) - earnedOrder.indexOf(a.achievement.id))
    .slice(0, 3);

  return {
    earnedCount: earned.length,
    totalCount: statuses.length,
    lockedCount: statuses.length - earnable.length,
    completion: earnable.length > 0 ? earned.length / earnable.length : 0,
    currentLevel: ctx.currentLevel,
    statuses,
    nextUp,
    recentlyEarned,
  };
}

/** Headline counts only, for screens that don't show the full badge list (My Journey). */
export type BadgeTally = {
  earnedCount: number;
  totalCount: number;
  lockedCount: number;
  completion: number;
  currentLevel: number;
  /** The single most recent badge, for a "latest" line. */
  latest: AchievementStatus | null;
};

export function toBadgeTally(summary: BadgeSummary): BadgeTally {
  return {
    earnedCount: summary.earnedCount,
    totalCount: summary.totalCount,
    lockedCount: summary.lockedCount,
    completion: summary.completion,
    currentLevel: summary.currentLevel,
    latest: summary.recentlyEarned[0] ?? null,
  };
}

export async function getBadgeTally(): Promise<BadgeTally> {
  return toBadgeTally(await getBadgeSummary());
}

/** Groups statuses by category, in display order, for the Wins badge list. */
export function groupByCategory(
  statuses: AchievementStatus[]
): { category: string; statuses: AchievementStatus[]; earned: number; total: number }[] {
  const groups: Record<string, AchievementStatus[]> = {};
  statuses.forEach((s) => {
    const key = s.achievement.category;
    (groups[key] = groups[key] || []).push(s);
  });
  return sortCategories(Object.keys(groups)).map((category) => {
    const list = groups[category];
    return {
      category,
      // Within a ladder, tier order is the meaningful order; otherwise keep sheet order.
      statuses: [...list].sort((a, b) => (a.achievement.tier ?? 0) - (b.achievement.tier ?? 0)),
      earned: list.filter((s) => s.earned).length,
      total: list.length,
    };
  });
}

export function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}
