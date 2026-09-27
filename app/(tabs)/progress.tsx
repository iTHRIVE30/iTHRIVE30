import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { BarChart, LineChart, PieChart, ChartPoint } from '../../components/Charts';
import Fireworks from '../../components/Fireworks';
import HabitCalendar from '../../components/HabitCalendar';
import {
  getDailyCompletion,
  getHabitCompletionRates,
  getHabitCompletionCounts,
  getRatingTrend,
  getPerfectDayStreak,
  getOverallRatingAverage,
  getMonthlyCompletion,
  getYearToDateProgress,
  getHabitHistoryGrid,
  getHabitHistoryGridForDates,
  getHabitStreaks,
  DayCompletion,
  RatingPoint,
  HabitCompletionRate,
  HabitCompletionCount,
  PerfectDayStreak,
  MonthPoint,
  YearToDatePoint,
  HabitHistoryGrid,
  HabitStreak,
} from '../../lib/analytics';
import {
  Goal,
  getGoals,
  addGoal,
  toggleGoal,
  deleteGoal,
  Milestone,
  getMilestones,
  addMilestone,
  toggleMilestone,
  deleteMilestone,
} from '../../lib/goalsStore';
import { getChallengeResponses, getLevelDays, CONTENT_BY_LEVEL, LEVELS, ChallengeResponses, type StartedLevel } from '../../lib/challengeStore';
import { getTodayKey } from '../../lib/habitStore';
import Svg, { Polyline, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { markScreenVisited, recordProgressGoalView } from '../../lib/rewardEvents';
import KeyboardAwareScrollView from '../../components/KeyboardAwareScrollView';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import { levelColors, type Theme } from '../../constants/theme';

const GOAL_MAX_LENGTH = 250;
const GOAL_QUOTE = 'A wish is not a plan, hope is not a strategy. What gets scheduled gets done.';
const TABLE_DAYS = 30;

type Segment = 'table' | 'graph' | 'goals' | 'milestones';
type RangeOption = 7 | 14 | 30;
type ViewOption = 'daily' | 'habit' | 'mood' | 'monthly' | 'ytd' | 'levels';
type ChartType = 'bar' | 'line' | 'pie';

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'table', label: 'Table' },
  { key: 'graph', label: 'Graph' },
  { key: 'goals', label: 'Goals' },
  { key: 'milestones', label: 'Milestones' },
];

const VIEW_OPTIONS: { key: ViewOption; label: string; types: ChartType[] }[] = [
  { key: 'daily', label: 'Daily', types: ['bar', 'line'] },
  { key: 'habit', label: 'By Habit', types: ['bar', 'pie'] },
  { key: 'mood', label: 'Mood', types: ['bar', 'line'] },
  { key: 'monthly', label: 'Monthly', types: ['bar', 'line'] },
  { key: 'ytd', label: 'Year to Date', types: ['bar', 'line'] },
  { key: 'levels', label: 'Challenges', types: ['bar'] },
];

function formatShortDate(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}


