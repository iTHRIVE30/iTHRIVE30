// Builds the single snapshot of "everything the rules might need to know" from the stores.
//
// Every rule in evaluate.ts reads from a RewardContext and nothing else. That keeps the
// evaluator pure and cheap: the storage reads happen once here, not 357 times.

import {
  FullLog,
  HabitDef,
  ReflectionIndex,
  getFullLog,
  getHabits,
  getReflectionIndex,
  getTodayKey,
  getNotes,
} from '../habitStore';
import {
  CONTENT_BY_LEVEL,
  ChallengeResponses,
  getChallengeResponses,
  getCurrentLevelNumber,
  isLevelComplete,
} from '../challengeStore';
import { JourneyCategory, JourneyGoal, getCategories, getGoals } from '../journeyStore';
import { RewardEvents, getRewardEvents } from '../rewardEvents';
import { getUnlockedBadgeMontageLevels } from '../montageStore';

/**
 * The 9 habits the spreadsheet calls "core". Deliberately excludes the Challenge tick
 * (`app-tasks`, which has its own Challenge & Program category) and the three customizable
 * slots (which the user can rename to anything, so they can't carry fixed achievements).
 */
export const CORE_HABIT_IDS = [
  'activity', 'steps', 'alcohol-free', 'no-tv', 'no-takeaway', 'fruit', 'water', 'reading', 'selfie',
];

/** The three habit slots the user is free to rename. */
export const CUSTOM_HABIT_IDS = ['new-thing', 'choose-own', 'bonus'];

// A whole-history scan is bounded the same way analytics.ts bounds its streak scans - about
// 10 years of days. Nothing legitimate reaches this; it just guarantees termination.
const MAX_RANGE_ITERATIONS = 3660;

