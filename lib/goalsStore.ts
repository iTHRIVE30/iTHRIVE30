import AsyncStorage from '@react-native-async-storage/async-storage';

export type Goal = {
  id: string;
  text: string;
  createdAt: string;
  completed: boolean;
  completedAt?: string;
};

export type Milestone = {
  id: string;
  targetText: string; // "When I reach ___"
  rewardText: string; // "I get to ___"
  createdAt: string;
  achieved: boolean;
  achievedAt?: string;
};

const GOALS_KEY = 'ithrive30_goals';
const MILESTONES_KEY = 'ithrive30_milestones';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Goals ----------

export async function getGoals(): Promise<Goal[]> {
  const raw = await AsyncStorage.getItem(GOALS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function addGoal(text: string): Promise<Goal[]> {
  const goals = await getGoals();
  const newGoal: Goal = { id: generateId(), text, createdAt: new Date().toISOString(), completed: false };
  const updated = [newGoal, ...goals];
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  return updated;
}

export async function toggleGoal(id: string): Promise<Goal[]> {
  const goals = await getGoals();
  const updated = goals.map((g) =>
    g.id === id
      ? { ...g, completed: !g.completed, completedAt: !g.completed ? new Date().toISOString() : undefined }
      : g
  );
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteGoal(id: string): Promise<Goal[]> {
  const goals = await getGoals();
  const updated = goals.filter((g) => g.id !== id);
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  return updated;
}

// ---------- Milestones ----------

export async function getMilestones(): Promise<Milestone[]> {
  const raw = await AsyncStorage.getItem(MILESTONES_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function addMilestone(targetText: string, rewardText: string): Promise<Milestone[]> {
  const milestones = await getMilestones();
  const newMilestone: Milestone = {
    id: generateId(),
    targetText,
    rewardText,
    createdAt: new Date().toISOString(),
    achieved: false,
  };
  const updated = [newMilestone, ...milestones];
  await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(updated));
  return updated;
}

export async function toggleMilestone(id: string): Promise<Milestone[]> {
  const milestones = await getMilestones();
  const updated = milestones.map((m) =>
    m.id === id
      ? { ...m, achieved: !m.achieved, achievedAt: !m.achieved ? new Date().toISOString() : undefined }
      : m
  );
  await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteMilestone(id: string): Promise<Milestone[]> {
  const milestones = await getMilestones();
  const updated = milestones.filter((m) => m.id !== id);
  await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(updated));
  return updated;
}