function LevelComparisonChart({
  series,
}: {
  series: { number: number; label: string; color: string; points: number[] }[];
}) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const width = 320;
  const height = 150;
  const padTop = 10;
  const padBottom = 10;
  const padLeft = 26;
  const padRight = 10;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const xForDay = (day: number) => padLeft + ((day - 1) / 29) * plotW;
  const yForPct = (pct: number) => padTop + (1 - pct / 100) * plotH;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 50, 100].map((g) => (
          <SvgLine key={g} x1={padLeft} y1={yForPct(g)} x2={width - padRight} y2={yForPct(g)} stroke={t.border} strokeWidth={1} />
        ))}
        <SvgText x={0} y={yForPct(100) + 3} fontSize="8" fill={t.muted}>100</SvgText>
        <SvgText x={4} y={yForPct(50) + 3} fontSize="8" fill={t.muted}>50</SvgText>
        <SvgText x={8} y={yForPct(0) + 3} fontSize="8" fill={t.muted}>0</SvgText>

        {series.map((s) => (
          <Polyline
            key={s.number}
            points={s.points.map((p, i) => `${xForDay(i + 1)},${yForPct(p)}`).join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth={2.5}
          />
        ))}
      </Svg>
      <View style={styles.levelLegendRow}>
        {series.map((s) => (
          <View key={s.number} style={styles.levelLegendItem}>
            <View style={[styles.levelLegendDot, { backgroundColor: s.color }]} />
            <Text style={styles.levelLegendText}>{`Lvl ${s.number} · ${s.label}`}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const [segment, setSegment] = useState<Segment>('table');
  const [range, setRange] = useState<RangeOption>(7);
  const [view, setView] = useState<ViewOption>('daily');
  const [chartType, setChartType] = useState<ChartType>('bar');

  const [dailyCompletion, setDailyCompletion] = useState<DayCompletion[]>([]);
  const [habitRates, setHabitRates] = useState<HabitCompletionRate[]>([]);
  const [habitCounts, setHabitCounts] = useState<HabitCompletionCount[]>([]);
  const [ratingTrend, setRatingTrend] = useState<RatingPoint[]>([]);
  const [monthly, setMonthly] = useState<MonthPoint[]>([]);
  const [ytd, setYtd] = useState<YearToDatePoint[]>([]);
  const [perfectStreak, setPerfectStreak] = useState<PerfectDayStreak>({ current: 0, best: 0, totalPerfectDays: 0 });
  const [ratingAverage, setRatingAverage] = useState({ average: 0, count: 0 });
  const [history, setHistory] = useState<HabitHistoryGrid>({ dates: [], rows: [] });
  const [streaks, setStreaks] = useState<HabitStreak[]>([]);
  const [challengeResponses, setChallengeResponses] = useState<ChallengeResponses>({});

  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalText, setNewGoalText] = useState('');

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [targetText, setTargetText] = useState('');
  const [rewardText, setRewardText] = useState('');

  const [celebrateTrigger, setCelebrateTrigger] = useState(0);
  // The table shows the last 30 days, or one challenge's own 30 days when picked on the calendar.
  const [tableLevel, setTableLevel] = useState<StartedLevel | null>(null);

  const loadData = useCallback(async () => {
    const [completion, rates, counts, trend, month, year, streak, avg, goalList, grid, streakList, milestoneList, responses] =
      await Promise.all([
        getDailyCompletion(range),
        getHabitCompletionRates(range),
        getHabitCompletionCounts(range),
        getRatingTrend(range),
        getMonthlyCompletion(6),
        getYearToDateProgress(),
        getPerfectDayStreak(),
        getOverallRatingAverage(),
        getGoals(),
        tableLevel
          ? getHabitHistoryGridForDates(tableLevel.dates.filter((d) => d <= getTodayKey()))
          : getHabitHistoryGrid(TABLE_DAYS),
        getHabitStreaks(),
        getMilestones(),
        getChallengeResponses(),
      ]);
    setDailyCompletion(completion);
    setHabitRates(rates);
    setHabitCounts(counts);
    setRatingTrend(trend);
    setMonthly(month);
    setYtd(year);
    setPerfectStreak(streak);
    setRatingAverage(avg);
    setGoals(goalList);
    setHistory(grid);
    setStreaks(streakList);
    setMilestones(milestoneList);
    setChallengeResponses(responses);
  }, [range, tableLevel]);

  useFocusEffect(
    useCallback(() => {
      markScreenVisited('progress');
      loadData();
    }, [loadData])
  );

  // Opening Goals is a review, and 'Checking In' counts them. Counted on the tap rather
  // than on render, so re-rendering the screen doesn't inflate it.
  const handleSelectSegment = (next: Segment) => {
    setSegment(next);
    if (next === 'goals') recordProgressGoalView();
  };

  const handleSelectView = (v: ViewOption) => {
    setView(v);
    const opts = VIEW_OPTIONS.find((o) => o.key === v)?.types || ['bar'];
    if (!opts.includes(chartType)) setChartType(opts[0]);
  };

  const handleAddGoal = async () => {
    const trimmed = newGoalText.trim();
    if (!trimmed) return;
    const updated = await addGoal(trimmed);
    setGoals(updated);
    setNewGoalText('');
  };

  const handleToggleGoal = async (id: string) => {
    const goal = goals.find((g) => g.id === id);
    const updated = await toggleGoal(id);
    setGoals(updated);
    if (goal && !goal.completed) setCelebrateTrigger((t) => t + 1);
  };

  const handleDeleteGoal = async (id: string) => {
    const updated = await deleteGoal(id);
    setGoals(updated);
  };

  const handleAddMilestone = async () => {
    const target = targetText.trim();
    const reward = rewardText.trim();
    if (!target || !reward) return;
    const updated = await addMilestone(target, reward);
    setMilestones(updated);
    setTargetText('');
    setRewardText('');
  };

  const handleToggleMilestone = async (id: string) => {
    const milestone = milestones.find((m) => m.id === id);
    const updated = await toggleMilestone(id);
    setMilestones(updated);
    if (milestone && !milestone.achieved) setCelebrateTrigger((t) => t + 1);
  };

  const handleDeleteMilestone = async (id: string) => {
    const updated = await deleteMilestone(id);
    setMilestones(updated);
  };

  const completionChartData: ChartPoint[] = dailyCompletion.map((d) => ({ label: formatShortDate(d.date), value: d.percent }));
  const moodChartData: ChartPoint[] = ratingTrend.map((d) => ({ label: formatShortDate(d.date), value: d.average }));
  const monthlyChartData: ChartPoint[] = monthly.map((d) => ({ label: d.label, value: d.percent }));
  const ytdChartData: ChartPoint[] = ytd.map((d) => ({ label: d.label, value: d.value }));
  const pieData = habitCounts.filter((h) => h.count > 0).map((h) => ({ label: h.label, value: h.count }));

  const bestHabit = habitRates[0];
  const weakestHabit = habitRates.length > 1 ? habitRates[habitRates.length - 1] : undefined;
  const rangeLabel = range === 7 ? 'this week' : range === 14 ? 'these 2 weeks' : 'this month';

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);
  const activeMilestones = milestones.filter((m) => !m.achieved);
  const achievedMilestones = milestones.filter((m) => m.achieved);

  const currentViewOption = VIEW_OPTIONS.find((o) => o.key === view) || VIEW_OPTIONS[0];
  const showRangeChips = view === 'daily' || view === 'mood' || view === 'habit';
  const showChartTypeChips = view !== 'levels';
  const streakByHabit = Object.fromEntries(streaks.map((s) => [s.habitId, s]));

  const levelNumbersWithContent = Object.keys(CONTENT_BY_LEVEL).map(Number).sort((a, b) => a - b);
  const levelSeries = levelNumbersWithContent.map((num, idx) => {
    const days = getLevelDays(num);
    const levelDef = LEVELS.find((l) => l.number === num);
    const total = days.length;
    const points = Array.from({ length: 30 }, (_, i) => {
      const day = i + 1;
      const doneSoFar = days.filter((d) => d.day <= day && !!challengeResponses[d.id]).length;
      return total > 0 ? Math.round((doneSoFar / total) * 100) : 0;
    });
    return { number: num, label: levelDef?.name || `Level ${num}`, color: levelColors(t)[idx % 6], points };
  });

  // Daily %-complete summary row across the same 30 days, mirroring the tracker's bottom row.
  const dailyPercents = history.dates.map((_, dayIndex) => {
    if (history.rows.length === 0) return 0;
    const doneCount = history.rows.filter((r) => r.days[dayIndex]).length;
    return Math.round((doneCount / history.rows.length) * 100);
  });

  return (
    <>
      <KeyboardAwareScrollView style={styles.container}>
        <Text style={styles.title}>Progress</Text>
        <Text style={styles.subtitle}>Your habits and mindset, over time</Text>

        <View style={styles.segmentRow}>
          {SEGMENTS.map((s) => (
            <Pressable
              key={s.key}
              style={[styles.segmentButton, segment === s.key && styles.segmentButtonActive]}
              onPress={() => handleSelectSegment(s.key)}
            >
              <Text
                style={[styles.segmentText, segment === s.key && styles.segmentTextActive]}
                numberOfLines={1}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {segment === 'table' && (
          <>
            <Text style={styles.sectionTitle}>{tableLevel ? tableLevel.level.name : `Last ${TABLE_DAYS} Days`}</Text>
            <Text style={styles.promptLabel}>Scroll sideways for the full month, plus your streak on the right.</Text>
            <View style={styles.trackerCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={styles.trackerHeaderRow}>
                    <View style={styles.trackerHabitHeader} />
                    {history.dates.map((date, i) => (
                      <Text key={date} style={styles.trackerDateHeader}>{i + 1}</Text>
                    ))}
                    <Text style={styles.trackerStreakHeader}>CUR</Text>
                    <Text style={styles.trackerStreakHeader}>BEST</Text>
                  </View>

                  {history.rows.map((row) => {
                    const s = streakByHabit[row.habitId];
                    return (
                      <View key={row.habitId} style={styles.trackerRow}>
                        <Text style={styles.trackerHabitLabel} numberOfLines={1}>{row.label}</Text>
                        {row.days.map((done, i) => (
                          <View key={i} style={styles.trackerCellWrap}>
                            {done && (
                              <View style={styles.trackerCellDone}>
                                <Ionicons name="checkmark" size={10} color={t.onSuccess} />
                              </View>
                            )}
                          </View>
                        ))}
                        <Text style={styles.trackerStreakValue}>{s?.current ?? 0}</Text>
                        <Text style={styles.trackerStreakValue}>{s?.best ?? 0}</Text>
                      </View>
                    );
                  })}

                  {history.rows.length > 0 && (
                    <View style={[styles.trackerRow, styles.trackerPercentRow]}>
                      <Text style={styles.trackerPercentLabel} numberOfLines={1}>% Complete</Text>
                      {dailyPercents.map((p, i) => (
                        <View key={i} style={styles.trackerCellWrap}>
                          <Text style={styles.trackerPercentCell}>{p > 0 ? p : ''}</Text>
                        </View>
                      ))}
                      <Text style={styles.trackerStreakValue}> </Text>
                      <Text style={styles.trackerStreakValue}> </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
              {history.rows.length === 0 && (
                <Text style={styles.emptyText}>Start checking off habits on Today to fill in your table.</Text>
              )}
            </View>

            {/* Every day, month by month. Picking a challenge switches the table above to
                its 30 days; picking a day shows that day underneath. */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Calendar</Text>
            <HabitCalendar
              selectedLevel={tableLevel?.level.number ?? null}
              onSelectLevel={setTableLevel}
            />
          </>
        )}

        {segment === 'graph' && (
          <>
            <View style={styles.chipRow}>
              {VIEW_OPTIONS.map((opt) => (
                <Pressable key={opt.key} style={[styles.chip, view === opt.key && styles.chipActive]} onPress={() => handleSelectView(opt.key)}>
                  <Text style={[styles.chipText, view === opt.key && styles.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            {showChartTypeChips && (
              <View style={styles.chipRow}>
                {currentViewOption.types.map((t) => (
                  <Pressable key={t} style={[styles.chip, styles.chipSmall, chartType === t && styles.chipActive]} onPress={() => setChartType(t)}>
                    <Text style={[styles.chipText, chartType === t && styles.chipTextActive]}>
                      {t === 'bar' ? 'Bar' : t === 'line' ? 'Line' : 'Pie'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {showRangeChips && (
              <View style={styles.chipRow}>
                {([7, 14, 30] as RangeOption[]).map((opt) => (
                  <Pressable key={opt} style={[styles.chip, styles.chipSmall, range === opt && styles.chipActive]} onPress={() => setRange(opt)}>
                    <Text style={[styles.chipText, range === opt && styles.chipTextActive]}>{opt}d</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.chartCard}>
              {view === 'daily' && (
                <>
                  <Text style={styles.chartTitle}>% of habits completed per day</Text>
                  {chartType === 'line' ? (
                    <LineChart data={completionChartData} maxValue={100} />
                  ) : (
                    <BarChart data={completionChartData} maxValue={100} valueSuffix="%" />
                  )}
                </>
              )}

              {view === 'mood' && (
                <>
                  <Text style={styles.chartTitle}>Average mood per day (out of 5)</Text>
                  {chartType === 'line' ? <LineChart data={moodChartData} maxValue={5} /> : <BarChart data={moodChartData} maxValue={5} />}
                </>
              )}

              {view === 'habit' && chartType === 'bar' && (
                <>
                  <Text style={styles.chartTitle}>Completion rate by habit ({rangeLabel})</Text>
                  {habitRates.map((h) => (
                    <View key={h.habitId} style={styles.habitBarRow}>
                      <Text style={styles.habitBarLabel} numberOfLines={1}>{h.label}</Text>
                      <View style={styles.habitBarTrack}>
                        <View style={[styles.habitBarFill, { width: `${h.percent}%` }]} />
                      </View>
                      <Text style={styles.habitBarPercent}>{h.percent}%</Text>
                    </View>
                  ))}
                </>
              )}

              {view === 'habit' && chartType === 'pie' && (
                <>
                  <Text style={styles.chartTitle}>Share of your check-ins by habit ({rangeLabel})</Text>
                  <PieChart data={pieData} />
                </>
              )}

              {view === 'monthly' && (
                <>
                  <Text style={styles.chartTitle}>Completion % by month (last 6 months)</Text>
                  {chartType === 'line' ? (
                    <LineChart data={monthlyChartData} maxValue={100} />
                  ) : (
                    <BarChart data={monthlyChartData} maxValue={100} valueSuffix="%" />
                  )}
                </>
              )}

              {view === 'ytd' && (
                <>
                  <Text style={styles.chartTitle}>Cumulative 100% days, {new Date().getFullYear()}</Text>
                  {chartType === 'line' ? <LineChart data={ytdChartData} /> : <BarChart data={ytdChartData} />}
                </>
              )}

              {view === 'levels' && (
                <>
                  <Text style={styles.chartTitle}>Completion by level, across each 30-day arc</Text>
                  <LevelComparisonChart series={levelSeries} />
                </>
              )}
            </View>

            <Text style={styles.sectionTitle}>Key Insights</Text>

            <View style={[styles.insightCard, perfectStreak.current > 0 && styles.insightCardCelebrate]}>
              <Ionicons name="flame" size={20} color={perfectStreak.current > 0 ? t.success : t.primary} />
              <Text style={[styles.insightText, perfectStreak.current > 0 && styles.insightTextCelebrate]}>
                {perfectStreak.current > 0
                  ? `Well done! You're on a ${perfectStreak.current}-day streak of 100% days.`
                  : perfectStreak.best > 0
                  ? `Your best 100% day streak so far is ${perfectStreak.best} days. Complete every habit today to start a new one.`
                  : `Complete every habit in a single day to earn your first 100% day.`}
              </Text>
            </View>

            {!!bestHabit && bestHabit.percent > 0 && (
              <View style={styles.insightCard}>
                <Ionicons name="trending-up" size={20} color={t.primary} />
                <Text style={styles.insightText}>{`${bestHabit.label} is your strongest habit - ${bestHabit.percent}% ${rangeLabel}.`}</Text>
              </View>
            )}

            {!!weakestHabit && weakestHabit.percent < 50 && (
              <View style={styles.insightCard}>
                <Ionicons name="trending-down" size={20} color={t.primary} />
                <Text style={styles.insightText}>{`${weakestHabit.label} could use some attention - only ${weakestHabit.percent}% ${rangeLabel}.`}</Text>
              </View>
            )}

            {ratingAverage.count > 0 && (
              <View style={styles.insightCard}>
                <Ionicons name="star" size={20} color={t.primary} />
                <Text style={styles.insightText}>
                  {`Your average mood rating is ${ratingAverage.average.toFixed(1)} / 5, across ${ratingAverage.count} rated day${ratingAverage.count === 1 ? '' : 's'}.`}
                </Text>
              </View>
            )}
          </>
        )}

        {segment === 'goals' && (
          <>
            <Text style={styles.sectionTitle}>My Goals</Text>
            <View style={styles.goalForm}>
              <TextInput
                style={styles.goalInput}
                value={newGoalText}
                onChangeText={(t) => setNewGoalText(t.slice(0, GOAL_MAX_LENGTH))}
                placeholder="e.g. Finish my first 30-day challenge, ticking every habit daily"
                placeholderTextColor={t.muted}
                maxLength={GOAL_MAX_LENGTH}
                multiline
              />
              <Text style={styles.charCount}>{newGoalText.length} / {GOAL_MAX_LENGTH}</Text>
              <Text style={styles.goalQuote}>“{GOAL_QUOTE}”</Text>
              <Pressable style={styles.addGoalButton} onPress={handleAddGoal}>
                <Ionicons name="add" size={18} color={t.onPrimary} />
                <Text style={styles.addGoalButtonText}>Add Goal</Text>
              </Pressable>
            </View>

            {activeGoals.map((goal) => (
              <View key={goal.id} style={styles.goalRow}>
                <Pressable onPress={() => handleToggleGoal(goal.id)} style={styles.goalLeft}>
                  <Ionicons name="ellipse-outline" size={22} color={t.secondaryDim} />
                  <Text style={styles.goalText}>{goal.text}</Text>
                </Pressable>
                <Pressable onPress={() => handleDeleteGoal(goal.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={t.muted} />
                </Pressable>
              </View>
            ))}

            {completedGoals.length > 0 && (
              <>
                <Text style={styles.completedLabel}>Completed</Text>
                {completedGoals.map((goal) => (
                  <View key={goal.id} style={styles.goalRow}>
                    <Pressable onPress={() => handleToggleGoal(goal.id)} style={styles.goalLeft}>
                      <Ionicons name="checkmark-circle" size={22} color={t.primary} />
                      <Text style={[styles.goalText, styles.goalTextDone]}>{goal.text}</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteGoal(goal.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={t.muted} />
                    </Pressable>
                  </View>
                ))}
              </>
            )}

            {goals.length === 0 && <Text style={styles.emptyText}>No goals yet - add one above.</Text>}
          </>
        )}

        {segment === 'milestones' && (
          <>
            <Text style={styles.sectionTitle}>Milestones</Text>
            <View style={styles.milestoneForm}>
              <Text style={styles.milestoneFormLabel}>When I reach...</Text>
              <TextInput
                style={styles.addInput}
                value={targetText}
                onChangeText={setTargetText}
                placeholder="e.g. Day 30 of my first challenge"
                placeholderTextColor={t.muted}
              />
              <Text style={styles.milestoneFormLabel}>I get to...</Text>
              <TextInput
                style={styles.addInput}
                value={rewardText}
                onChangeText={setRewardText}
                placeholder="e.g. buy new running shoes"
                placeholderTextColor={t.muted}
              />
              <Pressable style={styles.addMilestoneButton} onPress={handleAddMilestone}>
                <Text style={styles.addMilestoneButtonText}>Add Milestone</Text>
              </Pressable>
            </View>

            {activeMilestones.map((m) => (
              <View key={m.id} style={styles.goalRow}>
                <Pressable onPress={() => handleToggleMilestone(m.id)} style={styles.goalLeft}>
                  <Ionicons name="ellipse-outline" size={22} color={t.secondaryDim} />
                  <Text style={styles.goalText}>
                    When I reach <Text style={styles.milestoneHighlight}>{m.targetText}</Text>, I get to{' '}
                    <Text style={styles.milestoneHighlight}>{m.rewardText}</Text>.
                  </Text>
                </Pressable>
                <Pressable onPress={() => handleDeleteMilestone(m.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={t.muted} />
                </Pressable>
              </View>
            ))}

            {achievedMilestones.length > 0 && (
              <>
                <Text style={styles.completedLabel}>Achieved</Text>
                {achievedMilestones.map((m) => (
                  <View key={m.id} style={styles.goalRow}>
                    <Pressable onPress={() => handleToggleMilestone(m.id)} style={styles.goalLeft}>
                      <Ionicons name="trophy" size={22} color={t.primary} />
                      <Text style={[styles.goalText, styles.goalTextDone]}>
                        When I reach {m.targetText}, I get to {m.rewardText}.
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteMilestone(m.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={t.muted} />
                    </Pressable>
                  </View>
                ))}
              </>
            )}

            {milestones.length === 0 && <Text style={styles.emptyText}>No milestones yet - add one above.</Text>}
          </>
        )}

        {/* Footer spacer so the keyboard never covers what you're typing above */}
        <View style={{ height: 220 }} />
      </KeyboardAwareScrollView>
      <Fireworks trigger={celebrateTrigger} />
    </>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ground },
    title: { color: t.primary, fontSize: 26, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: t.secondary, fontSize: 14, marginBottom: 20 },

    segmentRow: { flexDirection: 'row', backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 4, marginBottom: 20 },
    segmentButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 2, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    segmentButtonActive: { backgroundColor: t.primary },
    // "Milestones" is twice the length of "Table"/"Graph"/"Goals" and the four buttons share
    // the row equally, so at 12px it wrapped to two lines on narrow phones. 11px fits it on
    // one line with room to spare; numberOfLines={1} on the label is the hard guarantee.
    segmentText: { color: t.secondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },
    segmentTextActive: { color: t.onPrimary },

    promptLabel: { color: t.body, fontSize: 13, marginBottom: 12 },

    chipRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
    chip: { borderWidth: 1, borderColor: t.borderStrong, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
    chipSmall: { paddingHorizontal: 12, paddingVertical: 6 },
    chipActive: { backgroundColor: t.primary, borderColor: t.primary },
    chipText: { color: t.secondary, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: t.onPrimary },

    chartCard: { backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: 16, marginTop: 8, marginBottom: 24 },
    chartTitle: { color: t.body, fontSize: 13, fontWeight: '600', marginBottom: 16 },
    habitBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    habitBarLabel: { color: t.inkSoft, fontSize: 13, width: 110 },
    habitBarTrack: { flex: 1, height: 10, backgroundColor: t.surfaceAlt, borderRadius: 6, marginHorizontal: 8, overflow: 'hidden' },
    habitBarFill: { height: '100%', backgroundColor: t.primary, borderRadius: 6 },
    habitBarPercent: { color: t.primaryDim, fontSize: 12, fontWeight: '700', width: 38, textAlign: 'right' },

    levelLegendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
    levelLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    levelLegendDot: { width: 8, height: 8, borderRadius: 4 },
    levelLegendText: { color: t.secondary, fontSize: 11, fontWeight: '600' },

    sectionTitle: { color: t.primary, fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 6 },
    insightCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 14, marginBottom: 10, gap: 12 },
    insightCardCelebrate: { borderColor: t.success, backgroundColor: t.successTint },
    insightText: { color: t.body, fontSize: 13, flex: 1, lineHeight: 18 },
    insightTextCelebrate: { color: t.successInk },

    trackerCard: { backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: 16, marginBottom: 24 },
    trackerHeaderRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'center' },
    trackerHabitHeader: { width: 100 },
    trackerDateHeader: { width: 16, textAlign: 'center', color: t.faint, fontSize: 9, marginHorizontal: 1 },
    trackerStreakHeader: { width: 30, textAlign: 'center', color: t.primaryDim, fontSize: 9, fontWeight: '700' },
    trackerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
    trackerHabitLabel: { width: 100, color: t.body, fontSize: 11 },
    trackerCellWrap: { width: 16, alignItems: 'center', justifyContent: 'center', marginHorizontal: 1 },
    trackerCellDone: { width: 14, height: 14, borderRadius: 4, backgroundColor: t.success, alignItems: 'center', justifyContent: 'center' },
    trackerStreakValue: { width: 30, textAlign: 'center', color: t.primary, fontSize: 11, fontWeight: '700' },
    trackerPercentRow: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
    trackerPercentLabel: { width: 100, color: t.primaryDim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    trackerPercentCell: { color: t.primaryDim, fontSize: 8, fontWeight: '700', textAlign: 'center' },

    goalForm: { backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: 16, marginBottom: 16 },
    goalInput: {
      color: t.ink,
      fontSize: 15,
      backgroundColor: t.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.borderMuted,
      padding: 12,
      minHeight: 90,
      textAlignVertical: 'top',
    },
    charCount: { color: t.muted, fontSize: 11, textAlign: 'right', marginTop: 4 },
    goalQuote: { color: t.primaryDim, fontSize: 12, fontStyle: 'italic', lineHeight: 17, marginTop: 12, marginBottom: 14 },
    addGoalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: t.primary, borderRadius: 10, paddingVertical: 12 },
    addGoalButtonText: { color: t.onPrimary, fontWeight: '700', fontSize: 14 },

    milestoneForm: { backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: 16, marginBottom: 16 },
    milestoneFormLabel: { color: t.secondary, fontSize: 13, marginBottom: 6, marginTop: 8 },
    addInput: { color: t.ink, fontSize: 15, backgroundColor: t.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: t.borderMuted, padding: 12 },
    addMilestoneButton: { backgroundColor: t.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
    addMilestoneButtonText: { color: t.onPrimary, fontWeight: '700', fontSize: 14 },
    milestoneHighlight: { color: t.primary, fontWeight: '700' },

    goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.surface, borderRadius: 10, borderWidth: 1, borderColor: t.border, padding: 14, marginBottom: 10 },
    goalLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
    goalText: { color: t.inkSoft, fontSize: 14, flex: 1, lineHeight: 19 },
    goalTextDone: { color: t.secondaryDim, textDecorationLine: 'line-through' },
    completedLabel: { color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 6, marginBottom: 10 },
    emptyText: { color: t.muted, fontSize: 13, fontStyle: 'italic', marginTop: 4, marginBottom: 10 },
  });
