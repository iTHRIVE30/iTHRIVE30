// Small append-only record of things the achievements engine can't work out from the daily
// log after the fact.
//
// Almost every achievement is *derived* - "logged water on 60 days" is a question you can ask
// of the habit log at any time, so there's nothing to store. A handful aren't: whether a past
// day was filled in from the history strip (vs. logged live), whether an already-submitted
// Challenge answer was later edited, which screens have been opened, what a custom habit slot
// has been called over time. Those leave no trace in the data itself, so they're recorded here
// as they happen.
//
// Everything is best-effort: a failed write is swallowed. Losing an event costs the user one
// badge, and that is always better than a crash on the Today tab.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayKey } from './habitStore';

const EVENTS_KEY = 'ithrive30_reward_events_v1';

export type ScreenId = 'today' | 'challenges' | 'progress' | 'wins' | 'archive' | 'journey' | 'teams' | 'montage';

export type RewardEvents = {
  /** ISO timestamp of the very first time the app recorded anything. */
  firstSeenAt: string;
  /** Screen id -> the local date it was first opened. Drives "Menu Master" / "Fully Explored". */
  screenFirstVisit: Partial<Record<ScreenId, string>>;
  /** Screen id -> the most recent local date it was opened. */
  screenLastVisit: Partial<Record<ScreenId, string>>;
  /** Past dates that were filled in retrospectively via the 5-day strip. */
  backfilledDates: string[];
  /** How many times an already-submitted Challenge response has been changed. */
  challengeEdits: number;
  /** Local dates where every habit was complete before 8am. */
  earlyBirdDates: string[];
  /** Custom habit slot id -> every distinct label it has ever had, oldest first. */
  customHabitLabels: Record<string, string[]>;
  /** Level numbers whose transformation montage has actually been watched. */
  montagesViewed: number[];
  /** Whether the Day 1 / Day 30 comparison has been opened at least once. */
  sideBySideViewed: boolean;
  /**
   * Every achievement id ever earned. Achievements are otherwise derived fresh each time,
   * and a few of them legitimately *stop* being true later - "3 or more active goals at the
   * same time" goes false the moment you finish one, "a goal held 12+ months" goes false when
   * you achieve it. Without this the user would watch their points drop for doing well.
   * Once earned, an achievement stays earned.
   */
  earnedAchievementIds: string[];
};

const EMPTY: RewardEvents = {
  firstSeenAt: '',
  screenFirstVisit: {},
  screenLastVisit: {},
  backfilledDates: [],
  challengeEdits: 0,
  earlyBirdDates: [],
  customHabitLabels: {},
  montagesViewed: [],
  sideBySideViewed: false,
  earnedAchievementIds: [],
};

export async function getRewardEvents(): Promise<RewardEvents> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<RewardEvents>) };
  } catch {
    return { ...EMPTY };
  }
}

async function update(mutate: (events: RewardEvents) => void): Promise<void> {
  try {
    const events = await getRewardEvents();
    if (!events.firstSeenAt) events.firstSeenAt = new Date().toISOString();
    mutate(events);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch {
    // Non-fatal by design - see the file header.
  }
}

/** Call when a screen comes into focus. Cheap and idempotent per day. */
export async function markScreenVisited(screen: ScreenId): Promise<void> {
  const today = getTodayKey();
  await update((events) => {
    if (!events.screenFirstVisit[screen]) events.screenFirstVisit[screen] = today;
    events.screenLastVisit[screen] = today;
  });
}

/**
 * Call when the user changes data for a date that isn't today - i.e. they used the history
 * strip to catch up. Recorded once per date.
 */
export async function recordBackfill(dateKey: string): Promise<void> {
  if (dateKey === getTodayKey()) return;
  await update((events) => {
    if (!events.backfilledDates.includes(dateKey)) events.backfilledDates.push(dateKey);
  });
}

/** Call when a Challenge response that already existed is submitted again. */
export async function recordChallengeEdit(): Promise<void> {
  await update((events) => {
    events.challengeEdits += 1;
  });
}

/** Call when a day reaches full completion. Only counts before 8am local. */
export async function recordDayCompleted(dateKey: string): Promise<void> {
  if (dateKey !== getTodayKey()) return;
  if (new Date().getHours() >= 8) return;
  await update((events) => {
    if (!events.earlyBirdDates.includes(dateKey)) events.earlyBirdDates.push(dateKey);
  });
}

/**
 * Records newly-earned achievements so they can never be lost again. Returns the ids that
 * were new this time - the caller can use those to celebrate.
 */
export async function recordEarnedAchievements(ids: string[]): Promise<string[]> {
  const events = await getRewardEvents();
  const known = new Set(events.earnedAchievementIds);
  const fresh = ids.filter((id) => !known.has(id));
  if (fresh.length === 0) return [];
  await update((e) => {
    e.earnedAchievementIds = [...new Set([...e.earnedAchievementIds, ...ids])];
  });
  return fresh;
}

/**
 * Call when a transformation montage is actually watched, not merely listed. Watching your
 * own change is the thing the badge is about, and nothing in the habit log records it.
 */
export async function recordMontageViewed(level: number): Promise<void> {
  await update((events) => {
    if (!events.montagesViewed.includes(level)) events.montagesViewed.push(level);
  });
}

/** Call when the Day 1 / Day 30 comparison is opened. */
export async function recordSideBySideViewed(): Promise<void> {
  await update((events) => {
    events.sideBySideViewed = true;
  });
}

/**
 * Call when a customizable habit slot is renamed. The slot's label history is what "One new
 * thing" achievements count - each distinct label is one new thing tried.
 */
export async function recordCustomHabitLabel(habitId: string, label: string): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) return;
  await update((events) => {
    const history = events.customHabitLabels[habitId] || [];
    if (!history.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      history.push(trimmed);
      events.customHabitLabels[habitId] = history;
    }
  });
}
