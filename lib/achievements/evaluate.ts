// Turns a declarative rule from data.ts into "has this been earned, and how close is it".
//
// Every rule returns { current, target }: current/target >= 1 means earned, and the ratio
// drives the progress bars in Wins. Rules that are simply true/false report 0 or 1 out of 1.

import { MONTAGE_BADGE_LEVELS } from '../montageStore';
import { AchievementRule } from './types';
import { getLevelDays } from '../challengeStore';
import {
  CUSTOM_HABIT_IDS,
  DayFacts,
  RewardContext,
  addDays,
  daysBetween,
  seasonOf,
} from './context';

export type RuleProgress = { current: number; target: number };

const done = (ok: boolean): RuleProgress => ({ current: ok ? 1 : 0, target: 1 });
const count = (current: number, target: number): RuleProgress => ({ current, target });

/** Longest run of consecutive days where `predicate` holds. */
function longestRun(days: DayFacts[], predicate: (d: DayFacts) => boolean): number {
  let best = 0;
  let run = 0;
  for (const day of days) {
    if (predicate(day)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

/** Every run length of `predicate`, in order - used where "a later run beat an earlier one" matters. */
function runLengths(days: DayFacts[], predicate: (d: DayFacts) => boolean): number[] {
  const runs: number[] = [];
  let run = 0;
  for (const day of days) {
    if (predicate(day)) run += 1;
    else if (run > 0) { runs.push(run); run = 0; }
  }
  if (run > 0) runs.push(run);
  return runs;
}

const isAllCore = (d: DayFacts) => d.allCore;
const isAllHabits = (d: DayFacts) => d.allHabits;
const isActive = (d: DayFacts) => d.habitCount > 0;

/** A combo id is either a habit id or 'r:<reflection field>'. */
function comboSatisfied(day: DayFacts, id: string): boolean {
  if (!id.startsWith('r:')) return !!day.habits[id];
  switch (id.slice(2)) {
    case 'intention': return day.intention;
    case 'gratitude': return day.gratitude;
    case 'notes': return day.notes;
    case 'mood': return day.mood > 0;
    default: return false;
  }
}

/** Completion % per calendar month, oldest first. */
function monthlyCompletion(ctx: RewardContext): { key: string; percent: number }[] {
  const totals: Record<string, { done: number; possible: number }> = {};
  const perDay = ctx.habitIds.length || 1;
  for (const day of ctx.days) {
    const key = day.date.slice(0, 7);
    if (!totals[key]) totals[key] = { done: 0, possible: 0 };
    totals[key].done += day.habitCount;
    totals[key].possible += perDay;
  }
  return Object.keys(totals)
    .sort()
    .map((key) => ({
      key,
      percent: totals[key].possible > 0 ? (totals[key].done / totals[key].possible) * 100 : 0,
    }));
}

/** Average mood per calendar month, oldest first, months with no ratings omitted. */
function monthlyMood(ctx: RewardContext): { key: string; average: number }[] {
  const totals: Record<string, { sum: number; n: number }> = {};
  for (const [date, rating] of Object.entries(ctx.reflection.moodByDate)) {
    const key = date.slice(0, 7);
    if (!totals[key]) totals[key] = { sum: 0, n: 0 };
    totals[key].sum += rating;
    totals[key].n += 1;
  }
  return Object.keys(totals)
    .sort()
    .map((key) => ({ key, average: totals[key].sum / totals[key].n }));
}

/** Longest run of consecutive ISO weeks containing at least one active day. */
function longestWeeklyStreak(ctx: RewardContext): number {
  const weeks = new Set<string>();
  for (const date of ctx.activeDates) {
    const d = new Date(date + 'T00:00:00');
    // Monday-anchored week key.
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    weeks.add(
      `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
    );
  }
  const sorted = [...weeks].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const week of sorted) {
    if (previous && daysBetween(previous, week) === 7) run += 1;
    else run = 1;
    if (run > best) best = run;
    previous = week;
  }
  return best;
}

/**
 * The stretch of days a Level actually ran over: from its first response to its last.
 * Returns null if the Level has no responses. Used so "across a full Level" rules measure
 * that Level, not the user's entire history.
 */
function levelSpan(ctx: RewardContext, level: number): DayFacts[] | null {
  const dates = getLevelDays(level)
    .map((d) => ctx.responses[d.id]?.completedAt)
    .filter((c): c is string => !!c)
    .map((c) => c.slice(0, 10))
    .sort();
  if (dates.length === 0) return null;
  const first = dates[0];
  const last = dates[dates.length - 1];
  return ctx.days.filter((d) => d.date >= first && d.date <= last);
}

/** Word count of every answer in a challenge response. */
function responseWordCount(answers: (string | string[])[]): number {
  return answers.reduce((total, answer) => {
    const text = Array.isArray(answer) ? answer.join(' ') : answer || '';
    return total + text.trim().split(/\s+/).filter(Boolean).length;
  }, 0);
}

export function evaluateRule(rule: AchievementRule, ctx: RewardContext): RuleProgress {
  switch (rule.kind) {
    // ---- habit & reflection totals -------------------------------------------------
    case 'habitDays':
      return count(ctx.habitDayCounts[rule.habitId] || 0, rule.count);

    case 'reflectionDays': {
      const totals = {
        intention: ctx.reflection.intentionDates.length,
        gratitude: ctx.reflection.gratitudeDates.length,
        notes: ctx.reflection.noteDates.length,
        mood: Object.keys(ctx.reflection.moodByDate).length,
      };
      return count(totals[rule.field], rule.count);
    }

    case 'anyHabitDays':
      return count(ctx.activeDates.length, rule.count);

    case 'anyHabitStreak':
      return count(longestRun(ctx.days, isActive), rule.days);

    case 'totalCheckOffs':
      return count(ctx.totalCheckOffs, rule.count);

    // ---- streaks --------------------------------------------------------------------
    case 'coreStreak':
      return count(longestRun(ctx.days, isAllCore), rule.days);

    case 'allHabitStreak':
      return count(longestRun(ctx.days, isAllHabits), rule.days);

    case 'noBlankDays':
      return count(longestRun(ctx.days, (d) => !d.blank), rule.days);

    case 'weeklyActive':
      return count(longestWeeklyStreak(ctx), rule.weeks);

    // ---- combinations ---------------------------------------------------------------
    case 'comboDays':
      return count(
        ctx.days.filter((d) => rule.ids.every((id) => comboSatisfied(d, id))).length,
        rule.count
      );

    case 'comboAnyN':
      return count(ctx.days.filter((d) => d.habitCount >= rule.n).length, rule.count);

    case 'allCoreDays':
      return count(ctx.allCoreDayCount, rule.count);

    case 'fullCircleDays':
      return count(ctx.fullCircleDayCount, rule.count);

    case 'weekendPerfect': {
      // Walk Saturdays in order; a weekend counts when both it and the Sunday after are full.
      const saturdays = ctx.days.filter((d) => d.weekday === 6);
      let best = 0;
      let run = 0;
      let previousSaturday: string | null = null;
      for (const saturday of saturdays) {
        const sunday = ctx.byDate[addDays(saturday.date, 1)];
        const good = saturday.allHabits && !!sunday && sunday.allHabits;
        if (!good) { run = 0; previousSaturday = null; continue; }
        run = previousSaturday && daysBetween(previousSaturday, saturday.date) === 7 ? run + 1 : 1;
        if (run > best) best = run;
        previousSaturday = saturday.date;
      }
      return count(best, rule.weekends);
    }

    // ---- levels & challenges ---------------------------------------------------------
    case 'levelComplete':
      return done(ctx.completedLevels.includes(rule.level));

    case 'levelsCompleted':
      return count(ctx.completedLevels.length, rule.count);

    case 'levelPerfect':
      // Scoped to each Level's own span, not the user's whole history - otherwise a blank day
      // two years later would retroactively un-perfect a Level finished long ago.
      return done(
        ctx.completedLevels.some((level) => {
          const span = levelSpan(ctx, level);
          return !!span && !span.some((d) => d.blank);
        })
      );

    case 'levelCompleteWithMiss':
      return done(
        ctx.completedLevels.some((level) => {
          const span = levelSpan(ctx, level);
          return !!span && span.some((d) => d.blank);
        })
      );

    case 'challengeOnTimeLevel': {
      // Every response in a completed Level landed on a day that also had habit activity -
      // the closest signal we have that it was answered live rather than backfilled later.
      if (ctx.completedLevels.length === 0) return done(false);
      const backfilled = new Set(ctx.events.backfilledDates);
      const onTime = Object.values(ctx.responses).every((r) => {
        const date = r.completedAt.slice(0, 10);
        return !backfilled.has(date);
      });
      return done(onTime);
    }

    case 'challengeWordy':
      return count(
        Object.values(ctx.responses).filter((r) => responseWordCount(r.answers) >= rule.words).length,
        rule.count
      );

    case 'challengeStreak': {
      const dates = new Set(Object.values(ctx.responses).map((r) => r.completedAt.slice(0, 10)));
      return count(longestRun(ctx.days, (d) => dates.has(d.date)), rule.days);
    }

    case 'challengeWeekday': {
      const dates = new Set(Object.values(ctx.responses).map((r) => r.completedAt.slice(0, 10)));
      const matching = [...dates].filter(
        (date) => new Date(date + 'T00:00:00').getDay() === rule.weekday
      );
      return count(matching.length, rule.count);
    }

    case 'firstChallengeWithin24h': {
      if (!ctx.firstActiveDate) return done(false);
      const first = Object.values(ctx.responses)
        .map((r) => r.completedAt)
        .sort()[0];
      if (!first) return done(false);
      return done(daysBetween(ctx.firstActiveDate, first.slice(0, 10)) <= 1);
    }

    case 'challengeEdited':
      return done(ctx.events.challengeEdits > 0);

    // ---- long-run consistency ----------------------------------------------------------
    case 'levelAvgCompletion': {
      // "across a full Level" - measured over that Level's own days, so a strong Level stays
      // a strong Level however the months after it go.
      const perDay = ctx.habitIds.length || 1;
      return done(
        ctx.completedLevels.some((level) => {
          const span = levelSpan(ctx, level);
          if (!span || span.length === 0) return false;
          const average =
            (span.reduce((sum, d) => sum + d.habitCount, 0) / (span.length * perDay)) * 100;
          return average >= rule.percent;
        })
      );
    }

    case 'monthsRising': {
      // A month the user never opened the app in isn't a month they held or improved on, so
      // only count months that actually contain activity.
      const months = monthlyCompletion(ctx).filter((m) => m.percent > 0);
      if (months.length === 0) return count(0, rule.months);
      let best = 1;
      let run = 1;
      for (let i = 1; i < months.length; i++) {
        const improved = rule.allowHold
          ? months[i].percent >= months[i - 1].percent
          : months[i].percent > months[i - 1].percent;
        run = improved ? run + 1 : 1;
        if (run > best) best = run;
      }
      return count(best, rule.months);
    }

    case 'completionMonths': {
      const months = monthlyCompletion(ctx);
      let best = 0;
      let run = 0;
      for (const month of months) {
        run = month.percent >= rule.percent ? run + 1 : 0;
        if (run > best) best = run;
      }
      return count(best, rule.months);
    }

    case 'accountMonths': {
      if (!ctx.firstActiveDate) return count(0, rule.months);
      const months = Math.floor(daysBetween(ctx.firstActiveDate, ctx.todayKey) / 30.44);
      return count(months, rule.months);
    }

    case 'seasonsUsed': {
      const seasons = new Set(ctx.activeDates.map(seasonOf));
      return count(seasons.size, rule.count);
    }

    case 'startedInMonth':
      return done(
        !!ctx.firstActiveDate && Number(ctx.firstActiveDate.slice(5, 7)) === rule.month
      );

    // ---- mood ---------------------------------------------------------------------------
    case 'moodAllValues': {
      const values = new Set(Object.values(ctx.reflection.moodByDate));
      return count([1, 2, 3, 4, 5].filter((v) => values.has(v)).length, 5);
    }

    case 'moodHighStreak':
      return count(longestRun(ctx.days, (d) => d.mood >= rule.min), rule.days);

    case 'moodLowDays':
      return count(
        Object.values(ctx.reflection.moodByDate).filter((m) => m > 0 && m <= 2).length,
        rule.count
      );

    case 'moodLowThenNextDay':
      return done(
        ctx.days.some((d, i) => {
          const next = ctx.days[i + 1];
          return d.mood === 1 && !!next && (next.habitCount > 0 || next.mood > 0);
        })
      );

    case 'habitOnLowMoodDay':
      return done(ctx.days.some((d) => d.mood === 1 && d.habitCount > 0));

    case 'moodImprovedMonth': {
      const months = monthlyMood(ctx);
      return done(months.some((m, i) => i > 0 && m.average > months[i - 1].average));
    }

    case 'streakThroughLowMoodWeek':
      return done(
        ctx.days.some((_, i) => {
          const week = ctx.days.slice(i, i + 7);
          return week.length === 7 && week.every(isAllCore) && week.some((d) => d.mood === 1);
        })
      );

    // ---- resilience -------------------------------------------------------------------
    case 'gapReturn': {
      let biggest = 0;
      for (let i = 1; i < ctx.activeDates.length; i++) {
        const gap = daysBetween(ctx.activeDates[i - 1], ctx.activeDates[i]) - 1;
        if (gap > biggest) biggest = gap;
      }
      return done(biggest >= rule.days);
    }

    case 'backfillDays':
      return count(ctx.events.backfilledDates.length, rule.count);

    case 'streakRestartedNextDay': {
      // A core streak ended, exactly one day was missed, then a new one started.
      return done(
        ctx.days.some((d, i) => {
          const previous = ctx.days[i - 1];
          const next = ctx.days[i + 1];
          return !!previous && previous.allCore && !d.allCore && !!next && next.allCore;
        })
      );
    }

    case 'streakBeatPrevious': {
      const runs = runLengths(ctx.days, isAllCore);
      return done(runs.some((run, i) => i > 0 && run > Math.max(...runs.slice(0, i))));
    }

    case 'streakRebuilt': {
      const runs = runLengths(ctx.days, isAllCore);
      const qualifying = runs.filter((r) => r >= rule.days);
      // Needs a run of the target length that isn't the user's first ever run.
      return done(runs.length > 1 && qualifying.length > 0 && runs.indexOf(qualifying[0]) > 0);
    }

    // ---- personalization ----------------------------------------------------------------
    case 'customRenamed': {
      const renamed = CUSTOM_HABIT_IDS.filter(
        (id) => (ctx.events.customHabitLabels[id] || []).length > 0
      ).length;
      return count(renamed, rule.count);
    }

    case 'customHabitDays': {
      if (rule.sameSlot) {
        const best = Math.max(0, ...CUSTOM_HABIT_IDS.map((id) => ctx.habitDayCounts[id] || 0));
        return count(best, rule.count);
      }
      const combined = CUSTOM_HABIT_IDS.reduce((sum, id) => sum + (ctx.habitDayCounts[id] || 0), 0);
      return count(combined, rule.count);
    }

    case 'newThingEntries':
      return count((ctx.events.customHabitLabels['new-thing'] || []).length, rule.count);

    // ---- goals ------------------------------------------------------------------------------
    case 'goalsSet':
      return count(ctx.goals.length, rule.count);

    case 'goalsAchieved':
      return count(ctx.goals.filter((g) => g.completed).length, rule.count);

    case 'goalCategories': {
      const pool = rule.achieved ? ctx.goals.filter((g) => g.completed) : ctx.goals;
      return count(new Set(pool.map((g) => g.categoryId)).size, rule.count);
    }

    case 'goalAllFields':
      return done(
        ctx.goals.some((g) => !!g.achieve.trim() && !!g.feel.trim() && !!g.impact.trim())
      );

    case 'goalsActive':
      return count(ctx.goals.filter((g) => !g.completed).length, rule.count);

    case 'goalAchievedWithin':
      return done(
        ctx.goals.some(
          (g) =>
            g.completed &&
            !!g.completedAt &&
            daysBetween(g.createdAt.slice(0, 10), g.completedAt.slice(0, 10)) <= rule.days
        )
      );

    case 'goalAchievedAfter':
      return done(
        ctx.goals.some(
          (g) =>
            g.completed &&
            !!g.completedAt &&
            daysBetween(g.createdAt.slice(0, 10), g.completedAt.slice(0, 10)) >= rule.days
        )
      );

    case 'goalsAchievedInMonth': {
      const perMonth: Record<string, number> = {};
      ctx.goals
        .filter((g) => g.completed && g.completedAt)
        .forEach((g) => {
          const key = g.completedAt!.slice(0, 7);
          perMonth[key] = (perMonth[key] || 0) + 1;
        });
      return count(Math.max(0, ...Object.values(perMonth), 0), rule.count);
    }

    case 'goalHeldMonths': {
      const best = Math.max(
        0,
        ...ctx.goals
          .filter((g) => !g.completed)
          .map((g) => Math.floor(daysBetween(g.createdAt.slice(0, 10), ctx.todayKey) / 30.44)),
        0
      );
      return count(best, rule.months);
    }

    // ---- transformation montages ---------------------------------------------------------
    case 'montageUnlocked':
      return done(ctx.unlockedMontageLevels.includes(rule.level));

    case 'montagesUnlocked':
      return count(ctx.unlockedMontageLevels.length, rule.count);

    case 'allMontagesUnlocked':
      return count(ctx.unlockedMontageLevels.length, MONTAGE_BADGE_LEVELS.length);

    case 'montageViewed':
      return done(ctx.events.montagesViewed.length > 0);

    case 'sideBySideViewed':
      return done(ctx.events.sideBySideViewed);

    // ---- app engagement ------------------------------------------------------------------
    case 'archiveOpened':
      return done(!!ctx.events.screenFirstVisit.archive);

    case 'screensVisited': {
      const required = ['today', 'challenges', 'progress', 'wins', 'archive'] as const;
      if (!rule.sameDay) {
        const seen = required.filter((s) => !!ctx.events.screenFirstVisit[s]).length;
        return count(seen, required.length);
      }
      const lastVisits = required.map((s) => ctx.events.screenLastVisit[s]);
      const sameDay =
        lastVisits.every(Boolean) && new Set(lastVisits).size === 1;
      return count(sameDay ? required.length : lastVisits.filter(Boolean).length, required.length);
    }

    case 'nightOwl':
      return done(ctx.hasNightOwlNote);

    case 'earlyBird':
      return done(ctx.events.earlyBirdDates.length > 0);

    case 'weekdayReflectionMonth': {
      // Every occurrence of `weekday` inside one calendar month had a reflection note.
      const months: Record<string, { total: number; withNote: number }> = {};
      for (const day of ctx.days) {
        if (day.weekday !== rule.weekday) continue;
        const key = day.date.slice(0, 7);
        if (!months[key]) months[key] = { total: 0, withNote: 0 };
        months[key].total += 1;
        if (day.notes) months[key].withNote += 1;
      }
      return done(
        Object.values(months).some((m) => m.total >= 4 && m.withNote === m.total)
      );
    }

    // ---- not yet earnable --------------------------------------------------------------------
    case 'manual':
      return done(false);

    default: {
      // Exhaustiveness guard: adding a rule kind without handling it here is a compile error.
      const unreachable: never = rule;
      return done(Boolean(unreachable));
    }
  }
}
