// Foundations: the answers someone builds on for the rest of the programme - their starting
// wheel, their why, their story, their standard. Andrew's model (8 Oct 2026):
//
// - Each foundation has ONE home: the day it was first written (the why lives on Day 4).
// - Every change is kept, dated. Nothing is overwritten. The first version is the benchmark.
// - A later day that calls one up (Day 20 "it has grown", Day 29's second look) or My
//   Journey's "it has grown" saves back into that same record, and the home day's own answer
//   is updated to match - so Day 4 always shows the current why. No hopping between days.
// - An edit on the same day as the latest version replaces it (fixing a typo is not a new
//   chapter); an edit on any later day adds a version.
//
// Ordinary answers ("how long will it take?") are not foundations: they edit in place on
// their own day with no history, as always.

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  FIELD_INDEX,
  getChallengeResponses,
  hasAnswerContent,
  submitChallengeResponse,
  type ChallengeAnswer,
  type ChallengeDayDef,
  type ChallengeResponses,
} from './challengeStore';

const KEY = 'ithrive30_foundations_v1';

export type FoundationVersion = {
  value: ChallengeAnswer;
  /** Local YYYY-MM-DD - local getters only, never toISOString (AGENTS.md). */
  date: string;
  at: string;
  /** The field that wrote it, e.g. 'foundation.d20.q2', or 'my_journey'. */
  source: string;
  /** Challenge day it was written on, 0 when it came from My Journey. */
  day: number;
};

export type FoundationStore = Record<string, FoundationVersion[]>;

export type FoundationDef = {
  key: string;
  /** The field that is its home. */
  home: string;
  /** Working label - final words from Chat (handoff/CHANGES.md item 19). */
  label: string;
  /** Offers "it has grown" in My Journey. The wheel is only re-rated on its own days. */
  evolves: boolean;
  /** Other answers shown with it, read-only (the promise's witness and check-in). */
  alongside?: string[];
  /** Not listed in My Journey's foundations (shown in the Wheel view instead). */
  hidden?: boolean;
};

export const FOUNDATIONS: FoundationDef[] = [
  { key: 'wheel', home: 'foundation.d01.q1', label: 'Your starting point', evolves: false },
  { key: 'focus_area', home: 'foundation.d01.q2', label: 'The area you chose to own', evolves: false },
  { key: 'vision', home: 'foundation.d02.q2', label: 'Your Next Best Self', evolves: false },
  { key: 'why', home: 'foundation.d04.q2', label: 'Your why', evolves: true },
  {
    key: 'promise',
    home: 'foundation.d06.q1',
    label: 'Your promise',
    evolves: false,
    alongside: ['foundation.d06.q2', 'foundation.d14.witness'],
  },
  { key: 'avoided', home: 'foundation.d15.q2', label: 'The work you were avoiding', evolves: false },
  { key: 'story', home: 'foundation.d16.q2', label: 'Your old story', evolves: true },
  { key: 'opposite_story', home: 'foundation.d17.q1', label: 'Your opposite story', evolves: true },
  { key: 'proof', home: 'foundation.d22.q2', label: 'Your proof', evolves: false },
  { key: 'standard', home: 'foundation.d23.q2', label: 'Your standard', evolves: true },
  { key: 'note_to_day1', home: 'foundation.d24.q1', label: 'Your note to Day 1', evolves: false },
  { key: 'carry_lines', home: 'foundation.d26.q1', label: 'The lines you keep', evolves: false },
  {
    key: 'what_stays',
    home: 'foundation.d27.q3',
    label: 'What stays',
    evolves: true,
    alongside: ['foundation.d27.q1', 'foundation.d27.q2'],
  },
  { key: 'wheel_return', home: 'foundation.d29.q1', label: 'Your wheel, Day 29', evolves: false, hidden: true },
];

/** Fields that write into a foundation that is NOT their home. */
const UPDATERS: Record<string, string> = {
  'foundation.d20.q2': 'why', // "It has grown" on Day 20
  'foundation.d29.q2': 'wheel', // the second look
};

function foundationForField(fieldId: string): FoundationDef | undefined {
  const viaUpdater = UPDATERS[fieldId];
  if (viaUpdater) return FOUNDATIONS.find((f) => f.key === viaUpdater);
  return FOUNDATIONS.find((f) => f.home === fieldId);
}

function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function same(a: ChallengeAnswer | undefined, b: ChallengeAnswer | undefined): boolean {
  return JSON.stringify(a ?? '') === JSON.stringify(b ?? '');
}

export async function getFoundations(): Promise<FoundationStore> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveStore(store: FoundationStore): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Best-effort. The day's own answer is saved separately, so nothing is lost.
  }
}

/** Erases every foundation. Used only by the tester's "start the challenge again". */
export async function clearFoundations(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}

