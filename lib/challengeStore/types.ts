// Shared types for the challengeStore module. Kept separate so level content files only
// need to import types, not any of the logic in index.ts.

export type LevelDef = {
  id: string;
  number: number;
  name: string;
  introMessage?: string; // shown above Day 1 in the day list, e.g. a welcome message
};

export type ChallengeFieldType = 'text' | 'textarea' | 'rating5' | 'rating10' | 'multiselect' | 'dropdown';

export type ChallengeField = {
  prompt: string;
  type: ChallengeFieldType;
  placeholder?: string;
  options?: string[]; // for multiselect / dropdown
};

export type ChallengeDayDef = {
  id: string;
  day: number; // 1-30, position within its level
  title: string;
  theme: string;
  quote: string;
  lesson: string;
  worksheetTitle: string; // heading shown above the fields - empty = no heading shown
  fields: ChallengeField[]; // the interactive worksheet fields for this day
  doThisLabel: string; // empty string = falls back to "Do This" in the UI
  doThis: string; // optional extra display-only callout
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
  isDone: boolean;
};
