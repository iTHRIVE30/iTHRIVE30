import { Share } from 'react-native';

import { getSettings } from './settingsStore';
import { getPerfectDayStreak, getTotalChallengesCompleted, getHabitStreaks } from './analytics';
import { getCurrentLevelNumber, getLevelProgramDay, LEVELS } from './challengeStore';
import { getGoals } from './journeyStore';

/**
 * A plain-text progress summary the user can send to a parent, guardian, mentor or coach.
 *
 * There is no backend, so there is no link to generate and no page to host - a URL would
 * need a server holding someone's programme, which is exactly what this app doesn't do.
 * What it produces instead is a short message handed to the phone's own share sheet: the
 * user picks the person and the channel, and the text goes wherever they send it.
 *
 * WHAT IT DELIBERATELY LEAVES OUT, and why this matters more than what it includes:
 *
 *   mood ratings, notes, gratitude entries, intentions, challenge answers,
 *   self-acknowledgements, photographs
 *
 * Those are the interior of the programme, and their whole value depends on the person
 * believing nobody else reads them. A 16-year-old who thinks a parent might see a one-star
 * mood day will stop logging one-star mood days, and the app loses the only honest signal
 * it has. Accountability is knowing whether someone showed up; it is not a window into
 * what they wrote at 11pm.
 *
 * So the summary carries structure only - days, streaks, level, counts. It is enough for
 * someone to ask "how did Tuesday go?" and nowhere near enough to answer it for them.
 *
 * Nothing is ever sent automatically. This runs on a tap, every time.
 */

export type ProgressSummary = {
  text: string;
  /** Non-empty when there genuinely is something to report. */
  hasProgress: boolean;
};

export async function buildProgressSummary(): Promise<ProgressSummary> {
  const [settings, perfect, challenges, streaks, levelNumber, goals] = await Promise.all([
    getSettings(),
    getPerfectDayStreak(),
    getTotalChallengesCompleted(),
    getHabitStreaks(),
    getCurrentLevelNumber(),
    getGoals(),
  ]);

  const levelDay = await getLevelProgramDay(levelNumber);
  const level = LEVELS.find((l) => l.number === levelNumber);
  const name = settings.firstName.trim();

  const bestHabit = [...streaks].sort((a, b) => b.current - a.current)[0];
  const goalsAchieved = goals.filter((g) => g.completed && !g.archivedAt).length;
  const goalsOpen = goals.filter((g) => !g.completed && !g.archivedAt).length;

  const hasProgress =
    perfect.totalPerfectDays > 0 || challenges > 0 || goalsAchieved > 0 || (bestHabit?.best ?? 0) > 0;

  const lines: string[] = [];

  lines.push(name ? `${name}'s iTHRIVE30 progress` : 'My iTHRIVE30 progress');
  lines.push('');
  lines.push(`Level ${levelNumber}${level ? ` — ${level.name}` : ''}, day ${levelDay} of 30`);

  if (challenges > 0) {
    lines.push(`${challenges} daily ${challenges === 1 ? 'challenge' : 'challenges'} completed`);
  }
  if (perfect.current > 0) {
    lines.push(`Current full-day streak: ${perfect.current} ${perfect.current === 1 ? 'day' : 'days'}`);
  }
  if (perfect.best > 0) {
    lines.push(`Best full-day streak: ${perfect.best} ${perfect.best === 1 ? 'day' : 'days'}`);
  }
  if (perfect.totalPerfectDays > 0) {
    lines.push(`${perfect.totalPerfectDays} full days completed in total`);
  }
  if (bestHabit && bestHabit.best > 0) {
    lines.push(`Strongest habit: ${bestHabit.label} — best run of ${bestHabit.best} days`);
  }
  if (goalsAchieved > 0 || goalsOpen > 0) {
    lines.push(`Goals: ${goalsAchieved} achieved, ${goalsOpen} in progress`);
  }

  if (!hasProgress) {
    lines.push('');
    lines.push('Just getting started.');
  }

  lines.push('');
  lines.push(
    'This is a summary of what was done, not what was written. Moods, notes and reflections stay private on the phone.'
  );
  lines.push('');
  lines.push('iTHRIVE30 — Change · Grow · Evolve');

  return { text: lines.join('\n'), hasProgress };
}

export type ShareResult = { status: 'shared' | 'dismissed' | 'error'; message?: string };

/**
 * Hands the summary to the system share sheet. The user chooses the recipient and the
 * channel; the app never knows who it went to, and never learns whether they read it.
 */
export async function shareProgressSummary(): Promise<ShareResult> {
  try {
    const summary = await buildProgressSummary();
    const result = await Share.share({ message: summary.text });
    return { status: result.action === Share.dismissedAction ? 'dismissed' : 'shared' };
  } catch (e) {
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'The summary could not be shared.',
    };
  }
}