/** Adds a version, or replaces the latest when it was written today by the same source. */
function addVersion(store: FoundationStore, key: string, version: FoundationVersion): boolean {
  const versions = store[key] ?? [];
  const latest = versions[versions.length - 1];
  if (latest && same(latest.value, version.value)) return false;
  if (latest && latest.date === version.date && latest.source === version.source) {
    versions[versions.length - 1] = version;
  } else {
    versions.push(version);
  }
  store[key] = versions;
  return true;
}

/**
 * Updates the home day's own answer to the current version, so the home day always shows
 * it. Only when the home day already has a response: writing into an unanswered day would
 * quietly mark it done.
 */
async function mirrorIntoHome(def: FoundationDef, value: ChallengeAnswer): Promise<void> {
  const home = FIELD_INDEX[def.home];
  if (!home) return;
  const responses = await getChallengeResponses();
  const existing = responses[home.dayId];
  if (!existing) return;
  if (same(existing.answers[home.index], value)) return;
  const answers = [...existing.answers];
  answers[home.index] = value;
  await submitChallengeResponse(home.dayId, answers);
}

/** Is a field on screen? show_if hides some until another answer on the same day matches. */
export function isFieldVisible(day: ChallengeDayDef, index: number, answers: ChallengeAnswer[]): boolean {
  const cond = day.fields[index]?.showIf;
  if (!cond) return true;
  const target = day.fields.findIndex((f) => f.id === cond.field);
  return target >= 0 && answers[target] === cond.equals;
}

/**
 * Called whenever a challenge day is saved. Records a version for every foundation the day
 * wrote, and mirrors updates from a later day back into the home day.
 */
export async function recordDayFoundations(day: ChallengeDayDef, answers: ChallengeAnswer[]): Promise<void> {
  const store = await getFoundations();
  const mirrors: { def: FoundationDef; value: ChallengeAnswer }[] = [];
  let changed = false;

  day.fields.forEach((field, index) => {
    if (!field.id) return;
    const def = foundationForField(field.id);
    if (!def) return;
    if (!isFieldVisible(day, index, answers)) return;
    const value = answers[index];
    if (!hasAnswerContent([value ?? ''])) return;
    const wrote = addVersion(store, def.key, {
      value,
      date: localDateKey(),
      at: new Date().toISOString(),
      source: field.id,
      day: day.day,
    });
    if (wrote) changed = true;
    if (field.id !== def.home) mirrors.push({ def, value });
  });

  if (changed) await saveStore(store);
  for (const m of mirrors) await mirrorIntoHome(m.def, m.value);
}

/** My Journey's "it has grown": a new dated version, mirrored into the home day. */
export async function growFoundation(key: string, value: string): Promise<FoundationStore> {
  const def = FOUNDATIONS.find((f) => f.key === key);
  const trimmed = value.trim();
  const store = await getFoundations();
  if (!def || !trimmed) return store;
  const wrote = addVersion(store, key, {
    value: trimmed,
    date: localDateKey(),
    at: new Date().toISOString(),
    source: 'my_journey',
    day: 0,
  });
  if (wrote) {
    await saveStore(store);
    await mirrorIntoHome(def, trimmed);
  }
  return store;
}

/**
 * A foundation's current value: its latest version, or - for answers saved before the
 * store existed - the home day's own answer. undefined when it has never been written.
 */
export function currentValue(
  key: string,
  store: FoundationStore,
  responses: ChallengeResponses
): ChallengeAnswer | undefined {
  const versions = store[key];
  if (versions && versions.length) return versions[versions.length - 1].value;
  const def = FOUNDATIONS.find((f) => f.key === key);
  const home = def ? FIELD_INDEX[def.home] : undefined;
  const fromDay = home ? responses[home.dayId]?.answers[home.index] : undefined;
  return fromDay !== undefined && hasAnswerContent([fromDay]) ? fromDay : undefined;
}

/** Any field's current answer by copy id - foundations resolve to their latest version. */
export function answerById(
  fieldId: string,
  store: FoundationStore,
  responses: ChallengeResponses
): ChallengeAnswer | undefined {
  const asFoundation = FOUNDATIONS.find((f) => f.home === fieldId);
  if (asFoundation) return currentValue(asFoundation.key, store, responses);
  const loc = FIELD_INDEX[fieldId];
  if (!loc) return undefined;
  const value = responses[loc.dayId]?.answers[loc.index];
  return value !== undefined && hasAnswerContent([value]) ? value : undefined;
}

/** The most recent wheel: Day 29's when there is one, otherwise the Day 1 wheel as it stands. */
export function latestWheel(store: FoundationStore, responses: ChallengeResponses): ChallengeAnswer | undefined {
  return answerById('foundation.d29.q1', store, responses) ?? currentValue('wheel', store, responses);
}

/** The area chosen on Day 1, or '' when Day 1's second question hasn't been answered. */
export function focusArea(store: FoundationStore, responses: ChallengeResponses): string {
  const v = currentValue('focus_area', store, responses);
  return typeof v === 'string' ? v : '';
}
