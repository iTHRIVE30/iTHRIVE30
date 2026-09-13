import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';

export type HabitDef = { id: string; label: string; editable: boolean; auto: boolean };
export type DailyLog = { [habitId: string]: boolean };
export type FullLog = { [dateKey: string]: DailyLog };
export type GratitudeEntries = [string, string, string];

export type ActivityDetail = { types: string[]; other: string };
export type ReadingDetail = {
  bookTitle: string;
  bookAuthor: string;
  podcastTitle: string;
  podcastHost: string;
  podcastGuest: string;
};
export type NoteEntry = { id: string; text: string; timestamp: string };

const HABITS_KEY = 'ithrive30_habits_v4'; // bumped: water's label/auto flag changed
const LOG_KEY = 'ithrive30_log';
const INTENTION_KEY_PREFIX = 'ithrive30_intention_';
const GRATITUDE_KEY_PREFIX = 'ithrive30_gratitude_';
const MOOD_KEY_PREFIX = 'ithrive30_mood_';
const ACTIVITY_KEY_PREFIX = 'ithrive30_activity_detail_';
const FRUIT_KEY_PREFIX = 'ithrive30_fruit_detail_';
const READING_KEY_PREFIX = 'ithrive30_reading_detail_';
const WATER_CUPS_KEY_PREFIX = 'ithrive30_water_cups_';
const SELFIE_KEY_PREFIX = 'ithrive30_selfie_';
const NOTES_KEY_PREFIX = 'ithrive30_notes_';

const SELFIE_ALBUM_NAME = 'iTHRIVE30';
export const WATER_GOAL_CUPS = 8;
export const WATER_SCALE_MAX = 10;
export const MOOD_SCALE_MAX = 5;

export const DEFAULT_HABITS: HabitDef[] = [
  { id: 'activity', label: '30-45 mins Physical Activity', editable: false, auto: false },
  { id: 'steps', label: '10,000+ steps', editable: false, auto: true },
  { id: 'alcohol-free', label: 'Alcohol Free', editable: false, auto: false },
  { id: 'no-tv', label: 'No TV', editable: false, auto: false },
  { id: 'no-takeaway', label: 'No takeaway', editable: false, auto: false },
  { id: 'fruit', label: 'Two pieces of fruit daily', editable: false, auto: false },
  { id: 'water', label: '8 cups of water', editable: false, auto: true },
  { id: 'reading', label: 'Read Daily 7+ pages', editable: false, auto: false },
  { id: 'selfie', label: 'One selfie daily uploaded', editable: false, auto: false },
  { id: 'app-tasks', label: "Today's Challenge", editable: false, auto: true },
  { id: 'new-thing', label: 'One new thing', editable: true, auto: false },
  { id: 'choose-own', label: 'Choose your own', editable: true, auto: false },
  { id: 'bonus', label: 'Bonus', editable: true, auto: false },
];

/** Local YYYY-MM-DD key, built from local getters (never toISOString - see analytics.ts for why). */
export function getTodayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ---------- Habits & daily log ----------

export async function getHabits(): Promise<HabitDef[]> {
  const raw = await AsyncStorage.getItem(HABITS_KEY);
  if (!raw) return DEFAULT_HABITS;
  try { return JSON.parse(raw); } catch { return DEFAULT_HABITS; }
}

export async function saveHabitLabel(id: string, newLabel: string): Promise<HabitDef[]> {
  const habits = await getHabits();
  const updated = habits.map((h) => (h.id === id ? { ...h, label: newLabel } : h));
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(updated));
  return updated;
}

export async function getFullLog(): Promise<FullLog> {
  const raw = await AsyncStorage.getItem(LOG_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export async function getLogForDate(dateKey: string): Promise<DailyLog> {
  const full = await getFullLog();
  return full[dateKey] || {};
}

export async function toggleHabit(dateKey: string, habitId: string): Promise<DailyLog> {
  const full = await getFullLog();
  const day = full[dateKey] || {};
  day[habitId] = !day[habitId];
  full[dateKey] = day;
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(full));
  return day;
}

export async function setHabitValue(dateKey: string, habitId: string, value: boolean): Promise<DailyLog> {
  const full = await getFullLog();
  const day = full[dateKey] || {};
  day[habitId] = value;
  full[dateKey] = day;
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(full));
  return day;
}

