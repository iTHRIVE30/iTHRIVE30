// Shared types for the achievements / rewards engine.
//
// A rule is plain serialisable data, never a function - that's what lets data.ts stay
// auto-generated from the spreadsheet. evaluate.ts is the single place that turns a rule
// into a yes/no against the user's actual history.

/** Ids used inside a `comboDays` rule. Plain habit ids, or 'r:<field>' for a reflection. */
export type ComboId = string;

export type AchievementRule =
  // --- habit & reflection totals -------------------------------------------------
  /** The habit was ticked on `count` separate days (gaps allowed). */
  | { kind: 'habitDays'; habitId: string; count: number }
  /** The reflection field was filled in on `count` separate days. */
  | { kind: 'reflectionDays'; field: 'intention' | 'gratitude' | 'notes' | 'mood'; count: number }
  /** At least one habit ticked on `count` separate days. */
  | { kind: 'anyHabitDays'; count: number }
  /** At least one habit ticked, `days` days running. */
  | { kind: 'anyHabitStreak'; days: number }
  /** Total individual habit ticks across all days. */
  | { kind: 'totalCheckOffs'; count: number }

  // --- streaks --------------------------------------------------------------------
  /** All 9 core habits, `days` days running. */
  | { kind: 'coreStreak'; days: number }
  /** Every habit the user currently has (core + custom + challenge), `days` days running. */
  | { kind: 'allHabitStreak'; days: number }
  /** Went `days` days with no completely blank day. */
  | { kind: 'noBlankDays'; days: number }
  /** Logged at least one habit in each of `weeks` consecutive calendar weeks. */
  | { kind: 'weeklyActive'; weeks: number }

  // --- combinations ---------------------------------------------------------------
  /** All of `ids` completed on the same day, on `count` separate days. */
  | { kind: 'comboDays'; ids: ComboId[]; count: number }
  /** Any `n` or more habits on the same day, on `count` separate days. */
  | { kind: 'comboAnyN'; n: number; count: number }
  /** All 9 core habits on the same day, on `count` separate days. */
  | { kind: 'allCoreDays'; count: number }
  /** All core habits AND all reflection prompts on the same day, `count` times. */
  | { kind: 'fullCircleDays'; count: number }
  /** Every habit on both Saturday and Sunday, `weekends` weekends running. */
  | { kind: 'weekendPerfect'; weekends: number }

  // --- levels & challenges ---------------------------------------------------------
  | { kind: 'levelComplete'; level: number }
  | { kind: 'levelsCompleted'; count: number }
  /** A Level finished with a response on every single written day. */
  | { kind: 'levelPerfect' }
  /** A Level finished despite at least one missed day along the way. */
  | { kind: 'levelCompleteWithMiss' }
  /** Every response in a Level submitted on its own calendar day. */
  | { kind: 'challengeOnTimeLevel' }
  /** `count` challenge responses of `words`+ words. */
  | { kind: 'challengeWordy'; words: number; count: number }
  /** Challenge responses submitted `days` days running. */
  | { kind: 'challengeStreak'; days: number }
  /** Challenge days completed on `count` separate `weekday`s (0 = Sunday). */
  | { kind: 'challengeWeekday'; weekday: number; count: number }
  /** First challenge submitted within 24h of the first ever check-in. */
  | { kind: 'firstChallengeWithin24h' }
  /** An already-submitted challenge response was later edited. */
  | { kind: 'challengeEdited' }

  // --- long-run consistency ---------------------------------------------------------
  /** Average daily completion across a finished Level is `percent`+. */
  | { kind: 'levelAvgCompletion'; percent: number }
  /** Monthly completion % improved (or held, if `allowHold`) `months` months running. */
  | { kind: 'monthsRising'; months: number; allowHold: boolean }
  /** `percent`+ completion held across `months` consecutive months. */
  | { kind: 'completionMonths'; percent: number; months: number }
  /** `months` months between the first check-in and today. */
  | { kind: 'accountMonths'; months: number }
  /** Used the app in `count` different calendar seasons. */
  | { kind: 'seasonsUsed'; count: number }
  /** The first ever check-in fell in calendar month `month` (1 = January). */
  | { kind: 'startedInMonth'; month: number }

  // --- mood ---------------------------------------------------------------------------
  /** All five mood values have been used at least once. */
  | { kind: 'moodAllValues' }
  /** Mood of `min`+ on `days` days running. */
  | { kind: 'moodHighStreak'; min: number; days: number }
  /** A 1 or 2-star mood logged on `count` separate days. */
  | { kind: 'moodLowDays'; count: number }
  /** A 1-star mood day followed by a check-in the next day. */
  | { kind: 'moodLowThenNextDay' }
  /** A habit logged on a day rated 1 star. */
  | { kind: 'habitOnLowMoodDay' }
  /** Average mood improved from one calendar month to the next. */
  | { kind: 'moodImprovedMonth' }
  /** A 7-day core streak survived a week containing a 1-star mood day. */
  | { kind: 'streakThroughLowMoodWeek' }

  // --- resilience -------------------------------------------------------------------
  /** Returned and checked in after a gap of `days`+ days. */
  | { kind: 'gapReturn'; days: number }
  /** Filled in `count` past days using the 5-day history strip. */
  | { kind: 'backfillDays'; count: number }
  /** Started a new streak the day after one broke. */
  | { kind: 'streakRestartedNextDay' }
  /** A later streak beat the previous best. */
  | { kind: 'streakBeatPrevious' }
  /** Rebuilt a `days`-day streak after an earlier one broke. */
  | { kind: 'streakRebuilt'; days: number }

  // --- personalization ----------------------------------------------------------------
  /** `count` of the 3 customizable slots have been renamed. */
  | { kind: 'customRenamed'; count: number }
  /** A custom slot ticked on `count` days - the same slot if `sameSlot`, else combined. */
  | { kind: 'customHabitDays'; count: number; sameSlot: boolean }
  /** `count` distinct labels have been used on the "One new thing" slot. */
  | { kind: 'newThingEntries'; count: number }

  // --- goals (My Journey) ----------------------------------------------------------------
  | { kind: 'goalsSet'; count: number }
  | { kind: 'goalsAchieved'; count: number }
  /** Goals set (or achieved, if `achieved`) across `count` distinct life categories. */
  | { kind: 'goalCategories'; count: number; achieved: boolean }
  /** A goal with all three questions answered. */
  | { kind: 'goalAllFields' }
  /** `count` goals open at the same time. */
  | { kind: 'goalsActive'; count: number }
  | { kind: 'goalAchievedWithin'; days: number }
  | { kind: 'goalAchievedAfter'; days: number }
  | { kind: 'goalsAchievedInMonth'; count: number }
  /** A goal still open `months` months after it was set. */
  | { kind: 'goalHeldMonths'; months: number }

  // --- transformation montages -------------------------------------------------------
  /** The montage for a specific Level is unlocked (Level finished, 2+ photos). */
  | { kind: 'montageUnlocked'; level: number }
  /** `count` or more of the four badge montages unlocked. */
  | { kind: 'montagesUnlocked'; count: number }
  /** All four badge montages (Levels 4, 6, 10, 12) unlocked. */
  | { kind: 'allMontagesUnlocked' }
  /** A montage has actually been watched, not merely listed. */
  | { kind: 'montageViewed' }
  /** The Day 1 / latest-day comparison has been opened. */
  | { kind: 'sideBySideViewed' }

  // --- app engagement ------------------------------------------------------------------
  | { kind: 'archiveOpened' }
  /** Every main screen visited - all in one day if `sameDay`. */
  | { kind: 'screensVisited'; sameDay: boolean }
  /** A note written after 11pm. */
  | { kind: 'nightOwl' }
  /** A full day's habits completed before 8am. */
  | { kind: 'earlyBird' }
  /** Every Sunday in a calendar month had a reflection note. */
  | { kind: 'weekdayReflectionMonth'; weekday: number }

  // --- not yet earnable -------------------------------------------------------------------
  /** Describes a feature that doesn't exist yet. Always locked; `reason` is shown in the UI. */
  | { kind: 'manual'; reason: string };

