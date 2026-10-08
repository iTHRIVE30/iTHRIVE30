// Shared types for the challengeStore module. Kept separate so level content files only
// need to import types, not any of the logic in index.ts.

export type LevelDef = {
  id: string;
  number: number;
  name: string;
  introMessage?: string; // shown above Day 1 in the day list, e.g. a welcome message
};

/**
 * How a question is answered. The foundation challenge's question tags map onto these:
 *   JOURNAL       -> 'textarea'
 *   SELECT ONE    -> 'dropdown' (shown as chips, one at a time)
 *   SELECT THREE  -> 'multiselect' with max: 3
 *   SELECT ALL    -> 'multiselect'
 *   SCALE 1 TO 10 -> 'rating10' for one thing, 'scale10' with items for several
 */
export type ChallengeFieldType =
  | 'text'
  | 'textarea'
  | 'rating5'
  | 'rating10'
  | 'scale10'
  | 'multiselect'
  | 'dropdown'
  /** The life wheel: one 1-10 per life area. Answer: string[] in area order. */
  | 'wheel'
  /** The Day 1 wheel shown again, each score adjustable. Untouched saves nothing. */
  | 'second_look'
  /** A reflection day's one score for the focus area. Answer: [areaName, score]. */
  | 'pulse';

/** What tapping an option does besides selecting it (Day 24). */
export type OptionAction = 'share_progress' | 'save_to_wins';

export type ChallengeField = {
  /** The copy id from the JSON, e.g. 'foundation.d02.q2'. Other days refer to it by this. */
  id?: string;
  prompt: string;
  type: ChallengeFieldType;
  /**
   * Opens on this value without saving it: shown as chosen, but only stored once touched,
   * so opening and closing a day never fakes an answer. 'focus_area' = the Day 1 choice.
   */
  defaultFrom?: 'focus_area';
  /** 'lowest_score_first': life-area options sorted by this day's own wheel scores. */
  optionsOrder?: 'lowest_score_first';
  /** Options read live: 'tracker_habits', or another field's id (its current answer). */
  optionsSource?: string;
  optionActions?: Record<string, OptionAction>;
  /** Hidden until another field on the same day has this answer. */
  showIf?: { field: string; equals: string };
  /** The JSON's `saves`: this answer is (part of) a foundation - see lib/foundations.ts. */
  saves?: string;
  /** second_look / pulse: the field id whose answer it reads from. */
  source?: string;
  placeholder?: string;
  options?: string[]; // for multiselect / dropdown
  /** multiselect only: the most that can be picked at once (SELECT THREE is 3). */
  max?: number;
  /** multiselect only: adds a "+ add your own" chip that takes a typed answer. */
  allowCustom?: boolean;
  /**
   * scale10 only: the things being rated, each on its own 1-10 row. The answer is an array
   * of the same length, '' for a row not rated yet.
   */
  items?: string[];
};

/**
 * Shows an answer from an earlier day, read-only - e.g. the Day 7 reflection showing the
 * three words chosen on Day 1. Nothing is copied: it reads the earlier day's response live,
 * so editing Day 1 changes what Day 7 shows.
 */
export type ChallengeEcho = {
  dayId: string;
  fieldIndex: number;
  label: string;
  /** Shown when that day hasn't been answered yet. */
  empty: string;
};

/**
 * Display blocks that aren't questions. They read other days' answers live, and every one
 * has an empty state, because nothing ever blocks: a day can be opened before the day it
 * draws from has been done.
 */
export type ChallengePanel =
  /** Day 1: a line under the wheel once it has scores. */
  | { kind: 'after_save'; text: string; afterField: number }
  /** Day 2: the Day 1 wheel beside this day's three words. */
  | { kind: 'wheel_contrast'; title: string; text: string; wordsField: number }
  /** Reflection days: the Day 2 three words. */
  | { kind: 'vision'; source: string }
  /** Reflection days: this week's actions that were ticked done. Never a missed count. */
  | { kind: 'said_and_did' }
  /** Day 20: an earlier answer (the why), its current version, shown in place. */
  | { kind: 'replay'; label: string; source: string }
  /** Day 30: the Day 29 wheel over the starting wheel. */
  | { kind: 'wheel_reveal'; title: string; summary: string };

export type ChallengeDayDef = {
  id: string;
  /** The copy id from the JSON, e.g. 'foundation.d01'. */
  copyId?: string;
  /** 'reflection' days open on their framing lines and have no quote or action. */
  kind?: 'content' | 'reflection';
  /** Shown on the same line as the affirmation. Absent: "~ say that again…". */
  affirmationPrompt?: string;
  panels?: ChallengePanel[];
  day: number; // 1-30, position within its level
  title: string;
  theme: string;
  /**
   * The iTHRIVE30 voice line - the app speaking straight to the Thriver, one or two short
   * sentences, before the quote. Optional: levels written before the v5 format have none.
   */
  voice?: string;
  quote: string;
  /**
   * Who the quoted person is, in one short line, shown small under the attribution. Only on
   * the FIRST day a person is quoted - later days quote them without it.
   */
  quoteNote?: string;
  lesson: string;
  /** The day's affirmation, in the Thriver's own first person. Set in quote marks by the UI. */
  affirmation?: string;
  /** An optional sourced fact. Only a handful of days carry one. */
  fact?: string;
  /** Read-only answers from earlier days, shown above the questions. */
  echoes?: ChallengeEcho[];
  worksheetTitle: string; // heading shown above the fields - empty = no heading shown
  fields: ChallengeField[]; // the interactive worksheet fields for this day
  doThisLabel: string; // empty string = falls back to "Do This" in the UI
  doThis: string; // optional extra display-only callout
  /**
   * A tick under the action ("Done"), for days whose action says to tick it off here. Its
   * answer is stored one place after the last field: answers[fields.length].
   */
  actionCheck?: string;
  /** "Why it works": one verified finding under the action, with its source in small type. */
  actionProof?: string;
  actionProofSource?: string;
  goDeeper: string; // optional extra display-only footer text
};

export type ChallengeAnswer = string | string[];

export type ChallengeResponse = {
  answers: ChallengeAnswer[]; // positional, matches the day's fields
  moodRating: number; // 0 = not rated, 1-5 = collected via the post-submit mood popup
  completedAt: string;
};

export type ChallengeResponses = { [challengeId: string]: ChallengeResponse };
export type CompletedChallenges = { [challengeId: string]: string };
export type LevelProgress = { completedContentDays: number; totalContentDays: number };

export type TodayChallengeInfo = {
  level: LevelDef;
  levelDay: number;
  challenge: ChallengeDayDef | undefined;
  /** The day the user is up to has a response. */
  isDone: boolean;
  /** Any challenge day received its first response today (local date). */
  answeredToday: boolean;
  /** The current level's final day (Day 30) has been answered. */
  levelFinished: boolean;
  /** The next level, when it is unlocked, written, and waiting to be started. */
  nextLevel: LevelDef | null;
};