// ---------- Intention & gratitude ----------

export async function getIntention(dateKey: string): Promise<string> {
  const raw = await AsyncStorage.getItem(INTENTION_KEY_PREFIX + dateKey);
  return raw || '';
}

export async function saveIntention(dateKey: string, text: string): Promise<void> {
  await AsyncStorage.setItem(INTENTION_KEY_PREFIX + dateKey, text);
}

export async function getGratitude(dateKey: string): Promise<GratitudeEntries> {
  const raw = await AsyncStorage.getItem(GRATITUDE_KEY_PREFIX + dateKey);
  if (!raw) return ['', '', ''];
  try { return JSON.parse(raw); } catch { return ['', '', '']; }
}

export async function saveGratitude(dateKey: string, entries: GratitudeEntries): Promise<void> {
  await AsyncStorage.setItem(GRATITUDE_KEY_PREFIX + dateKey, JSON.stringify(entries));
}

// ---------- Mood ----------

/**
 * Daily mood scale, captured directly on the Today tab (replaces the old Evening Reflection).
 * 0 = not yet rated (skippable), otherwise 1-5. Independent of whether the day's Challenge was done,
 * so Progress's Mood chart can show a value even on days the Challenge was skipped.
 */
export async function getMoodRating(dateKey: string): Promise<number> {
  const raw = await AsyncStorage.getItem(MOOD_KEY_PREFIX + dateKey);
  return raw ? Number(raw) : 0;
}

export async function saveMoodRating(dateKey: string, rating: number): Promise<void> {
  await AsyncStorage.setItem(MOOD_KEY_PREFIX + dateKey, String(rating));
}

// ---------- Habit detail (all optional - encouraged, never required) ----------

export async function getActivityDetail(dateKey: string): Promise<ActivityDetail> {
  const raw = await AsyncStorage.getItem(ACTIVITY_KEY_PREFIX + dateKey);
  if (!raw) return { types: [], other: '' };
  try { return JSON.parse(raw); } catch { return { types: [], other: '' }; }
}

export async function saveActivityDetail(dateKey: string, detail: ActivityDetail): Promise<void> {
  await AsyncStorage.setItem(ACTIVITY_KEY_PREFIX + dateKey, JSON.stringify(detail));
}

export async function getFruitDetail(dateKey: string): Promise<string> {
  const raw = await AsyncStorage.getItem(FRUIT_KEY_PREFIX + dateKey);
  return raw || '';
}

export async function saveFruitDetail(dateKey: string, text: string): Promise<void> {
  await AsyncStorage.setItem(FRUIT_KEY_PREFIX + dateKey, text);
}

const EMPTY_READING_DETAIL: ReadingDetail = {
  bookTitle: '', bookAuthor: '', podcastTitle: '', podcastHost: '', podcastGuest: '',
};

export async function getReadingDetail(dateKey: string): Promise<ReadingDetail> {
  const raw = await AsyncStorage.getItem(READING_KEY_PREFIX + dateKey);
  if (!raw) return { ...EMPTY_READING_DETAIL };
  try { return { ...EMPTY_READING_DETAIL, ...JSON.parse(raw) }; } catch { return { ...EMPTY_READING_DETAIL }; }
}

export async function saveReadingDetail(dateKey: string, detail: ReadingDetail): Promise<void> {
  await AsyncStorage.setItem(READING_KEY_PREFIX + dateKey, JSON.stringify(detail));
}

/** 0-10 cups. Reaching WATER_GOAL_CUPS (8) marks the water habit complete, but the scale allows logging past the goal. */
export async function getWaterCups(dateKey: string): Promise<number> {
  const raw = await AsyncStorage.getItem(WATER_CUPS_KEY_PREFIX + dateKey);
  return raw ? Number(raw) : 0;
}

