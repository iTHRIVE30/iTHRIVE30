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
  | 'dropdown';

export type ChallengeField = {
  prompt: string;
  type: ChallengeFieldType;
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

export type ChallengeDayDef = {
  id: string;
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
