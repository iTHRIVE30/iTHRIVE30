import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  LevelDef,
  ChallengeDayDef,
  ChallengeResponses,
  ChallengeAnswer,
  LevelProgress,
  TodayChallengeInfo,
} from './types';
import { LEVEL_1_DAYS } from './level1-foundation';
import { LEVEL_2_DAYS } from './level2-awareness';
import { LEVEL_3_DAYS } from './level3-discovery';

export * from './types';

// ---------- Storage keys ----------

const START_DATE_KEY = 'ithrive30_start_date'; // Level 1's start date - kept from before levels existed, so its day count never resets
const LEVEL_START_KEY_PREFIX = 'ithrive30_level_start_';
const RESPONSES_KEY = 'ithrive30_challenge_responses_v4';

// ---------- Levels ----------
// Level 1 is "Your Next Best Self Awaits" (draft v5 of the real, live iThrive30 Level 1
// course). Discovery moved to Level 3 (its old slot at Level 1 is taken, and Level 3/Compass
// had no content yet, so nothing real gets displaced). Awareness stays at Level 2.
//
// These names are the single source of truth for level names everywhere, including the
// Growth Tree. Levels 2 and 3 still read Awareness and Discovery here; the Growth Tree
// design sheet calls them "Design Your Life" and "The Choice is Yours". Rename them here
// once that is confirmed and the tree follows automatically.

const NAMED_LEVELS: { number: number; name: string; introMessage?: string }[] = [
  {
    number: 1,
    name: 'Your Next Best Self Awaits',
    // The v5 "Before You Begin" screens, one line each, in order.
    introMessage: `Welcome, and well done.
Your future Next Best Self already exists.
They are waiting for you on the other side of this challenge.
The changes you want are in the work you have been avoiding.
Let's begin.`,
  },
  { number: 2, name: 'Awareness' },
  { number: 3, name: 'Discovery' },
  { number: 4, name: 'Enhance' },
  { number: 5, name: 'Elevate' },
  { number: 6, name: 'AMPLIFY' },
];

export const LEVELS: LevelDef[] = Array.from({ length: 30 }, (_, i) => {
  const number = i + 1;
  const named = NAMED_LEVELS.find((l) => l.number === number);
  return {
    id: `level-${number}`,
    number,
    name: named ? named.name : `Level ${number}`,
    introMessage: named?.introMessage,
  };
});

// ---------- Day content, by level ----------
// To add a new level's content: create lib/challengeStore/levelN-name.ts exporting an
// array of ChallengeDayDef (see the existing level files for the shape), import it above,
// and add it to this map. Any level not listed here shows every day as "Coming soon".

export const CONTENT_BY_LEVEL: Record<number, ChallengeDayDef[]> = {
  1: LEVEL_1_DAYS,
  2: LEVEL_2_DAYS,
  3: LEVEL_3_DAYS,
};

export function getLevelDays(levelNumber: number): ChallengeDayDef[] {
  return CONTENT_BY_LEVEL[levelNumber] || [];
}

export function getChallengeDay(levelNumber: number, day: number): ChallengeDayDef | undefined {
  return getLevelDays(levelNumber).find((d) => d.day === day);
}

// ---------- Level start dates & program-day counters ----------

async function getOrCreateLevelStartDate(levelNumber: number): Promise<string> {
  const key = levelNumber === 1 ? START_DATE_KEY : LEVEL_START_KEY_PREFIX + levelNumber;
  const raw = await AsyncStorage.getItem(key);
  if (raw) return raw;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  await AsyncStorage.setItem(key, today);
  return today;
}

/**
 * A level's start date, or null if it has never been started.
 *
 * Deliberately read-only, unlike getOrCreateLevelStartDate: the Today tab asks about every
 * level to build its history picker, and merely *looking* at a level must never quietly
 * start its 30-day clock.
 */
