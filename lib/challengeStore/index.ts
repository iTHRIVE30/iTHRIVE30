import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  LevelDef,
  ChallengeDayDef,
  ChallengeResponses,
  ChallengeAnswer,
  LevelProgress,
  TodayChallengeInfo,
} from './types';
import { LEVEL_1_DAYS } from './foundationContent';
import { isTesterAllDays } from '../settingsStore';
import { LEVEL_2_DAYS } from './level2-awareness';
import { LEVEL_3_DAYS } from './level3-discovery';

export * from './types';
export { FIELD_INDEX } from './foundationContent';

// ---------- Storage keys ----------

const START_DATE_KEY = 'ithrive30_start_date'; // Level 1's start date - kept from before levels existed, so its day count never resets
const LEVEL_START_KEY_PREFIX = 'ithrive30_level_start_';
const RESPONSES_KEY = 'ithrive30_challenge_responses_v4';

// ---------- Levels ----------
// Level 1 is "Your Next Best Self Awaits" (draft v5 of the real, live iTHRIVE30 Level 1
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
  // Levels 4-6 are deliberately unnamed: they show as "coming soon" teasers on the
  // Challenges tab until their content is written. Name them here when it is.
];

/**
 * How many levels exist at all. Levels 1-3 are written; 4-6 are teasers. Levels 7-30
 * were removed - raise this when more are planned, not before, or they reappear as
 * empty cards.
 */
const LEVEL_COUNT = 6;

