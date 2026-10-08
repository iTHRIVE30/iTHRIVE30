import AsyncStorage from '@react-native-async-storage/async-storage';

import { LIFE_AREAS } from './lifeWheel';

export type JourneyCategory = { id: string; name: string; isDefault: boolean };

export type JourneyGoal = {
  id: string;
  categoryId: string;
  achieve: string; // What do I want to achieve?
  feel: string;    // How will I feel when I get there?
  impact: string;  // Who else will be impacted?
  createdAt: string;
  completed: boolean;
  completedAt?: string;
  /** Optional local YYYY-MM-DD. A date makes a goal a commitment rather than a wish. */
  targetDate?: string;
  /** Set the first time the goal's wording is changed. Absent means never edited. */
  updatedAt?: string;
  /**
   * Outgrown, not failed, and not deleted. Archiving keeps the record - deleting destroys
   * it, and a goal you moved past is still part of the journey. Archived goals are hidden
   * from the working list and never counted as active.
   */
  archivedAt?: string;
};

const CATEGORIES_KEY = 'ithrive30_journey_categories';
const GOALS_KEY = 'ithrive30_journey_goals';

/**
 * The life wheel's eight areas (Andrew, 8 Oct 2026), so a goal sits beside that area's
 * wheel score. Replaced Life / Professionally / Personally / Relationships. Ids match the
 * wheel's area ids. The goal badges only count how many areas hold goals, so they are
 * unaffected by the names.
 */
const DEFAULT_CATEGORIES: JourneyCategory[] = LIFE_AREAS.map((a) => ({ id: a.id, name: a.name, isDefault: true }));

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Categories ----------

export async function getCategories(): Promise<JourneyCategory[]> {
  const raw = await AsyncStorage.getItem(CATEGORIES_KEY);
  if (!raw) return DEFAULT_CATEGORIES;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_CATEGORIES;
    // The defaults always come from code, so a list saved under the old four areas can't
    // bring them back; only the areas someone added themselves are kept from storage.
    const custom = (parsed as JourneyCategory[]).filter((c) => !c.isDefault);
    return [...DEFAULT_CATEGORIES, ...custom];
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function addCategory(name: string): Promise<JourneyCategory[]> {
  const categories = await getCategories();
  const updated = [...categories, { id: generateId(), name, isDefault: false }];
  await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated));
  return updated;
}

/** The eight wheel areas can't be deleted; areas someone added can. */
export async function deleteCategory(id: string): Promise<{ categories: JourneyCategory[]; goals: JourneyGoal[] }> {
  const categories = await getCategories();
  const updatedCategories = categories.filter((c) => c.id !== id || c.isDefault);
  await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(updatedCategories));

  const goals = await getGoals();
  const updatedGoals = goals.filter((g) => g.categoryId !== id);
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updatedGoals));

  return { categories: updatedCategories, goals: updatedGoals };
}

// ---------- Goals ----------

export async function getGoals(): Promise<JourneyGoal[]> {
  const raw = await AsyncStorage.getItem(GOALS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function addGoal(
  categoryId: string,
  achieve: string,
  feel: string,
  impact: string,
  targetDate?: string
): Promise<JourneyGoal[]> {
  const goals = await getGoals();
  const newGoal: JourneyGoal = {
    id: generateId(),
    categoryId,
    achieve,
    feel,
    impact,
    createdAt: new Date().toISOString(),
    completed: false,
    ...(targetDate ? { targetDate } : {}),
  };
  const updated = [newGoal, ...goals];
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Edits a goal's wording or target date, stamping `updatedAt`.
 *
 * A goal you can't correct is a goal a typo can cost you, and the fields here are the ones
 * people most want to sharpen once they've lived with them for a week. `updatedAt` is what
 * the "Revisit & Refine" badge derives from, so it is set here and nowhere else.
 */
export async function updateGoal(
  id: string,
  fields: { achieve?: string; feel?: string; impact?: string; targetDate?: string }
): Promise<JourneyGoal[]> {
  const goals = await getGoals();
  const updated = goals.map((g) =>
    g.id === id ? { ...g, ...fields, updatedAt: new Date().toISOString() } : g
  );
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Archives or restores a goal. Archiving is the honest alternative to deleting something
 * you've outgrown: the goal stops cluttering the list and stops counting as active, but
 * the fact that you once set it survives.
 */
export async function setGoalArchived(id: string, archived: boolean): Promise<JourneyGoal[]> {
  const goals = await getGoals();
  const updated = goals.map((g) => {
    if (g.id !== id) return g;
    if (!archived) {
      const { archivedAt: _removed, ...rest } = g;
      return rest;
    }
    return { ...g, archivedAt: new Date().toISOString() };
  });
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  return updated;
}

export async function toggleGoal(id: string): Promise<JourneyGoal[]> {
  const goals = await getGoals();
  const updated = goals.map((g) =>
    g.id === id
      ? { ...g, completed: !g.completed, completedAt: !g.completed ? new Date().toISOString() : undefined }
      : g
  );
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  return updated;
}

// ---------- Target date helpers ----------
// Local getters only, never toISOString - see AGENTS.md. Unlike a date of birth, a target
// date is expected to be in the future, so nothing here rejects one.

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY'. Returns '' for anything unparseable. */
export function formatTargetDate(iso?: string): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** 'DD/MM/YYYY' -> 'YYYY-MM-DD', or null while the text isn't yet a real calendar date. */
export function parseTargetDate(text: string): string | null {
  const m = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/.exec(text.trim());
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (year < 1900 || year > 2200 || month < 1 || month > 12) return null;

  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export async function deleteGoal(id: string): Promise<JourneyGoal[]> {
  const goals = await getGoals();
  const updated = goals.filter((g) => g.id !== id);
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  return updated;
}