export async function getLevelStartDate(levelNumber: number): Promise<string | null> {
  const key = levelNumber === 1 ? START_DATE_KEY : LEVEL_START_KEY_PREFIX + levelNumber;
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export type StartedLevel = {
  level: LevelDef;
  startDate: string;
  /** Calendar dates for day 1..30, in order. Runs the full 30 even if today is day 4. */
  dates: string[];
  /** 1-30 today, or 30 for a level whose 30 days have passed. */
  currentDay: number;
};

/**
 * Every level the user has actually begun, oldest first, with the real calendar date of
 * each of its 30 days. This is what lets the Today tab scroll back to Day 1 of a level and
 * switch between levels to review history.
 */
export async function getStartedLevels(): Promise<StartedLevel[]> {
  const started: StartedLevel[] = [];

  for (const level of LEVELS) {
    const startDate = await getLevelStartDate(level.number);
    if (!startDate) continue;

    const dates: string[] = [];
    const cursor = new Date(startDate + 'T00:00:00');
    for (let day = 0; day < 30; day++) {
      dates.push(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
      );
      cursor.setDate(cursor.getDate() + 1);
    }

    started.push({
      level,
      startDate,
      dates,
      currentDay: Math.min(Math.max(daysSince(startDate), 1), 30),
    });
  }

  return started;
}

function daysSince(dateStr: string): number {
  const start = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const diffMs = new Date(now.setHours(0, 0, 0, 0)).getTime() - new Date(start.setHours(0, 0, 0, 0)).getTime();
  return Math.floor(diffMs / 86400000) + 1;
}

/**
 * Returns 1-30 if the level has started, or 0 if it's still locked. Purely calendar-based:
 * days unlock on schedule regardless of whether earlier days got done. Miss Day 5 and 6,
 * and Day 7 still opens on time - Day 5 and 6 just stay open too, so you can go back and
 * catch up on them (or not) whenever you like, no pressure either way.
 */
export async function getLevelProgramDay(levelNumber: number): Promise<number> {
  const unlocked = await isLevelUnlocked(levelNumber);
  if (!unlocked) return 0;
  const startDate = await getOrCreateLevelStartDate(levelNumber);
  return Math.min(Math.max(daysSince(startDate), 1), 30);
}

// ---------- Responses ----------

export async function getChallengeResponses(): Promise<ChallengeResponses> {
  const raw = await AsyncStorage.getItem(RESPONSES_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/**
 * Saves a day's answers. Called on every exit from the day modal, not just on a deliberate
 * "submit" - so it has to be safe to call repeatedly with unchanged content.
 *
 * `moodRating` is optional: omit it when re-saving an edit, and the rating captured on the
 * day is kept rather than being wiped by a later visit.
 */
export async function submitChallengeResponse(
  id: string,
  answers: ChallengeAnswer[],
  moodRating?: number
): Promise<ChallengeResponses> {
  const responses = await getChallengeResponses();
  const existing = responses[id];

  responses[id] = {
    answers,
    moodRating: moodRating ?? existing?.moodRating ?? 0,
    // The first save stamps the day; later edits must NOT re-stamp it. Re-stamping would
    // make a day answered weeks ago look like it was answered today, which would corrupt
    // the challenge-streak, weekday and "on time" achievements - and, because the Today
    // tab syncs its Challenge tick from this, quietly move history around.
    completedAt: existing?.completedAt ?? new Date().toISOString(),
  };

  await AsyncStorage.setItem(RESPONSES_KEY, JSON.stringify(responses));
  return responses;
}

/** True if any field has actually been filled in - blank multiselects and whitespace don't count. */
export function hasAnswerContent(answers: ChallengeAnswer[]): boolean {
  return answers.some((a) => (Array.isArray(a) ? a.length > 0 : !!String(a ?? '').trim()));
}

export async function getCompletedChallenges(): Promise<{ [challengeId: string]: string }> {
  const responses = await getChallengeResponses();
  const completed: { [challengeId: string]: string } = {};
  Object.keys(responses).forEach((id) => {
    completed[id] = responses[id].completedAt;
  });
  return completed;
}

// ---------- Level progress & unlocking ----------

/**
 * A level "completes" once every day that currently HAS content has a saved response.
 * Since some levels are only partly written so far, this bar rises naturally as more
 * days get content added - it doesn't require all 30 slots filled to unlock the next level.
 */
export async function getLevelProgress(levelNumber: number): Promise<LevelProgress> {
  const days = getLevelDays(levelNumber);
  const responses = await getChallengeResponses();
  const completedContentDays = days.filter((d) => !!responses[d.id]).length;
  return { completedContentDays, totalContentDays: days.length };
}

export async function isLevelUnlocked(levelNumber: number): Promise<boolean> {
  if (levelNumber <= 1) return true;
  const prevProgress = await getLevelProgress(levelNumber - 1);
  return prevProgress.totalContentDays > 0 && prevProgress.completedContentDays >= prevProgress.totalContentDays;
}

/** The level the Today screen should reflect: the earliest unlocked level that isn't fully done yet. */
export async function getCurrentLevelNumber(): Promise<number> {
  for (const level of LEVELS) {
    const unlocked = await isLevelUnlocked(level.number);
    if (!unlocked) return Math.max(1, level.number - 1);
    const progress = await getLevelProgress(level.number);
    const isFullyDone = progress.totalContentDays > 0 && progress.completedContentDays >= progress.totalContentDays;
    if (!isFullyDone) return level.number;
  }
  return LEVELS[LEVELS.length - 1].number;
}

export async function getTodayChallengeInfo(): Promise<TodayChallengeInfo> {
  const levelNumber = await getCurrentLevelNumber();
  const level = LEVELS.find((l) => l.number === levelNumber) || LEVELS[0];
  const levelDay = await getLevelProgramDay(levelNumber);
  const challenge = getChallengeDay(levelNumber, levelDay);
  let isDone = false;
  if (challenge) {
    const responses = await getChallengeResponses();
    isDone = !!responses[challenge.id];
  }
  return { level, levelDay, challenge, isDone };
}