export const LEVELS: LevelDef[] = Array.from({ length: LEVEL_COUNT }, (_, i) => {
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
  // Tester switch (Settings, development builds only): every day open at once, so a whole
  // challenge can be walked through in one sitting. Normal users never see it.
  if (await isTesterAllDays()) return 30;
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

/**
 * True if any field has actually been filled in - blank multiselects and whitespace don't
 * count. A 1-10 scale of several items is an array with '' for each unrated row, so an
 * array counts only when something in it is filled.
 */
export function hasAnswerContent(answers: ChallengeAnswer[]): boolean {
  const filled = (v: unknown) => !!String(v ?? '').trim();
  return answers.some((a) => (Array.isArray(a) ? a.some(filled) : filled(a)));
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
 * How many of a level's written days have a response. This is a count, not the unlock
 * rule - a level with skipped days still unlocks the next one (see isLevelUnlocked).
 * Badges and the Growth Tree use it to mean "every day answered".
 */
export async function getLevelProgress(levelNumber: number): Promise<LevelProgress> {
  const days = getLevelDays(levelNumber);
  const responses = await getChallengeResponses();
  const completedContentDays = days.filter((d) => !!responses[d.id]).length;
  return { completedContentDays, totalContentDays: days.length };
}

/** Every level runs 30 days. */
export const DAYS_PER_LEVEL = 30;

/**
 * A level's Day 30, or undefined while it isn't written yet.
 *
 * Deliberately Day 30 and not "the last day written": a level being written a week at a
 * time (Level 1 has Days 1-7 so far) would otherwise count as finished after Day 7 -
 * celebration, next level unlocked, the lot.
 */
export function finalDayOf(levelNumber: number): ChallengeDayDef | undefined {
  return getLevelDays(levelNumber).find((d) => d.day === DAYS_PER_LEVEL);
}

/**
 * Every one of a level's 30 days written and answered. This is what "level complete" means
 * for badges, montages and the Growth Tree. A partly written level is never complete.
 */
export function isLevelComplete(levelNumber: number, responses: ChallengeResponses): boolean {
  const days = getLevelDays(levelNumber);
  return days.length >= DAYS_PER_LEVEL && days.every((d) => !!responses[d.id]);
}

/**
 * A level opens when the previous level's final day (Day 30) has been answered. Skipped
 * days earlier in that level don't hold it back - they stay open to come back to.
 *
 * THIS IS THE ONE GATE BETWEEN LEVELS. When in-app purchase arrives, the paywall check
 * belongs here ("...and the user owns this level, or holds a bundle / subscription that
 * covers it"), so Today, Challenges and the Growth Tree all respect it at once.
 */
export async function isLevelUnlocked(levelNumber: number, known?: ChallengeResponses): Promise<boolean> {
  if (levelNumber <= 1) return true;
  if (!LEVELS.some((l) => l.number === levelNumber)) return false;
  const final = finalDayOf(levelNumber - 1);
  if (!final) return false;
  const responses = known ?? (await getChallengeResponses());
  return !!responses[final.id];
}

/**
 * The level the user is working in: the highest level they have actually STARTED.
 *
 * Unlocking is not starting. Answering Day 30 unlocks the next level, but its 30-day clock
 * only starts when the user chooses it (startLevel, or opening it on the Challenges tab) -
 * because at that point they may instead choose to keep the habit tracker only.
 */
export async function getCurrentLevelNumber(): Promise<number> {
  let current = 1;
  for (const level of LEVELS) {
    if (level.number === 1 || getLevelDays(level.number).length === 0) continue;
    if (await getLevelStartDate(level.number)) current = level.number;
  }
  return current;
}

/**
 * Tester only (Settings, development builds): forgets every challenge answer and every
 * level's start date, so the challenge can be walked through again from Day 1. Habits,
 * notes, goals and photos are untouched. The caller also clears foundations.
 */
export async function resetChallengesForTesting(): Promise<void> {
  const keys = [RESPONSES_KEY, START_DATE_KEY, ...LEVELS.map((l) => LEVEL_START_KEY_PREFIX + l.number)];
  await AsyncStorage.multiRemove(keys);
}

/** Starts a level's 30-day clock (a no-op if it has already started). */
export async function startLevel(levelNumber: number): Promise<void> {
  if (!(await isLevelUnlocked(levelNumber))) return;
  await getOrCreateLevelStartDate(levelNumber);
}

/**
 * The challenge day the user is up to: the first unanswered day that has opened on the
 * calendar. Skip Days 5 and 6 and this is Day 5. Fully caught up, it is the latest day
 * that has opened (already done). 0 if the level hasn't started.
 */
export async function getCurrentChallengeDay(levelNumber: number): Promise<number> {
  const calendarDay = await getLevelProgramDay(levelNumber);
  if (!calendarDay) return 0;
  const responses = await getChallengeResponses();
  const firstOpen = getLevelDays(levelNumber)
    .filter((d) => d.day <= calendarDay)
    .sort((a, b) => a.day - b.day)
    .find((d) => !responses[d.id]);
  return firstOpen?.day ?? calendarDay;
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getTodayChallengeInfo(): Promise<TodayChallengeInfo> {
  const levelNumber = await getCurrentLevelNumber();
  const level = LEVELS.find((l) => l.number === levelNumber) || LEVELS[0];
  const levelDay = await getCurrentChallengeDay(levelNumber);
  const challenge = getChallengeDay(levelNumber, levelDay);
  const responses = await getChallengeResponses();
  const isDone = challenge ? !!responses[challenge.id] : false;
  // The Today tracker is calendar-based, so its "Today's Challenge" tick means "a challenge
  // was answered today" - whichever day it was - not "the day you're up to is done".
  const todayKey = localDateKey(new Date());
  const answeredToday = Object.values(responses).some(
    (r) => !!r.completedAt && localDateKey(new Date(r.completedAt)) === todayKey
  );

  // Day 30 answered: the level is finished and the user gets the choice - start the next
  // level, or keep the habit tracker only.
  const final = finalDayOf(levelNumber);
  const levelFinished = !!final && !!responses[final.id];
  const next = LEVELS.find((l) => l.number === levelNumber + 1);
  const nextLevel =
    levelFinished && next && getLevelDays(next.number).length > 0 && !(await getLevelStartDate(next.number))
      ? next
      : null;

  return { level, levelDay, challenge, isDone, answeredToday, levelFinished, nextLevel };
}
