import { getSelfiePhoto, getTodayKey } from './habitStore';
import { DAYS_PER_LEVEL, getLevelProgress, getStartedLevels } from './challengeStore';
import type { LevelProgress } from './challengeStore/types';

/**
 * Transformation montages - the daily selfies of a Level, in order, plus Day 1 and the
 * latest day side by side.
 *
 * This is the most shareable thing the app can make, so it is deliberately available for
 * ANY started Level as soon as there are two photographs to compare. The four badge
 * montages (Levels 4, 6, 10, 12) are a separate, higher bar - see MONTAGE_BADGE_LEVELS.
 * Gating the whole feature behind Level 4 would hide it from every current user.
 *
 * Nothing new is stored. A montage is assembled on demand from selfies already saved
 * against their dates, so there is no montage to migrate, corrupt or back up separately.
 *
 * Date handling is borrowed wholesale from `getStartedLevels()`, which already maps day
 * 1..30 to real calendar dates. Doing that arithmetic again here would be a second place
 * for the local-date rule to be got wrong.
 */

/** The Levels whose montages the badge set treats as milestones. */
export const MONTAGE_BADGE_LEVELS: readonly number[] = [4, 6, 10, 12];

export type MontagePhoto = {
  /** 1-30 within the Level. */
  day: number;
  dateKey: string;
  uri: string;
};

export type Montage = {
  level: number;
  levelName: string;
  /** Every day of the Level that has a photo, in order. */
  photos: MontagePhoto[];
  /** True once every written challenge day in the Level has a response. */
  levelComplete: boolean;
  /** A montage needs two photographs to be a comparison at all. */
  available: boolean;
  /** Earliest and latest photo - the before and after. */
  first: MontagePhoto | null;
  last: MontagePhoto | null;
};

/** All 30 days written and answered - a partly written level never counts as complete. */
function isComplete(progress: LevelProgress): boolean {
  return progress.totalContentDays >= DAYS_PER_LEVEL && progress.completedContentDays >= progress.totalContentDays;
}

/**
 * Photos taken during a Level's 30-day window, in day order.
 *
 * Bounded at 30 reads by construction - the loop is the Level's own `dates` array, never an
 * open date range. Days still in the future are skipped rather than read.
 */
async function photosForDates(dates: string[]): Promise<MontagePhoto[]> {
  const today = getTodayKey();
  const upToToday = dates
    .map((dateKey, i) => ({ day: i + 1, dateKey }))
    .filter((d) => d.dateKey <= today);

  const uris = await Promise.all(upToToday.map((d) => getSelfiePhoto(d.dateKey)));

  return upToToday
    .map((d, i) => ({ ...d, uri: uris[i] }))
    .filter((p): p is MontagePhoto => typeof p.uri === 'string' && p.uri.length > 0);
}

/** Every Level the user has actually begun, newest first, each with its montage. */
export async function getMontages(): Promise<Montage[]> {
  const started = await getStartedLevels();

  const montages = await Promise.all(
    started.map(async (s) => {
      const [photos, progress] = await Promise.all([
        photosForDates(s.dates),
        getLevelProgress(s.level.number),
      ]);

      return {
        level: s.level.number,
        levelName: s.level.name,
        photos,
        levelComplete: isComplete(progress),
        available: photos.length >= 2,
        first: photos[0] ?? null,
        last: photos.length > 1 ? photos[photos.length - 1] : null,
      };
    })
  );

  return montages.sort((a, b) => b.level - a.level);
}

/**
 * Which of the four badge montages are genuinely unlocked: the Level is finished and there
 * are enough photographs for the montage to mean anything.
 */
export async function getUnlockedBadgeMontageLevels(): Promise<number[]> {
  const montages = await getMontages();
  return montages
    .filter((m) => MONTAGE_BADGE_LEVELS.includes(m.level) && m.levelComplete && m.available)
    .map((m) => m.level);
}
