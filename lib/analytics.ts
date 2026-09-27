import { getFullLog, getHabits } from './habitStore';
import { getChallengeResponses } from './challengeStore';

export type HabitStreak = { habitId: string; label: string; current: number; best: number };
export type DayCompletion = { date: string; percent: number; completedCount: number; totalCount: number };
export type RatingPoint = { date: string; average: number; count: number };
export type HabitCompletionRate = { habitId: string; label: string; percent: number };
export type HabitCompletionCount = { habitId: string; label: string; count: number };
export type PerfectDayStreak = { current: number; best: number; totalPerfectDays: number };
export type HabitHistoryGrid = { dates: string[]; rows: { habitId: string; label: string; days: boolean[] }[] };
export type MonthPoint = { label: string; percent: number; year: number; month: number };
export type YearToDatePoint = { label: string; value: number };

// A streak scan never needs to look back further than this - keeps the math fast and bounded
// even if old test data or a stray date ever ends up far in the past in the log.
const MAX_STREAK_LOOKBACK_DAYS = 180;
// Absolute backstop for the date-range walk below (~10 years of days). No legitimate use of
// this app should ever need a range this large - if we hit it, something is wrong upstream,
// and returning a bounded (if incomplete) result beats freezing the app.
const MAX_RANGE_ITERATIONS = 3660;

/**
 * Formats a Date as a local YYYY-MM-DD key. Deliberately uses local getters (not
 * toISOString, which is UTC) - mixing the two caused a real freeze before: parsing a date
 * string as local time and then re-stringifying via toISOString silently loses a day for
 * anyone in a timezone ahead of UTC, which turns date-range loops into infinite ones.
 */