export function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateKey: string, delta: number): string {
  const d = new Date(dateKey + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const a = new Date(fromKey + 'T00:00:00').getTime();
  const b = new Date(toKey + 'T00:00:00').getTime();
  return Math.round((b - a) / 86400000);
}

/** Every date from start to end inclusive. Hard-capped so bad date data can't hang the app. */
export function dateRange(startKey: string, endKey: string): string[] {
  const dates: string[] = [];
  let cur = startKey;
  let guard = 0;
  while (cur <= endKey && guard < MAX_RANGE_ITERATIONS) {
    dates.push(cur);
    cur = addDays(cur, 1);
    guard += 1;
  }
  return dates;
}

/** 0 = winter (Dec-Feb), 1 = spring, 2 = summer, 3 = autumn. Hemisphere-agnostic buckets. */
function seasonOf(dateKey: string): number {
  const month = Number(dateKey.slice(5, 7));
  return Math.floor((month % 12) / 3);
}

export type DayFacts = {
  date: string;
  /** Habit id -> ticked. */
  habits: Record<string, boolean>;
  habitCount: number;
  coreCount: number;
  allCore: boolean;
  /** Every habit the user currently has is ticked. */
  allHabits: boolean;
  intention: boolean;
  gratitude: boolean;
  notes: boolean;
  mood: number;
  /** All four reflection prompts present. */
  allReflections: boolean;
  blank: boolean;
  /** 0 = Sunday. */
  weekday: number;
};

export type RewardContext = {
  todayKey: string;
  habits: HabitDef[];
  habitIds: string[];
  log: FullLog;
  reflection: ReflectionIndex;
  events: RewardEvents;
  responses: ChallengeResponses;
  goals: JourneyGoal[];
  categories: JourneyCategory[];

  /** Every date from the first recorded day to today, in order, with its facts. */
  days: DayFacts[];
  byDate: Record<string, DayFacts>;
  /** Dates with at least one habit ticked, ascending. */
  activeDates: string[];
  firstActiveDate: string | null;

  habitDayCounts: Record<string, number>;
  totalCheckOffs: number;
  allCoreDayCount: number;
  fullCircleDayCount: number;

  currentLevel: number;
  /** Level numbers where every written day has a response. */
  completedLevels: number[];
  /** Badge-montage Levels (of 4, 6, 10, 12) that are genuinely unlocked. */
  unlockedMontageLevels: number[];
  /** Late-night (11pm+) note found anywhere in history. */
  hasNightOwlNote: boolean;
};

async function findNightOwlNote(noteDates: string[]): Promise<boolean> {
  // Notes are the only place with a real clock time, and the bulk index deliberately keeps
  // only dates. Rather than re-reading every day, check the most recent 60 note days - a
  // late-night reflection habit shows up there, and this stays a bounded number of reads.
  const recent = [...noteDates].sort().slice(-60);
  for (const date of recent) {
    try {
      const notes = await getNotes(date);
      if (notes.some((n) => new Date(n.timestamp).getHours() >= 23)) return true;
    } catch {
      // Skip an unreadable day rather than failing the whole summary.
    }
  }
  return false;
}

export async function buildRewardContext(): Promise<RewardContext> {
  const [habits, log, reflection, events, responses, goals, categories, currentLevel] =
    await Promise.all([
      getHabits(),
      getFullLog(),
      getReflectionIndex(),
      getRewardEvents(),
      getChallengeResponses(),
      getGoals(),
      getCategories(),
      getCurrentLevelNumber(),
    ]);

  const todayKey = getTodayKey();
  const habitIds = habits.map((h) => h.id);

  const intentionSet = new Set(reflection.intentionDates);
  const gratitudeSet = new Set(reflection.gratitudeDates);
  const noteSet = new Set(reflection.noteDates);

  // The window runs from the earliest date that has *anything* recorded, up to today.
  const candidateDates = [
    ...Object.keys(log),
    ...reflection.intentionDates,
    ...reflection.gratitudeDates,
    ...reflection.noteDates,
    ...Object.keys(reflection.moodByDate),
  ].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

  const earliest = candidateDates.length > 0 ? candidateDates.sort()[0] : todayKey;
  const windowStart = earliest > todayKey ? todayKey : earliest;

  const days: DayFacts[] = dateRange(windowStart, todayKey).map((date) => {
    const dayLog = log[date] || {};
    const habitsOn: Record<string, boolean> = {};
    let habitCount = 0;
    for (const id of habitIds) {
      const on = !!dayLog[id];
      habitsOn[id] = on;
      if (on) habitCount += 1;
    }
    const coreCount = CORE_HABIT_IDS.reduce((n, id) => n + (habitsOn[id] ? 1 : 0), 0);
    const intention = intentionSet.has(date);
    const gratitude = gratitudeSet.has(date);
    const notes = noteSet.has(date);
    const mood = reflection.moodByDate[date] || 0;

    return {
      date,
      habits: habitsOn,
      habitCount,
      coreCount,
      allCore: coreCount === CORE_HABIT_IDS.length,
      allHabits: habitIds.length > 0 && habitCount === habitIds.length,
      intention,
      gratitude,
      notes,
      mood,
      allReflections: intention && gratitude && notes && mood > 0,
      blank: habitCount === 0 && !intention && !gratitude && !notes && mood === 0,
      weekday: new Date(date + 'T00:00:00').getDay(),
    };
  });

  const byDate: Record<string, DayFacts> = {};
  days.forEach((d) => { byDate[d.date] = d; });

  const activeDates = days.filter((d) => d.habitCount > 0).map((d) => d.date);

  const habitDayCounts: Record<string, number> = {};
  habitIds.forEach((id) => { habitDayCounts[id] = 0; });
  let totalCheckOffs = 0;
  days.forEach((d) => {
    habitIds.forEach((id) => {
      if (d.habits[id]) {
        habitDayCounts[id] += 1;
        totalCheckOffs += 1;
      }
    });
  });

  const completedLevels = Object.keys(CONTENT_BY_LEVEL)
    .map(Number)
    // All 30 days written and answered - a level written a week at a time is never complete.
    .filter((level) => isLevelComplete(level, responses))
    .sort((a, b) => a - b);

  const unlockedMontageLevels = await getUnlockedBadgeMontageLevels();

  return {
    todayKey,
    habits,
    habitIds,
    log,
    reflection,
    events,
    responses,
    goals,
    categories,
    days,
    byDate,
    activeDates,
    firstActiveDate: activeDates.length > 0 ? activeDates[0] : null,
    habitDayCounts,
    totalCheckOffs,
    allCoreDayCount: days.filter((d) => d.allCore).length,
    fullCircleDayCount: days.filter((d) => d.allCore && d.allReflections).length,
    currentLevel,
    completedLevels,
    unlockedMontageLevels,
    hasNightOwlNote: await findNightOwlNote(reflection.noteDates),
  };
}

export { seasonOf };