export async function saveWaterCups(dateKey: string, cups: number): Promise<void> {
  await AsyncStorage.setItem(WATER_CUPS_KEY_PREFIX + dateKey, String(cups));
}

// ---------- Selfie ----------

export async function getSelfiePhoto(dateKey: string): Promise<string | null> {
  const raw = await AsyncStorage.getItem(SELFIE_KEY_PREFIX + dateKey);
  return raw || null;
}

/**
 * Stored locally (as a local file URI) for now. This is the hook point for cloud storage:
 * once a backend exists, upload `uri` here and store the returned remote URL instead.
 */
export async function saveSelfiePhoto(dateKey: string, uri: string): Promise<void> {
  await AsyncStorage.setItem(SELFIE_KEY_PREFIX + dateKey, uri);
}

/** Saves the selfie into a dedicated "iTHRIVE30" album in the phone's own Photos/gallery app. */
export async function saveSelfieToGallery(uri: string): Promise<void> {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) return;
    const asset = await MediaLibrary.createAssetAsync(uri);
    const existingAlbum = await MediaLibrary.getAlbumAsync(SELFIE_ALBUM_NAME);
    if (existingAlbum) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], existingAlbum, false);
    } else {
      await MediaLibrary.createAlbumAsync(SELFIE_ALBUM_NAME, asset, false);
    }
  } catch (err) {
    console.log('Could not save selfie to gallery album:', err);
  }
}