export type Achievement = {
  id: string;
  category: string;
  /** Position within a ladder (Habit Mastery / Reflection / Daily Streak), else null. */
  tier: number | null;
  name: string;
  requirement: string;
  /**
   * Difficulty weight, carried over from the spreadsheet. Points are no longer shown to
   * anyone - this is kept only to rank badges by how hard they are (it drives the order of
   * the "closest to earning" list). Never surface it as a score.
   */
  points: number;
  rule: AchievementRule;
};

/** An achievement plus where the user stands on it. */
export type AchievementStatus = {
  achievement: Achievement;
  earned: boolean;
  /** 0-1. Only meaningful for countable rules; 0 or 1 for the rest. */
  progress: number;
  /** Current value / target, for rules that have a countable target. */
  current: number;
  target: number;
  /** Set when the rule is `manual` - why this one can't be earned yet. */
  lockedReason?: string;
  /**
   * What this badge says to you. Shown once earned - the whole reward is the sentence,
   * so it is never empty.
   */
  encouragement: string;
  /**
   * `major` badges represent months of work and are the only ones Wins shows. Everything
   * else is a step along the way and lives in My Journey, where it can be browsed without
   * turning the app into a scoreboard.
   */
  significance: 'minor' | 'major';
};

/**
 * There is deliberately no score, no currency and no redemption ladder in here.
 *
 * The programme is about the work and about seeing your own progress - so a badge carries
 * words about what you actually did, not a number you can trade. If a future request asks
 * for points back, it's a product decision, not a missing feature.
 */
export type BadgeSummary = {
  /** How many badges are earned, out of how many can ever be earned. */
  earnedCount: number;
  totalCount: number;
  /** Badges that describe features that don't exist yet (Teams, montages). */
  lockedCount: number;
  /** 0-1 across every currently-earnable badge. */
  completion: number;
  currentLevel: number;
  statuses: AchievementStatus[];
  /** Closest unearned, earnable badges - the "next up" list. */
  nextUp: AchievementStatus[];
  /** Most recently earned first, for the "latest" callout. */
  recentlyEarned: AchievementStatus[];
};
