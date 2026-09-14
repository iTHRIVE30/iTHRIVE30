import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
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
  updateGoal,
  setGoalArchived,
  formatTargetDate,
  parseTargetDate,
} from '../../lib/journeyStore';
import {
  AchievementStatus,
  BadgeSummary,
  formatCount,
  getBadgeSummary,
  groupByCategory,
} from '../../lib/achievements';
import { markScreenVisited } from '../../lib/rewardEvents';
import KeyboardAwareScrollView from '../../components/KeyboardAwareScrollView';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { Theme } from '../../constants/theme';


type Draft = { achieve: string; feel: string; impact: string; target: string };
const EMPTY_DRAFT: Draft = { achieve: '', feel: '', impact: '', target: '' };

export default function MyJourneyScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const [categories, setCategories] = useState<JourneyCategory[]>([]);
  const [goals, setGoals] = useState<JourneyGoal[]>([]);
  const [drafts, setDrafts] = useState<{ [categoryId: string]: Draft }>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [celebrateTrigger, setCelebrateTrigger] = useState(0);
  const [summary, setSummary] = useState<BadgeSummary | null>(null);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [showArchived, setShowArchived] = useState(false);

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
    const updated = await addGoal(
      categoryId,
      draft.achieve.trim(),
      draft.feel.trim(),
      draft.impact.trim(),
      parseTargetDate(draft.target) ?? undefined
    );
    setGoals(updated);
    setDrafts((prev) => ({ ...prev, [categoryId]: EMPTY_DRAFT }));
  };

  const startEditing = (goal: JourneyGoal) => {
    setEditingId(goal.id);
    setEditDraft({
      achieve: goal.achieve,
      feel: goal.feel,
      impact: goal.impact,
      target: formatTargetDate(goal.targetDate),
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editDraft.achieve.trim()) return;
    const updated = await updateGoal(id, {
      achieve: editDraft.achieve.trim(),
      feel: editDraft.feel.trim(),
      impact: editDraft.impact.trim(),
      targetDate: parseTargetDate(editDraft.target) ?? undefined,
    });
    setGoals(updated);
    setEditingId(null);
    setSummary(await getBadgeSummary());
  };

  const handleArchive = async (id: string, archived: boolean) => {
    const updated = await setGoalArchived(id, archived);
    setGoals(updated);
    setSummary(await getBadgeSummary());
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
      <KeyboardAwareScrollView style={styles.container}>
        <Text style={styles.title}>My Journey</Text>
        <Text style={styles.subtitle}>Where I&apos;m going, across every part of my life</Text>

        {categories.map((cat) => {
          // Archived goals are hidden by default. They are kept, not deleted - a goal you
          // moved past is still part of the journey - but they shouldn't crowd the list.
          const inCategory = goals.filter((g) => g.categoryId === cat.id);
          const archivedCount = inCategory.filter((g) => !!g.archivedAt).length;
          const catGoals = showArchived ? inCategory : inCategory.filter((g) => !g.archivedAt);
          const draft = drafts[cat.id] || EMPTY_DRAFT;

          return (
            <View key={cat.id} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{cat.name}</Text>
                {!cat.isDefault && (
                  <Pressable onPress={() => handleDeleteCategory(cat.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={t.muted} />
                  </Pressable>
                )}
              </View>

              {catGoals.map((g) => {
                const editing = editingId === g.id;
                return (
                  <View
                    key={g.id}
                    style={[
                      styles.goalCard,
                      g.completed && styles.goalCardDone,
                      !!g.archivedAt && styles.goalCardArchived,
                    ]}
                  >
                    <View style={styles.goalCardTop}>
                      <Pressable onPress={() => handleToggleGoal(g.id)} style={styles.goalStatusRow} hitSlop={6}>
                        <Ionicons name={g.completed ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={g.completed ? t.primary : t.secondaryDim} />
                        <Text style={[styles.goalStatusText, g.completed && styles.goalStatusTextDone]}>
                          {g.archivedAt ? 'Archived' : g.completed ? 'Achieved' : 'In progress'}
                        </Text>
                      </Pressable>

                      <View style={styles.goalActions}>
                        {!g.archivedAt && (
                          <Pressable onPress={() => (editing ? handleSaveEdit(g.id) : startEditing(g))} hitSlop={8}>
                            <Ionicons
                              name={editing ? 'checkmark' : 'create-outline'}
                              size={17}
                              color={editing ? t.primary : t.muted}
                            />
                          </Pressable>
                        )}
                        <Pressable onPress={() => handleArchive(g.id, !g.archivedAt)} hitSlop={8}>
                          <Ionicons
                            name={g.archivedAt ? 'arrow-undo-outline' : 'archive-outline'}
                            size={16}
                            color={t.muted}
                          />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteGoal(g.id)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={16} color={t.muted} />
                        </Pressable>
                      </View>
                    </View>

                    {editing ? (
                      <>
                        <Text style={styles.goalFieldLabel}>What do I want to achieve?</Text>
                        <TextInput
                          style={styles.formInput}
                          value={editDraft.achieve}
                          onChangeText={(v) => setEditDraft((d) => ({ ...d, achieve: v }))}
                          placeholderTextColor={t.muted}
                          multiline
                        />
                        <Text style={styles.goalFieldLabel}>How will I feel when I get there?</Text>
                        <TextInput
                          style={styles.formInput}
                          value={editDraft.feel}
                          onChangeText={(v) => setEditDraft((d) => ({ ...d, feel: v }))}
                          placeholderTextColor={t.muted}
                          multiline
                        />
                        <Text style={styles.goalFieldLabel}>Who else will be impacted?</Text>
                        <TextInput
                          style={styles.formInput}
                          value={editDraft.impact}
                          onChangeText={(v) => setEditDraft((d) => ({ ...d, impact: v }))}
                          placeholderTextColor={t.muted}
                          multiline
                        />
                        <Text style={styles.goalFieldLabel}>By when?</Text>
                        <TextInput
                          style={styles.formInput}
                          value={editDraft.target}
                          onChangeText={(v) => setEditDraft((d) => ({ ...d, target: v }))}
                          placeholder="DD/MM/YYYY"
                          placeholderTextColor={t.muted}
                          keyboardType="numbers-and-punctuation"
                        />
                      </>
                    ) : (
                      <>
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

                        {!!g.targetDate && (
                          <View style={styles.targetRow}>
                            <Ionicons name="flag-outline" size={13} color={t.primaryDim} />
                            <Text style={styles.targetText}>By {formatTargetDate(g.targetDate)}</Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                );
              })}

              <View style={styles.addGoalForm}>
                <Text style={styles.formLabel}>What do I want to achieve?</Text>
                <TextInput
                  style={styles.formInput}
                  value={draft.achieve}
                  onChangeText={(v) => updateDraft(cat.id, 'achieve', v)}
                  placeholder="Name the goal..."
                  placeholderTextColor={t.muted}
                  multiline
                />
                <Text style={styles.formLabel}>How will I feel when I get there?</Text>
                <TextInput
                  style={styles.formInput}
                  value={draft.feel}
                  onChangeText={(v) => updateDraft(cat.id, 'feel', v)}
                  placeholder="Describe the feeling..."
                  placeholderTextColor={t.muted}
                  multiline
                />
                <Text style={styles.formLabel}>Who else will be impacted?</Text>
                <TextInput
                  style={styles.formInput}
                  value={draft.impact}
                  onChangeText={(v) => updateDraft(cat.id, 'impact', v)}
                  placeholder="Who benefits alongside me..."
                  placeholderTextColor={t.muted}
                  multiline
                />
                <Text style={styles.formLabel}>By when? (optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={draft.target}
                  onChangeText={(v) => updateDraft(cat.id, 'target', v)}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={t.muted}
                  keyboardType="numbers-and-punctuation"
                />
                <Pressable style={styles.addGoalButton} onPress={() => handleAddGoal(cat.id)}>
                  <Ionicons name="add" size={16} color={t.onPrimary} />
                  <Text style={styles.addGoalButtonText}>Add Goal</Text>
                </Pressable>
              </View>

              {archivedCount > 0 && (
                <Pressable style={styles.archivedToggle} onPress={() => setShowArchived((v) => !v)}>
                  <Ionicons
                    name={showArchived ? 'eye-off-outline' : 'archive-outline'}
                    size={14}
                    color={t.muted}
                  />
                  <Text style={styles.archivedToggleText}>
                    {showArchived ? 'Hide archived' : `Show ${archivedCount} archived`}
                  </Text>
                </Pressable>
              )}
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
            placeholderTextColor={t.muted}
          />
          <Pressable style={styles.addCategoryButton} onPress={handleAddCategory}>
            <Ionicons name="add-circle-outline" size={18} color={t.primary} />
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
              <Ionicons name={badgesOpen ? 'chevron-up' : 'chevron-down'} size={18} color={t.muted} />
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
                        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={t.faint} />
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
      </KeyboardAwareScrollView>
      <Fireworks trigger={celebrateTrigger} />
    </>
  );
}


/** One badge inside My Journey. Earned badges show their encouragement; the rest show progress. */
function BadgeRow({ status }: { status: AchievementStatus }) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { achievement, earned, progress, current, target, encouragement } = status;
  const showBar = !earned && target > 1;

  return (
    <View style={[styles.badgeRow, earned && styles.badgeRowEarned]}>
      <Ionicons
        name={earned ? 'ribbon' : 'ellipse-outline'}
        size={16}
        color={earned ? t.primary : t.muted}
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

const createStyles = (t: Theme) =>
  StyleSheet.create({
    badgesBlock: { backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, marginTop: 22, overflow: 'hidden' },
    badgesHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
    sectionTitleInline: { color: t.primary, fontSize: 15, fontWeight: '700' },
    badgesSub: { color: t.muted, fontSize: 12, marginTop: 2 },
    badgesBarTrack: { width: 56, height: 5, backgroundColor: t.borderMuted, borderRadius: 3, overflow: 'hidden' },
    badgesBarFill: { height: 5, backgroundColor: t.primary, borderRadius: 3 },
    badgesBody: { borderTopWidth: 1, borderTopColor: t.borderSoft, padding: 12 },
    badgesGroupLabel: { color: t.primaryDim, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
    badgesFootnote: { color: t.muted, fontSize: 11, lineHeight: 16, fontStyle: 'italic', marginTop: 10 },
    badgeCategory: { borderTopWidth: 1, borderTopColor: t.borderSoft, marginTop: 8, paddingTop: 8 },
    badgeCategoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    badgeCategoryTitle: { color: t.body, fontSize: 13, fontWeight: '700', flex: 1 },
    badgeCategoryCount: { color: t.muted, fontSize: 12, fontWeight: '700' },
    badgeRow: { flexDirection: 'row', gap: 9, backgroundColor: t.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: t.borderMuted, padding: 11, marginBottom: 7 },
    badgeRowEarned: { borderColor: t.primaryDim, backgroundColor: t.primaryTintAlt },
    badgeName: { color: t.secondary, fontSize: 13, fontWeight: '700' },
    badgeNameEarned: { color: t.primary },
    badgeReq: { color: t.muted, fontSize: 11, lineHeight: 15, marginTop: 3 },
    badgeEncouragement: { color: t.encouragement, fontSize: 12, lineHeight: 18, marginTop: 7, fontStyle: 'italic' },
    badgeBarTrack: { height: 4, backgroundColor: t.borderMuted, borderRadius: 2, marginTop: 7, overflow: 'hidden' },
    badgeBarFill: { height: 4, backgroundColor: t.primaryDim, borderRadius: 2 },
    badgeProgress: { color: t.muted, fontSize: 10, marginTop: 4, fontWeight: '600' },
    container: { flex: 1, backgroundColor: t.ground },
    title: { color: t.primary, fontSize: 26, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: t.secondary, fontSize: 14, marginBottom: 22 },
    categoryCard: { backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: 16, marginBottom: 18 },
    categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    categoryTitle: { color: t.primary, fontSize: 17, fontWeight: '700' },
    goalCard: { backgroundColor: t.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: t.borderMuted, padding: 14, marginBottom: 12 },
    goalCardDone: { borderColor: t.primary },
    goalCardArchived: { opacity: 0.55, borderStyle: 'dashed' },
    goalActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    targetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
    targetText: { color: t.primaryDim, fontSize: 12, fontWeight: '700' },
    archivedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      marginTop: 4,
    },
    archivedToggleText: { color: t.muted, fontSize: 12, fontWeight: '600' },
    goalCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    goalStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    goalStatusText: { color: t.secondaryDim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    goalStatusTextDone: { color: t.primary },
    goalFieldLabel: { color: t.primaryDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 3 },
    goalFieldValue: { color: t.inkSoft, fontSize: 14, lineHeight: 19 },
    addGoalForm: { borderTopWidth: 1, borderTopColor: t.border, paddingTop: 14, marginTop: 4 },
    formLabel: { color: t.secondary, fontSize: 12, marginBottom: 5, marginTop: 8 },
    formInput: {
      color: t.ink,
      fontSize: 14,
      backgroundColor: t.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.borderMuted,
      padding: 11,
      minHeight: 42,
      textAlignVertical: 'top',
    },
    addGoalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: t.primary, borderRadius: 10, paddingVertical: 11, marginTop: 14 },
    addGoalButtonText: { color: t.ground, fontWeight: '700', fontSize: 13 },
    sectionTitle: { color: t.primary, fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 12 },
    addCategoryForm: { backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: 16 },
    addCategoryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: t.primary, borderRadius: 10, paddingVertical: 11, marginTop: 12 },
    addCategoryButtonText: { color: t.primary, fontWeight: '700', fontSize: 13 },
  });