// ---------- Notes (multiple timestamped reflections per day) ----------

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getNotes(dateKey: string): Promise<NoteEntry[]> {
  const raw = await AsyncStorage.getItem(NOTES_KEY_PREFIX + dateKey);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function addNote(dateKey: string, text: string): Promise<NoteEntry[]> {
  const notes = await getNotes(dateKey);
  const updated = [...notes, { id: generateId(), text, timestamp: new Date().toISOString() }];
  await AsyncStorage.setItem(NOTES_KEY_PREFIX + dateKey, JSON.stringify(updated));
  return updated;
}

export async function deleteNote(dateKey: string, noteId: string): Promise<NoteEntry[]> {
  const notes = await getNotes(dateKey);
  const updated = notes.filter((n) => n.id !== noteId);
  await AsyncStorage.setItem(NOTES_KEY_PREFIX + dateKey, JSON.stringify(updated));
  return updated;
}

// ---------- Bulk reflection index ----------

/**
 * Every reflection field, for every date ever recorded, in one pass.
 *
 * The achievements engine needs to ask questions like "how many days has an intention been
 * set?" across the user's whole history. Doing that with the per-date getters above would be
 * one AsyncStorage round trip per field per day - well over a thousand reads for a long-term
 * user, on every visit to Wins. getAllKeys + multiGet does it in two.
 *
 * Values are deliberately shallow (just "was something recorded on this date"), which is all
 * any achievement rule needs - except mood, where the actual 1-5 rating matters.
 */
export type ReflectionIndex = {
  intentionDates: string[];
  gratitudeDates: string[];
  noteDates: string[];
  /** Date -> 1-5 rating. Days with no rating are absent, never 0. */
  moodByDate: Record<string, number>;
};

export async function getReflectionIndex(): Promise<ReflectionIndex> {
  const index: ReflectionIndex = {
    intentionDates: [],
    gratitudeDates: [],
    noteDates: [],
    moodByDate: {},
  };

  // Only the four reflection fields - the habit ticks themselves already live in one blob
  // under LOG_KEY, and the per-habit detail panels aren't something any rule asks about.
  const prefixes = [
    INTENTION_KEY_PREFIX,
    GRATITUDE_KEY_PREFIX,
    MOOD_KEY_PREFIX,
    NOTES_KEY_PREFIX,
  ];

  let keys: readonly string[] = [];
  try {
    keys = await AsyncStorage.getAllKeys();
  } catch {
    return index;
  }

  const relevant = keys.filter((k) => prefixes.some((p) => k.startsWith(p)));
  if (relevant.length === 0) return index;

  let pairs: readonly [string, string | null][] = [];
  try {
    pairs = await AsyncStorage.multiGet(relevant);
  } catch {
    return index;
  }

  const parse = <T,>(raw: string | null, fallback: T): T => {
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  };

  for (const [key, raw] of pairs) {
    if (!raw) continue;

    if (key.startsWith(INTENTION_KEY_PREFIX)) {
      if (raw.trim()) index.intentionDates.push(key.slice(INTENTION_KEY_PREFIX.length));
    } else if (key.startsWith(GRATITUDE_KEY_PREFIX)) {
      const entries = parse<string[]>(raw, []);
      // The gratitude entry only counts as "completed" when all three prompts are filled in.
      if (entries.length === 3 && entries.every((e) => e && e.trim())) {
        index.gratitudeDates.push(key.slice(GRATITUDE_KEY_PREFIX.length));
      }
    } else if (key.startsWith(MOOD_KEY_PREFIX)) {
      const rating = Number(raw);
      if (rating > 0) index.moodByDate[key.slice(MOOD_KEY_PREFIX.length)] = rating;
    } else if (key.startsWith(NOTES_KEY_PREFIX)) {
      const notes = parse<NoteEntry[]>(raw, []);
      if (notes.length > 0) index.noteDates.push(key.slice(NOTES_KEY_PREFIX.length));
    }
  }

  index.intentionDates.sort();
  index.gratitudeDates.sort();
  index.noteDates.sort();

  return index;
}

/**
 * Which of these dates have anything recorded, in two storage round trips.
 *
 * `hasAnyDataForDate` does about ten reads per date, which was fine for a 5-day strip and
 * is not fine for a 30-day one. This answers the same question for a whole level at once.
 *
 * Slight difference in scope, deliberately: this checks habit ticks and the four reflection
 * fields, not the optional per-habit detail panels. A day with a water count but no water
 * tick doesn't exist in practice - logging the detail is how you tick the habit - and the
 * result only drives a dot on the day strip.
 */
export async function getDaysWithData(dateKeys: string[]): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  dateKeys.forEach((d) => { result[d] = false; });
  if (dateKeys.length === 0) return result;

  const [log, index] = await Promise.all([getFullLog(), getReflectionIndex()]);
  const withReflection = new Set([
    ...index.intentionDates,
    ...index.gratitudeDates,
    ...index.noteDates,
    ...Object.keys(index.moodByDate),
  ]);

  for (const date of dateKeys) {
    result[date] =
      Object.values(log[date] || {}).some(Boolean) || withReflection.has(date);
  }
  return result;
}

// ---------- Day status ----------

/**
 * True if literally anything has been recorded for this date. Used to decide whether a past
 * day is a locked, submitted artefact (has data) or still open to fill in (genuinely blank -
 * e.g. a day you forgot to open the app at all shouldn't be stuck wrong forever).
 */
export async function hasAnyDataForDate(dateKey: string): Promise<boolean> {
  const [log, intention, gratitude, activity, fruit, reading, waterCups, selfie, notes, mood] = await Promise.all([
    getLogForDate(dateKey),
    getIntention(dateKey),
    getGratitude(dateKey),
    getActivityDetail(dateKey),
    getFruitDetail(dateKey),
    getReadingDetail(dateKey),
    getWaterCups(dateKey),
    getSelfiePhoto(dateKey),
    getNotes(dateKey),
    getMoodRating(dateKey),
  ]);

  const anyHabitChecked = Object.values(log).some(Boolean);
  const anyText =
    !!intention ||
    gratitude.some(Boolean) ||
    !!fruit ||
    activity.types.length > 0 ||
    !!activity.other ||
    !!reading.bookTitle ||
    !!reading.bookAuthor ||
    !!reading.podcastTitle ||
    !!reading.podcastHost ||
    !!reading.podcastGuest;

  return anyHabitChecked || anyText || waterCups > 0 || !!selfie || notes.length > 0 || mood > 0;
}