function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, delta: number): string {
  const d = new Date(dateKey + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

/** Sorted list of date keys between two dates, inclusive. Hard-capped so a date-math bug can never hang the app. */
function dateRange(startKey: string, endKey: string): string[] {
  const dates: string[] = [];
  let cur = startKey;
  let safety = 0;
  while (cur <= endKey && safety < MAX_RANGE_ITERATIONS) {
    dates.push(cur);
    cur = addDays(cur, 1);
    safety += 1;
  }
  return dates;
}

function boundedEarliestKey(loggedDates: string[], todayKey: string): string {
  const earliest = [...loggedDates].sort()[0];
  const cap = addDays(todayKey, -MAX_STREAK_LOOKBACK_DAYS);
  return earliest > cap ? earliest : cap;
}

// ---------- Habit streaks ----------

export async function getHabitStreaks(): Promise<HabitStreak[]> {
  const habits = await getHabits();
  const log = await getFullLog();
  const todayKey = toDateKey(new Date());
  const loggedDates = Object.keys(log);

  if (loggedDates.length === 0) {
    return habits.map((h) => ({ habitId: h.id, label: h.label, current: 0, best: 0 }));
  }

  const allDates = dateRange(boundedEarliestKey(loggedDates, todayKey), todayKey);

  return habits.map((habit) => {
    let best = 0;
    let running = 0;
    for (const date of allDates) {
      if (log[date]?.[habit.id]) {
        running += 1;
        best = Math.max(best, running);
      } else {
        running = 0;
      }
    }
    let current = 0;
    for (let i = allDates.length - 1; i >= 0; i--) {
      if (log[allDates[i]]?.[habit.id]) current += 1;
      else break;
    }
    return { habitId: habit.id, label: habit.label, current, best };
  });
}

/** Streak of "100% days" - every current habit checked off in the same day. */
export async function getPerfectDayStreak(): Promise<PerfectDayStreak> {
  const habits = await getHabits();
  const log = await getFullLog();
  const todayKey = toDateKey(new Date());
  const loggedDates = Object.keys(log);

  if (loggedDates.length === 0 || habits.length === 0) {
    return { current: 0, best: 0, totalPerfectDays: 0 };
  }

  const allDates = dateRange(boundedEarliestKey(loggedDates, todayKey), todayKey);
  const isPerfect = (date: string) => {
    const dayLog = log[date] || {};
    return habits.every((h) => dayLog[h.id]);
  };

  let best = 0;
  let running = 0;
  let totalPerfectDays = 0;
  for (const date of allDates) {
    if (isPerfect(date)) {
      running += 1;
      best = Math.max(best, running);
      totalPerfectDays += 1;
    } else {
      running = 0;
    }
  }

  let current = 0;
  for (let i = allDates.length - 1; i >= 0; i--) {
    if (isPerfect(allDates[i])) current += 1;
    else break;
  }

  return { current, best, totalPerfectDays };
}

// ---------- Completion charts ----------

export async function getDailyCompletion(days: number): Promise<DayCompletion[]> {
  const habits = await getHabits();
  const log = await getFullLog();
  const todayKey = toDateKey(new Date());
  const startKey = addDays(todayKey, -(days - 1));
  const dates = dateRange(startKey, todayKey);

  return dates.map((date) => {
    const dayLog = log[date] || {};
    const completedCount = habits.filter((h) => dayLog[h.id]).length;
    return {
      date,
      percent: habits.length ? Math.round((completedCount / habits.length) * 100) : 0,
      completedCount,
      totalCount: habits.length,
    };
  });
}

/** Completion rate per habit over the window (independent %s - don't sum these across habits). */
export async function getHabitCompletionRates(days: number): Promise<HabitCompletionRate[]> {
  const habits = await getHabits();
  const log = await getFullLog();
  const todayKey = toDateKey(new Date());
  const startKey = addDays(todayKey, -(days - 1));
  const dates = dateRange(startKey, todayKey);

  return habits
    .map((habit) => {
      const doneCount = dates.filter((date) => !!log[date]?.[habit.id]).length;
      return {
        habitId: habit.id,
        label: habit.label,
        percent: dates.length ? Math.round((doneCount / dates.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.percent - a.percent);
}

/** Raw completion counts per habit - use this (not the rates above) for a pie chart, since counts sum to a real whole. */
export async function getHabitCompletionCounts(days: number): Promise<HabitCompletionCount[]> {
  const habits = await getHabits();
  const log = await getFullLog();
  const todayKey = toDateKey(new Date());
  const startKey = addDays(todayKey, -(days - 1));
  const dates = dateRange(startKey, todayKey);

  return habits
    .map((habit) => ({
      habitId: habit.id,
      label: habit.label,
      count: dates.filter((date) => !!log[date]?.[habit.id]).length,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Per-habit checked/unchecked grid for the last N days, oldest to newest. */
export async function getHabitHistoryGrid(days: number): Promise<HabitHistoryGrid> {
  const todayKey = toDateKey(new Date());
  const startKey = addDays(todayKey, -(days - 1));
  return getHabitHistoryGridForDates(dateRange(startKey, todayKey));
}

/** The same grid for an explicit run of dates - a challenge's own 30 days, say. */
export async function getHabitHistoryGridForDates(dates: string[]): Promise<HabitHistoryGrid> {
  const habits = await getHabits();
  const log = await getFullLog();

  const rows = habits.map((habit) => ({
    habitId: habit.id,
    label: habit.label,
    days: dates.map((date) => !!log[date]?.[habit.id]),
  }));

  return { dates, rows };
}

// ---------- Monthly & year-to-date ----------
// These build date keys directly from year/month/day numbers (no Date round-trip), so they
// were never exposed to the timezone bug above - kept as-is.

function dateKeyFor(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Average daily completion % for each of the last N calendar months. */
export async function getMonthlyCompletion(monthsBack: number): Promise<MonthPoint[]> {
  const habits = await getHabits();
  const log = await getFullLog();
  const now = new Date();
  const months: MonthPoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lastDay = year === now.getFullYear() && month === now.getMonth() ? now.getDate() : daysInMonth;

    let totalCompleted = 0;
    let totalPossible = 0;
    for (let day = 1; day <= lastDay; day++) {
      const dayLog = log[dateKeyFor(year, month, day)] || {};
      totalCompleted += habits.filter((h) => dayLog[h.id]).length;
      totalPossible += habits.length;
    }

    months.push({
      label,
      percent: totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0,
      year,
      month,
    });
  }

  return months;
}

/** Cumulative 100%-day count, month by month, from January through today. */
export async function getYearToDateProgress(): Promise<YearToDatePoint[]> {
  const habits = await getHabits();
  const log = await getFullLog();
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth();

  const points: YearToDatePoint[] = [];
  let cumulativePerfectDays = 0;

  for (let month = 0; month <= currentMonth; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lastDay = month === currentMonth ? now.getDate() : daysInMonth;
    const label = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'short' });

    for (let day = 1; day <= lastDay; day++) {
      const dayLog = log[dateKeyFor(year, month, day)] || {};
      const isPerfect = habits.length > 0 && habits.every((h) => dayLog[h.id]);
      if (isPerfect) cumulativePerfectDays += 1;
    }

    points.push({ label, value: cumulativePerfectDays });
  }

  return points;
}

// ---------- Mood ratings ----------
// Every submitted challenge response can carry a moodRating (1-5) from the post-submit
// popup, regardless of level or day - so these just read that field directly now.

export async function getRatingTrend(days: number): Promise<RatingPoint[]> {
  const responses = await getChallengeResponses();

  const byDate: { [date: string]: number[] } = {};
  Object.values(responses).forEach((resp) => {
    if (resp.moodRating <= 0) return;
    const date = resp.completedAt.slice(0, 10);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(resp.moodRating);
  });

  const todayKey = toDateKey(new Date());
  const startKey = addDays(todayKey, -(days - 1));
  const dates = dateRange(startKey, todayKey);

  return dates.map((date) => {
    const values = byDate[date] || [];
    const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return { date, average, count: values.length };
  });
}

export async function getOverallRatingAverage(): Promise<{ average: number; count: number }> {
  const responses = await getChallengeResponses();
  const values = Object.values(responses)
    .map((resp) => resp.moodRating)
    .filter((v) => v > 0);

  if (values.length === 0) return { average: 0, count: 0 };
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  return { average, count: values.length };
}

export async function getTotalChallengesCompleted(): Promise<number> {
  const responses = await getChallengeResponses();
  return Object.keys(responses).length;
}
