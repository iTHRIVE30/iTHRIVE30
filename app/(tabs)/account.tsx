import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import Fireworks from '../../components/Fireworks';
import {
  JourneyCategory,
  JourneyGoal,
  getCategories,
  addCategory,
  deleteCategory,
  getGoals,
  addGoal,
  toggleGoal,
  deleteGoal,
} from '../../lib/journeyStore';
import {
  AchievementStatus,
  BadgeSummary,
  formatCount,
  getBadgeSummary,
  groupByCategory,
} from '../../lib/achievements';
import { markScreenVisited } from '../../lib/rewardEvents';

const GOLD = '#D4AF37';
const BLACK = '#0B0B0B';
const DIM_GOLD = '#8a7433';

type Draft = { achieve: string; feel: string; impact: string };
const EMPTY_DRAFT: Draft = { achieve: '', feel: '', impact: '' };

export default function MyJourneyScreen() {
  const [categories, setCategories] = useState<JourneyCategory[]>([]);
  const [goals, setGoals] = useState<JourneyGoal[]>([]);
  const [drafts, setDrafts] = useState<{ [categoryId: string]: Draft }>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [celebrateTrigger, setCelebrateTrigger] = useState(0);
  const [summary, setSummary] = useState<BadgeSummary | null>(null);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [cats, goalList, badges] = await Promise.all([getCategories(), getGoals(), getBadgeSummary()]);
    setCategories(cats);
    setGoals(goalList);
    setSummary(badges);
  }, []);

  const badgeGroups = useMemo(() => (summary ? groupByCategory(summary.statuses) : []), [summary]);

  useFocusEffect(
    useCallback(() => {
      markScreenVisited('journey');
      loadData();
    }, [loadData])
  );

  const updateDraft = (categoryId: string, field: keyof Draft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [categoryId]: { ...(prev[categoryId] || EMPTY_DRAFT), [field]: value },
    }));
  };

  const handleAddGoal = async (categoryId: string) => {
    const draft = drafts[categoryId] || EMPTY_DRAFT;
    if (!draft.achieve.trim()) return;
    const updated = await addGoal(categoryId, draft.achieve.trim(), draft.feel.trim(), draft.impact.trim());
    setGoals(updated);
    setDrafts((prev) => ({ ...prev, [categoryId]: EMPTY_DRAFT }));
  };

  const handleToggleGoal = async (id: string) => {
    const goal = goals.find((g) => g.id === id);
    const updated = await toggleGoal(id);
    setGoals(updated);
    if (goal && !goal.completed) setCelebrateTrigger((t) => t + 1);
    // Achieving a goal can earn a badge outright, so re-derive the tally straight away
    // rather than making the user leave and come back to see it.
    setSummary(await getBadgeSummary());
  };

  const handleDeleteGoal = async (id: string) => {
    const updated = await deleteGoal(id);
    setGoals(updated);
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const updated = await addCategory(trimmed);
    setCategories(updated);
    setNewCategoryName('');
  };

  const handleDeleteCategory = async (id: string) => {
    const result = await deleteCategory(id);
    setCategories(result.categories);
    setGoals(result.goals);
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>My Journey</Text>
        <Text style={styles.subtitle}>Where I&apos;m going, across every part of my life</Text>

        {categories.map((cat) => {
          const catGoals = goals.filter((g) => g.categoryId === cat.id);
          const draft = drafts[cat.id] || EMPTY_DRAFT;

          return (
            <View key={cat.id} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{cat.name}</Text>
                {!cat.isDefault && (
                  <Pressable onPress={() => handleDeleteCategory(cat.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color="#666" />
                  </Pressable>
                )}
              </View>

              {catGoals.map((g) => (
                <View key={g.id} style={[styles.goalCard, g.completed && styles.goalCardDone]}>
                  <View style={styles.goalCardTop}>
                    <Pressable onPress={() => handleToggleGoal(g.id)} style={styles.goalStatusRow} hitSlop={6}>
                      <Ionicons name={g.completed ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={g.completed ? GOLD : '#888'} />
                      <Text style={[styles.goalStatusText, g.completed && styles.goalStatusTextDone]}>
                        {g.completed ? 'Achieved' : 'In progress'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteGoal(g.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color="#666" />
                    </Pressable>
                  </View>

                  <Text style={styles.goalFieldLabel}>What do I want to achieve?</Text>
                  <Text style={styles.goalFieldValue}>{g.achieve}</Text>

                  {!!g.feel && (
                    <>
                      <Text style={styles.goalFieldLabel}>How will I feel when I get there?</Text>
                      <Text style={styles.goalFieldValue}>{g.feel}</Text>
                    </>
                  )}

                  {!!g.impact && (
                    <>
                      <Text style={styles.goalFieldLabel}>Who else will be impacted?</Text>
                      <Text style={styles.goalFieldValue}>{g.impact}</Text>
                    </>
                  )}
                </View>
              ))}

              <View style={styles.addGoalForm}>
                <Text style={styles.formLabel}>What do I want to achieve?</Text>
                <TextInput
                  style={styles.formInput}
                  value={draft.achieve}
                  onChangeText={(t) => updateDraft(cat.id, 'achieve', t)}
                  placeholder="Name the goal..."
                  placeholderTextColor="#666"
                  multiline
                />
                <Text style={styles.formLabel}>How will I feel when I get there?</Text>
                <TextInput
                  style={styles.formInput}
                  value={draft.feel}
                  onChangeText={(t) => updateDraft(cat.id, 'feel', t)}
                  placeholder="Describe the feeling..."
                  placeholderTextColor="#666"
                  multiline
                />
                <Text style={styles.formLabel}>Who else will be impacted?</Text>
                <TextInput
                  style={styles.formInput}
                  value={draft.impact}
                  onChangeText={(t) => updateDraft(cat.id, 'impact', t)}
                  placeholder="Who benefits alongside me..."
                  placeholderTextColor="#666"
                  multiline
                />
                <Pressable style={styles.addGoalButton} onPress={() => handleAddGoal(cat.id)}>
                  <Ionicons name="add" size={16} color={BLACK} />
                  <Text style={styles.addGoalButtonText}>Add Goal</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Add Another Area</Text>
        <View style={styles.addCategoryForm}>
          <TextInput
            style={styles.formInput}
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            placeholder="e.g. Health, Finances, Spirituality..."
            placeholderTextColor="#666"
          />
          <Pressable style={styles.addCategoryButton} onPress={handleAddCategory}>
            <Ionicons name="add-circle-outline" size={18} color={GOLD} />
            <Text style={styles.addCategoryButtonText}>Add Category</Text>
          </Pressable>
        </View>

        {/*
          The full badge list lives here rather than in Wins, and collapsed by default. It's
          a record you can go and look at, not a counter following you around the app.
        */}
        {summary && (
          <View style={styles.badgesBlock}>
            <Pressable style={styles.badgesHeader} onPress={() => setBadgesOpen((v) => !v)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitleInline}>Badges</Text>
                <Text style={styles.badgesSub}>
                  {summary.earnedCount} earned of {summary.totalCount - summary.lockedCount}
                </Text>
              </View>
              <View style={styles.badgesBarTrack}>
                <View style={[styles.badgesBarFill, { width: `${Math.round(summary.completion * 100)}%` }]} />
              </View>
              <Ionicons name={badgesOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
            </Pressable>

            {badgesOpen && (
              <View style={styles.badgesBody}>
                {summary.nextUp.length > 0 && (
                  <>
                    <Text style={styles.badgesGroupLabel}>Closest to earning</Text>
                    {summary.nextUp.map((s) => (
                      <BadgeRow key={s.achievement.id} status={s} />
                    ))}
                  </>
                )}

                {badgeGroups.map((group) => {
                  const open = openCategory === group.category;
                  const visible = group.statuses.filter((s) => !s.lockedReason);
                  if (visible.length === 0) return null;
                  return (
                    <View key={group.category} style={styles.badgeCategory}>
                      <Pressable
                        style={styles.badgeCategoryHeader}
                        onPress={() => setOpenCategory(open ? null : group.category)}
                      >
                        <Text style={styles.badgeCategoryTitle}>{group.category}</Text>
                        <Text style={styles.badgeCategoryCount}>
                          {group.statuses.filter((s) => s.earned).length} / {visible.length}
                        </Text>
                        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color="#555" />
                      </Pressable>
                      {open && visible.map((s) => <BadgeRow key={s.achievement.id} status={s} />)}
                    </View>
                  );
                })}

                <Text style={styles.badgesFootnote}>
                  {summary.lockedCount} more need features that don&apos;t exist yet — Teams,
                  transformation montages. They&apos;ll unlock when those are built.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      <Fireworks trigger={celebrateTrigger} />
    </>
  );
}


/** One badge inside My Journey. Earned badges show their encouragement; the rest show progress. */
function BadgeRow({ status }: { status: AchievementStatus }) {
  const { achievement, earned, progress, current, target, encouragement } = status;
  const showBar = !earned && target > 1;

  return (
    <View style={[styles.badgeRow, earned && styles.badgeRowEarned]}>
      <Ionicons
        name={earned ? 'ribbon' : 'ellipse-outline'}
        size={16}
        color={earned ? GOLD : '#666'}
        style={{ marginTop: 2 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.badgeName, earned && styles.badgeNameEarned]}>{achievement.name}</Text>
        <Text style={styles.badgeReq}>{achievement.requirement}</Text>
        {earned && <Text style={styles.badgeEncouragement}>{encouragement}</Text>}
        {showBar && (
          <>
            <View style={styles.badgeBarTrack}>
              <View style={[styles.badgeBarFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={styles.badgeProgress}>{formatCount(current)} / {formatCount(target)}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badgesBlock: { backgroundColor: '#161616', borderRadius: 14, borderWidth: 1, borderColor: '#262626', marginTop: 22, overflow: 'hidden' },
  badgesHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  sectionTitleInline: { color: GOLD, fontSize: 15, fontWeight: '700' },
  badgesSub: { color: '#777', fontSize: 12, marginTop: 2 },
  badgesBarTrack: { width: 56, height: 5, backgroundColor: '#2a2a2a', borderRadius: 3, overflow: 'hidden' },
  badgesBarFill: { height: 5, backgroundColor: GOLD, borderRadius: 3 },
  badgesBody: { borderTopWidth: 1, borderTopColor: '#242424', padding: 12 },
  badgesGroupLabel: { color: DIM_GOLD, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  badgesFootnote: { color: '#666', fontSize: 11, lineHeight: 16, fontStyle: 'italic', marginTop: 10 },
  badgeCategory: { borderTopWidth: 1, borderTopColor: '#232323', marginTop: 8, paddingTop: 8 },
  badgeCategoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  badgeCategoryTitle: { color: '#ddd', fontSize: 13, fontWeight: '700', flex: 1 },
  badgeCategoryCount: { color: '#777', fontSize: 12, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', gap: 9, backgroundColor: '#1c1c1c', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a', padding: 11, marginBottom: 7 },
  badgeRowEarned: { borderColor: DIM_GOLD, backgroundColor: '#1a1608' },
  badgeName: { color: '#bbb', fontSize: 13, fontWeight: '700' },
  badgeNameEarned: { color: GOLD },
  badgeReq: { color: '#7d7d7d', fontSize: 11, lineHeight: 15, marginTop: 3 },
  badgeEncouragement: { color: '#e8e0c8', fontSize: 12, lineHeight: 18, marginTop: 7, fontStyle: 'italic' },
  badgeBarTrack: { height: 4, backgroundColor: '#2f2f2f', borderRadius: 2, marginTop: 7, overflow: 'hidden' },
  badgeBarFill: { height: 4, backgroundColor: DIM_GOLD, borderRadius: 2 },
  badgeProgress: { color: '#777', fontSize: 10, marginTop: 4, fontWeight: '600' },
  container: { flex: 1, backgroundColor: BLACK },
  title: { color: GOLD, fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: '#aaa', fontSize: 14, marginBottom: 22 },
  categoryCard: { backgroundColor: '#161616', borderRadius: 14, borderWidth: 1, borderColor: '#262626', padding: 16, marginBottom: 18 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  categoryTitle: { color: GOLD, fontSize: 17, fontWeight: '700' },
  goalCard: { backgroundColor: '#1c1c1c', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a', padding: 14, marginBottom: 12 },
  goalCardDone: { borderColor: GOLD },
  goalCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  goalStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalStatusText: { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  goalStatusTextDone: { color: GOLD },
  goalFieldLabel: { color: '#8a7433', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 3 },
  goalFieldValue: { color: '#eee', fontSize: 14, lineHeight: 19 },
  addGoalForm: { borderTopWidth: 1, borderTopColor: '#262626', paddingTop: 14, marginTop: 4 },
  formLabel: { color: '#aaa', fontSize: 12, marginBottom: 5, marginTop: 8 },
  formInput: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 11,
    minHeight: 42,
    textAlignVertical: 'top',
  },
  addGoalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: GOLD, borderRadius: 10, paddingVertical: 11, marginTop: 14 },
  addGoalButtonText: { color: BLACK, fontWeight: '700', fontSize: 13 },
  sectionTitle: { color: GOLD, fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 12 },
  addCategoryForm: { backgroundColor: '#161616', borderRadius: 14, borderWidth: 1, borderColor: '#262626', padding: 16 },
  addCategoryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: GOLD, borderRadius: 10, paddingVertical: 11, marginTop: 12 },
  addCategoryButtonText: { color: GOLD, fontWeight: '700', fontSize: 13 },
});
