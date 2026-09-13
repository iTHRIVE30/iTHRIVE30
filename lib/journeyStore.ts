import AsyncStorage from '@react-native-async-storage/async-storage';

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
};

const CATEGORIES_KEY = 'ithrive30_journey_categories';
const GOALS_KEY = 'ithrive30_journey_goals';

const DEFAULT_CATEGORIES: JourneyCategory[] = [
  { id: 'life', name: 'Life', isDefault: true },
  { id: 'professionally', name: 'Professionally', isDefault: true },
  { id: 'personally', name: 'Personally', isDefault: true },
  { id: 'relationships', name: 'Relationships', isDefault: true },
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Categories ----------

export async function getCategories(): Promise<JourneyCategory[]> {
  const raw = await AsyncStorage.getItem(CATEGORIES_KEY);
  if (!raw) return DEFAULT_CATEGORIES;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
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

/** Default categories (Life/Professionally/Personally/Relationships) can't be deleted. */
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

export async function addGoal(categoryId: string, achieve: string, feel: string, impact: string): Promise<JourneyGoal[]> {
  const goals = await getGoals();
  const newGoal: JourneyGoal = {
    id: generateId(),
    categoryId,
    achieve,
    feel,
    impact,
    createdAt: new Date().toISOString(),
    completed: false,
  };
  const updated = [newGoal, ...goals];
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

export async function deleteGoal(id: string): Promise<JourneyGoal[]> {
  const goals = await getGoals();
  const updated = goals.filter((g) => g.id !== id);
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  return updated;
}
