import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { markScreenVisited, recordChallengeEdit } from '../../lib/rewardEvents';
import { parseQuote } from '../../lib/dailyHero';
import { toReadableLines } from '../../lib/prose';
import { personaliseDay } from '../../lib/personalise';
import { getSettings } from '../../lib/settingsStore';
import {
  LEVELS,
  LevelDef,
  ChallengeDayDef,
  ChallengeField,
  ChallengeAnswer,
  ChallengeResponses,
  LevelProgress,
  getLevelDays,
  getLevelProgramDay,
  getLevelProgress,
  isLevelUnlocked,
  getChallengeDay,
  getChallengeResponses,
  finalDayOf,
  submitChallengeResponse,
  hasAnswerContent,
} from '../../lib/challengeStore';
import {
  answerById,
  currentValue,
  focusArea,
  getFoundations,
  isFieldVisible,
  recordDayFoundations,
  type FoundationStore,
} from '../../lib/foundations';
import { syncChallengeWins } from '../../lib/challengeActions';
import { copy } from '../../lib/challengeCopy';
import { areaIndexByName, toScores } from '../../lib/lifeWheel';
import { getHabits, saveHabitLabel, CHALLENGE_HABIT_ID, type HabitDef } from '../../lib/habitStore';
import { shareProgressSummary } from '../../lib/shareProgress';
import { WheelField, PulseField } from '../../components/challenge/WheelInputs';
import DayPanel from '../../components/challenge/DayPanels';
import GrowthTree from '../../components/GrowthTree';
import Fireworks from '../../components/Fireworks';
import { getBadgeSummary } from '../../lib/achievements';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { Theme } from '../../constants/theme';


// Nothing in here is ever read-only: every day stays editable forever, today or years
// later. An earlier "locked once submitted" mode was removed along with its Cancel button.

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange?.(n)} hitSlop={8}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={30} color={t.primary} />
        </Pressable>
      ))}
    </View>
  );
}

function Rating10({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.rating10Wrap}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange?.(n)}
          style={[styles.rating10Cell, n <= value && styles.rating10CellActive]}
        >
          <Text style={[styles.rating10Text, n <= value && styles.rating10TextActive]}>{n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ChipSelector({
  options,
  selected,
  multiple,
  max,
  allowCustom,
  onChange,
  onFocus,
}: {
  options: string[];
  selected: string[];
  multiple: boolean;
  /** The most that can be picked at once. Once reached, unpicked chips dim until one is let go. */
  max?: number;
  /** Adds "+ add your own", which takes a typed answer and adds it as a picked chip. */
  allowCustom?: boolean;
  onChange: (next: string[]) => void;
  onFocus?: () => void;
}) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const [adding, setAdding] = useState(false);
  const [customText, setCustomText] = useState('');

  const full = multiple && !!max && selected.length >= max;
  // Typed answers live in the saved answer alongside the listed options, so they are drawn
  // from it: they stay on screen as picked chips, and letting one go removes it.
  const custom = selected.filter((s) => !options.includes(s));

  const toggle = (opt: string) => {
    if (multiple) {
      if (selected.includes(opt)) onChange(selected.filter((o) => o !== opt));
      else if (!full) onChange([...selected, opt]);
    } else {
      onChange([opt]);
    }
  };

  const addCustom = () => {
    const text = customText.trim();
    setCustomText('');
    setAdding(false);
    if (!text) return;
    const match = selected.find((s) => s.toLowerCase() === text.toLowerCase());
    if (match) return;
    const listed = options.find((o) => o.toLowerCase() === text.toLowerCase());
    if (multiple) {
      if (!full) onChange([...selected, listed ?? text]);
    } else {
      onChange([listed ?? text]);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.chipWrap}>
        {[...options, ...custom].map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => toggle(opt)}
              style={[styles.optionChip, isSelected && styles.optionChipSelected, full && !isSelected && styles.optionChipDimmed]}
            >
              <Text style={[styles.optionChipText, isSelected && styles.optionChipTextSelected]}>{opt}</Text>
            </Pressable>
          );
        })}
        {allowCustom && !adding && !full && (
          <Pressable onPress={() => setAdding(true)} style={[styles.optionChip, styles.optionChipAdd]}>
            <Text style={styles.optionChipAddText}>+ add your own</Text>
          </Pressable>
        )}
      </View>

      {adding && (
        <TextInput
          style={styles.answerInputShort}
          value={customText}
          onChangeText={setCustomText}
          onFocus={onFocus}
          onSubmitEditing={addCustom}
          onBlur={addCustom}
          placeholder="Type it, then tap return"
          placeholderTextColor={t.muted}
          returnKeyType="done"
          autoFocus
        />
      )}

      {multiple && !!max && (
        <Text style={styles.chipCount}>
          {selected.length} of {max} chosen
        </Text>
      )}
    </View>
  );
}

/** Several things rated 1-10, one row each - e.g. Day 2's "Rate each of these today". */
function Scale10List({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={{ gap: 14 }}>
      {items.map((item, i) => (
        <View key={item} style={{ gap: 6 }}>
          <Text style={styles.scaleItemLabel}>{item}</Text>
          <Rating10
            value={Number(value[i]) || 0}
            onChange={(v) => {
              const next = items.map((_, j) => value[j] ?? '');
              next[i] = String(v);
              onChange(next);
            }}
          />
        </View>
      ))}
    </View>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  onFocus,
}: {
  field: ChallengeField;
  value: ChallengeAnswer;
  onChange: (v: ChallengeAnswer) => void;
  /** Lets the sheet scroll this field clear of the keyboard - see handleFieldFocus. */
  onFocus?: () => void;
}) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);

  if (field.type === 'text' || field.type === 'textarea') {
    const text = typeof value === 'string' ? value : '';
    return (
      <TextInput
        style={field.type === 'textarea' ? styles.answerInput : styles.answerInputShort}
        value={text}
        onChangeText={(next) => onChange(next)}
        onFocus={onFocus}
        placeholder={field.placeholder || 'Type my response...'}
        placeholderTextColor={t.muted}
        multiline={field.type === 'textarea'}
      />
    );
  }

  if (field.type === 'rating5') {
    return <StarRating value={Number(value) || 0} onChange={(v) => onChange(String(v))} />;
  }

  if (field.type === 'rating10') {
    return <Rating10 value={Number(value) || 0} onChange={(v) => onChange(String(v))} />;
  }

  if (field.type === 'scale10') {
    return (
      <Scale10List
        items={field.items || []}
        value={Array.isArray(value) ? value : []}
        onChange={(next) => onChange(next)}
      />
    );
  }

  if (field.type === 'multiselect') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <ChipSelector
        options={field.options || []}
        selected={selected}
        multiple
        max={field.max}
        allowCustom={field.allowCustom}
        onChange={(next) => onChange(next)}
        onFocus={onFocus}
      />
    );
  }

  if (field.type === 'dropdown') {
    const selected = typeof value === 'string' && value ? [value] : [];
    return (
      <ChipSelector
        options={field.options || []}
        selected={selected}
        multiple={false}
        allowCustom={field.allowCustom}
        onChange={(next) => onChange(next[0] || '')}
        onFocus={onFocus}
      />
    );
  }

  return null;
}

type LevelListItem = { level: LevelDef; unlocked: boolean; progress: LevelProgress };

type Celebration = { finished: LevelDef; next: LevelDef | null; badges: string[] };

/**
 * Is this challenge day its level's Day 30? Day 30 itself, never just the last day written:
 * a level written a week at a time would otherwise celebrate on Day 7.
 */
function isFinalDay(levelNumber: number, dayId: string): boolean {
  return finalDayOf(levelNumber)?.id === dayId;
}

/** A fresh, unanswered day: one empty answer per field, plus the action tick if it has one. */
function blankAnswers(challenge: ChallengeDayDef): ChallengeAnswer[] {
  // A wheel, second look or pulse starts empty and only fills when an area is scored, so an
  // untouched one never counts as an answer.
  const answers: ChallengeAnswer[] = challenge.fields.map((f) =>
    f.type === 'multiselect' || f.type === 'wheel' || f.type === 'second_look'
      ? []
      : f.type === 'scale10'
        ? (f.items || []).map(() => '')
        : ''
  );
  if (challenge.actionCheck) answers.push('');
  return answers;
}

async function earnedBadgeIds(): Promise<Set<string>> {
  try {
    const summary = await getBadgeSummary();
    return new Set(summary.statuses.filter((s) => s.earned).map((s) => s.achievement.id));
  } catch {
    return new Set();
  }
}

/**
 * The card above the tree after a Day 30. Voice: short declaratives, no exclamation marks,
 * same as the challenge content. "Level" never appears - challenges go by their titles.
 */
function CelebrationCard({
  celebration,
  onBegin,
  onClose,
}: {
  celebration: Celebration;
  onBegin?: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { finished, next, badges } = celebration;
  return (
    <View style={styles.celebrateCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.celebrateKicker}>DAY 30 · COMPLETE</Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={18} color={t.secondary} />
        </Pressable>
      </View>
      <Text style={styles.celebrateTitle}>{finished.name}</Text>
      <Text style={styles.celebrateBody}>You showed up for yourself. It shows.</Text>
      {next ? (
        <Text style={styles.celebrateBody}>Your tree just grew. {next.name} is waiting.</Text>
      ) : (
        <Text style={styles.celebrateBody}>Your tree keeps growing. More is on its way.</Text>
      )}

      {badges.length > 0 && (
        <View style={styles.celebrateBadges}>
          <Text style={styles.celebrateBadgesLabel}>{badges.length === 1 ? 'BADGE EARNED' : 'BADGES EARNED'}</Text>
          {badges.map((b) => (
            <View key={b} style={styles.celebrateBadgeRow}>
              <Ionicons name="ribbon" size={16} color={t.accentGold} />
              <Text style={styles.celebrateBadgeText}>{b}</Text>
            </View>
          ))}
        </View>
      )}

      {!!onBegin && next && (
        <Pressable style={styles.completeButton} onPress={onBegin}>
          <Text style={styles.completeButtonText}>Begin {next.name}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function ChallengesScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const [view, setView] = useState<'levels' | 'days'>('levels');
  // The Day 30 moment: fireworks, the next challenge revealing itself on the tree, and
  // any badges it earned. See celebrateLevel.
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [revealLevel, setRevealLevel] = useState<number | null>(null);
  const [treeRefresh, setTreeRefresh] = useState(0);
  const [fireworks, setFireworks] = useState(0);
  const [levelItems, setLevelItems] = useState<LevelListItem[]>([]);

  const [selectedLevel, setSelectedLevel] = useState<LevelDef | null>(null);
  const [levelProgramDay, setLevelProgramDay] = useState(1);
  const [responses, setResponses] = useState<ChallengeResponses>({});

  const [activeDay, setActiveDay] = useState<ChallengeDayDef | null>(null);
  const [firstName, setFirstName] = useState('');
  const [draftAnswers, setDraftAnswers] = useState<ChallengeAnswer[]>([]);
  // Foundations (why, wheel, story...) and the habit list, for days that read them.
  const [foundationStore, setFoundationStore] = useState<FoundationStore>({});
  const [habitList, setHabitList] = useState<HabitDef[]>([]);

  const [showMoodPopup, setShowMoodPopup] = useState(false);
  const [draftMood, setDraftMood] = useState(0);
  const [pendingSubmit, setPendingSubmit] = useState<{ id: string; answers: ChallengeAnswer[] } | null>(null);

  // Shrinking the sheet is not quite enough on its own: the field still has to be scrolled
  // into the space that is left. Each field block records its own offset on layout, and
  // focusing one scrolls it near the top of the sheet.
  const modalScrollRef = useRef<ScrollView>(null);
  const fieldOffsets = useRef<Record<number, number>>({});

  const handleFieldFocus = (index: number) => {
    const y = fieldOffsets.current[index];
    if (y == null) return;
    // The keyboard animates in; scrolling before it has finished measures the old height.
    setTimeout(() => {
      modalScrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    }, 150);
  };

  const loadLevels = useCallback(async () => {
    const items = await Promise.all(
      LEVELS.map(async (level) => {
        const unlocked = await isLevelUnlocked(level.number);
        const progress = await getLevelProgress(level.number);
        return { level, unlocked, progress };
      })
    );
    setLevelItems(items);
  }, []);

  const loadLevelDetail = useCallback(async (level: LevelDef) => {
    const [day, resp, store, habits] = await Promise.all([
      getLevelProgramDay(level.number),
      getChallengeResponses(),
      getFoundations(),
      getHabits().catch(() => [] as HabitDef[]),
    ]);
    setLevelProgramDay(day || 1);
    setResponses(resp);
    setFoundationStore(store);
    setHabitList(habits);
  }, []);

  useFocusEffect(
    useCallback(() => {
      markScreenVisited('challenges');
      getSettings().then((s) => setFirstName(s.firstName)).catch(() => {});
      loadLevels();
      if (selectedLevel) loadLevelDetail(selectedLevel);
    }, [loadLevels, loadLevelDetail, selectedLevel])
  );

  /**
   * Arriving from the Today tab, where tapping the challenge title jumps straight here.
   *
   * The params are consumed once and remembered in a ref: the tab keeps its params after
   * you navigate away, so without the guard the modal would spring open again every time
   * you came back to Challenges, including after you had deliberately closed it.
   *
   * Responses are fetched here rather than read from state - `loadLevelDetail` sets them
   * asynchronously, so `responses` is still empty on this tick and an already-answered day
   * would open blank.
   */
  const params = useLocalSearchParams<{ level?: string; day?: string }>();
  const consumedParams = useRef<string | null>(null);


  const openLevel = async (item: LevelListItem) => {
    if (!item.unlocked || item.progress.totalContentDays === 0) return;
    setSelectedLevel(item.level);
    await loadLevelDetail(item.level);
    setView('days');
  };

  /** From the Growth Tree, which only knows level numbers. */
  const openLevelNumber = (levelNumber: number) => {
    const item = levelItems.find((i) => i.level.number === levelNumber);
    if (item) openLevel(item);
  };

  const backToLevels = () => {
    setView('levels');
    setSelectedLevel(null);
    loadLevels();
  };

  const openDay = (challenge: ChallengeDayDef, known?: ChallengeResponses) => {
    const existing = (known ?? responses)[challenge.id];
    if (existing) {
      setDraftAnswers(existing.answers);
    } else {
      setDraftAnswers(blankAnswers(challenge));
    }
    setActiveDay(challenge);
  };

  useEffect(() => {
    if (!params.level || !params.day) return;

    const signature = `${params.level}:${params.day}`;
    if (consumedParams.current === signature) return;
    consumedParams.current = signature;

    const levelNumber = Number(params.level);
    const day = Number(params.day);
    const level = LEVELS.find((l) => l.number === levelNumber);
    const challenge = getChallengeDay(levelNumber, day);
    if (!level || !challenge) return;

    (async () => {
      const [programDay, resp] = await Promise.all([
        getLevelProgramDay(levelNumber),
        getChallengeResponses(),
      ]);
      setSelectedLevel(level);
      setLevelProgramDay(programDay || 1);
      setResponses(resp);
      setFoundationStore(await getFoundations());
      setHabitList(await getHabits().catch(() => [] as HabitDef[]));
      setView('days');
      openDay(challenge, resp);
    })();
    // Intentionally keyed on the params alone - the consumed-params ref is what stops it
    // re-firing, so adding openDay to the deps would only defeat that guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.level, params.day]);

  const closeModal = () => {
    setActiveDay(null);
    setDraftAnswers([]);
  };

  const updateAnswer = (index: number, value: ChallengeAnswer) => {
    setDraftAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const persist = async (id: string, answers: ChallengeAnswer[], mood?: number) => {
    // Re-saving a day that already had an answer is an edit, not a new response - that's
    // its own achievement ("Second Look"). Only count it when something actually changed,
    // or simply opening and closing a day would rack it up.
    const existing = responses[id];
    const changed = !existing || JSON.stringify(existing.answers) !== JSON.stringify(answers);
    let updated = await submitChallengeResponse(id, answers, mood);
    if (existing && changed) recordChallengeEdit();
    // Foundations: a dated version for each one this day wrote, and a later day's update
    // (Day 20's why, Day 29's second look) saved back into its home day. Then any option
    // actions (Day 24's "Keep it in my Wins"). Both are best-effort.
    const day = LEVELS.flatMap((l) => getLevelDays(l.number)).find((d) => d.id === id);
    if (day) {
      await recordDayFoundations(day, answers).catch(() => {});
      await syncChallengeWins(day, answers);
      updated = await getChallengeResponses();
      setFoundationStore(await getFoundations());
    }
    setResponses(updated);
    loadLevels();
    if (selectedLevel) loadLevelDetail(selectedLevel);
  };

  /**
   * Every exit from the day modal saves - the Done button, the Android back gesture, all of
   * it. Matches the Today tab: nothing is ever lost by leaving, and there's no submit step.
   *
   * The one thing it won't do is create a response out of nothing. Opening a day, reading
   * it and backing out must not mark it complete, because "level complete" is counted from
   * days that have a response.
   */
  const saveAndClose = async () => {
    if (!activeDay) {
      closeModal();
      return;
    }
    const existing = responses[activeDay.id];
    const filledIn = hasAnswerContent(draftAnswers);

    if (!existing && !filledIn) {
      closeModal();
      return;
    }

    // Finishing a day for the first time is the moment worth capturing a mood on. Later
    // visits just save quietly - nobody wants a popup every time they reread a day.
    //
    // The day modal is closed FIRST. Presenting a second Modal on top of a visible one is
    // unreliable in React Native - the new one is routinely never shown - and that is
    // exactly what used to happen here: tapping Done on a first completion left the day
    // modal open with an invisible mood popup behind it, so the only exit appeared dead.
    // The answers are already captured in pendingSubmit, so closing first loses nothing.
    if (!existing && filledIn) {
      setPendingSubmit({ id: activeDay.id, answers: draftAnswers });
      setDraftMood(0);
      closeModal();
      setShowMoodPopup(true);
      return;
    }

    await persist(activeDay.id, draftAnswers);
    closeModal();
  };

  const finalizeMood = async (mood: number) => {
    if (!pendingSubmit) return;
    const finishing = selectedLevel && isFinalDay(selectedLevel.number, pendingSubmit.id) ? selectedLevel : null;
    // Only for a Day 30: which badges were already earned, so the new ones can be named.
    const before = finishing ? await earnedBadgeIds() : null;
    await persist(pendingSubmit.id, pendingSubmit.answers, mood);
    setShowMoodPopup(false);
    setPendingSubmit(null);
    setDraftMood(0);
    closeModal();
    if (finishing && before) await celebrateLevel(finishing, before);
  };

  /**
   * Day 30 answered for the first time. This is the link between one challenge and the
   * next: back to the Growth Tree, fireworks, the next challenge revealing itself out of
   * its outline with a new blank outline appearing above it, and a card naming what was
   * finished and any badges it earned.
   */
  const celebrateLevel = async (finished: LevelDef, before: Set<string>) => {
    const after = await getBadgeSummary().catch(() => null);
    const badges = after
      ? after.statuses.filter((s) => s.earned && !before.has(s.achievement.id)).map((s) => s.achievement.name)
      : [];
    const candidate = LEVELS.find((l) => l.number === finished.number + 1);
    const next =
      candidate && getLevelDays(candidate.number).length > 0 && (await isLevelUnlocked(candidate.number))
        ? candidate
        : null;

    setView('levels');
    setSelectedLevel(null);
    loadLevels();
    setRevealLevel(next?.number ?? null);
    setTreeRefresh((k) => k + 1);
    setCelebration({ finished, next, badges });
    setFireworks((k) => k + 1);
  };

  // ---------- Questions that read other answers ----------

  /** A field's options, resolved: live sources (Day 27) and score order (Day 1). */
  const resolveOptions = (field: ChallengeField): string[] => {
    let options = field.options || [];
    if (field.optionsSource === 'tracker_habits') {
      options = habitList.filter((h) => h.id !== CHALLENGE_HABIT_ID).map((h) => h.label);
    } else if (field.optionsSource) {
      const v = answerById(field.optionsSource, foundationStore, responses);
      const text = Array.isArray(v) ? v.filter(Boolean).join(' · ') : String(v ?? '').trim();
      options = text ? [text] : [];
    }
    if (field.optionsOrder === 'lowest_score_first' && activeDay) {
      const scores = toScores(draftAnswers[activeDay.fields.findIndex((f) => f.type === 'wheel')]);
      const scoreOf = (o: string) => scores[areaIndexByName(o)] ?? 11; // unscored areas last
      options = [...options].sort((a, b) => scoreOf(a) - scoreOf(b));
    }
    return options;
  };

  /** Day 23: the new standard goes into one of the three habits the Thriver writes. */
  const makeHabitFrom = (text: string) => {
    const standard = text.trim();
    if (!standard) {
      Alert.alert(copy('standard.empty'));
      return;
    }
    const slots = habitList.filter((h) => h.editable);
    Alert.alert(copy('standard.make_habit'), copy('standard.pick_slot'), [
      ...slots.map((slot) => ({
        text: slot.label,
        onPress: async () => {
          setHabitList(await saveHabitLabel(slot.id, standard));
          Alert.alert(copy('standard.saved'));
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const renderField = (field: ChallengeField, i: number) => {
    const value = draftAnswers[i];
    const set = (v: ChallengeAnswer) => updateAnswer(i, v);

    if (field.type === 'wheel') return <WheelField value={value} onChange={set} />;

    if (field.type === 'second_look') {
      const base = currentValue('wheel', foundationStore, responses);
      const baseline = base !== undefined ? toScores(base) : null;
      return <WheelField value={value} baseline={baseline} onChange={set} />;
    }

    if (field.type === 'pulse') {
      const area = focusArea(foundationStore, responses);
      // Beside the ORIGINAL Day 1 score - the first version, before any second look.
      const first = foundationStore.wheel?.[0]?.value ?? currentValue('wheel', foundationStore, responses);
      const day1Score = area ? toScores(first)[areaIndexByName(area)] ?? null : null;
      return <PulseField area={area} day1Score={day1Score} value={value} onChange={set} />;
    }

    // Opens on the Day 1 area, but only stored once touched - see ChallengeField.defaultFrom.
    const isEmpty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    const shown = field.defaultFrom === 'focus_area' && isEmpty ? focusArea(foundationStore, responses) : value;

    const onChange = (v: ChallengeAnswer) => {
      set(v);
      if (typeof v === 'string' && field.optionActions?.[v] === 'share_progress') shareProgressSummary();
    };

    return (
      <>
        <FieldInput
          field={{ ...field, options: resolveOptions(field) }}
          value={shown}
          onChange={onChange}
          onFocus={() => handleFieldFocus(i)}
        />
        {/* Day 23's action asks for the standard to go on the tracker (CHANGES item 17). */}
        {field.id === 'foundation.d23.q2' && (
          <Pressable style={styles.inlineButton} onPress={() => makeHabitFrom(String(value ?? ''))}>
            <Text style={styles.inlineButtonText}>{copy('standard.make_habit')}</Text>
          </Pressable>
        )}
      </>
    );
  };

  const actionLabel = (activeDay?.doThisLabel || 'Do This').toUpperCase();

  // What the modal shows: the day with {name} filled in. Display only - saving still goes
  // through activeDay and the answers, untouched. See lib/personalise.ts.
  const shownDay = activeDay ? personaliseDay(activeDay, firstName) : null;

  // Presentation only - no word is changed. See lib/prose.ts.
  const quote = parseQuote(shownDay?.quote ?? '');
  const lessonLines = toReadableLines(shownDay?.lesson);
  const doThisLines = toReadableLines(shownDay?.doThis);
  const goDeeperLines = toReadableLines(shownDay?.goDeeper);
  const panelCtx = activeDay
    ? { day: activeDay, answers: draftAnswers, store: foundationStore, responses }
    : null;

  // ---------- Growth Tree (the front page) ----------
  if (view === 'levels') {
    return (
      <View style={styles.container}>
        <GrowthTree
          onOpenLevel={openLevelNumber}
          revealLevel={revealLevel}
          refreshKey={treeRefresh}
          banner={celebration ? (
            <CelebrationCard
              celebration={celebration}
              onBegin={celebration.next ? () => openLevelNumber(celebration.next!.number) : undefined}
              onClose={() => setCelebration(null)}
            />
          ) : null}
        />
        <Fireworks trigger={fireworks} />
      </View>
    );
  }

  // ---------- Days-in-level view ----------
  const days = selectedLevel ? getLevelDays(selectedLevel.number) : [];
  const completedCount = days.filter((d) => !!responses[d.id]).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Pressable onPress={backToLevels} style={styles.backRow} hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color={t.primary} />
        <Text style={styles.backText}>Growth Tree</Text>
      </Pressable>

      <Text style={styles.title}>{selectedLevel?.name}</Text>
      <Text style={styles.subtitle}>
        {completedCount} / {days.length} completed · Day {levelProgramDay} of 30
      </Text>

      {!!selectedLevel?.introMessage && (
        <View style={styles.introBanner}>
          <Text style={styles.introText}>{selectedLevel.introMessage}</Text>
        </View>
      )}

      {Array.from({ length: 30 }, (_, i) => i + 1).map((dayNum) => {
        const challenge = days.find((d) => d.day === dayNum);
        const isUnlockedDay = levelProgramDay >= dayNum;
        const isDone = challenge ? !!responses[challenge.id] : false;

        return (
          <View
            key={dayNum}
            style={[styles.card, isDone && styles.cardDone, (!isUnlockedDay || !challenge) && styles.cardLocked]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.dayBadge}>DAY {dayNum}</Text>
              {isDone && <Ionicons name="checkmark-circle" size={20} color={t.primary} />}
              {!isUnlockedDay && !!challenge && <Ionicons name="lock-closed" size={18} color={t.faint} />}
            </View>

            {!challenge ? (
              <Text style={styles.lockedLabel}>Coming soon</Text>
            ) : isUnlockedDay ? (
              <>
                {!!challenge.theme && <Text style={styles.themeTag}>{challenge.theme}</Text>}
                <Text style={styles.cardTitle}>{challenge.title}</Text>
                {!!challenge.quote && <Text style={styles.cardDescription}>{challenge.quote}</Text>}
                {!isDone && dayNum < levelProgramDay && (
                  <Text style={styles.catchUpLabel}>Catch up anytime - no rush.</Text>
                )}
                <Pressable style={isDone ? styles.viewButton : styles.completeButton} onPress={() => openDay(challenge)}>
                  <Text style={isDone ? styles.viewButtonText : styles.completeButtonText}>
                    {isDone ? 'View My Response' : 'Start Challenge'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.lockedLabel}>Unlocks on Day {dayNum}</Text>
            )}
          </View>
        );
      })}

      <Modal visible={!!activeDay} animationType="slide" transparent onRequestClose={saveAndClose}>
        {/*
          A Modal is the one place that genuinely needs a KeyboardAvoidingView. Android does
          NOT apply `adjustResize` inside a Modal, so `behavior={undefined}` - which is right
          on a normal Android screen and is what Expo's guide recommends - meant no keyboard
          avoidance at all here. Day 3's third field sat straight behind the keyboard.

          'height' shrinks this container by the keyboard, so the card's `maxHeight: 85%`
          resolves against the reduced space and the sheet's own ScrollView takes over. On
          iOS 'padding' achieves the same thing, because a percentage height resolves
          against the parent's content box, which the padding has already shrunk.
        */}
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            {/*
              A second way out, pinned above the scroll. Not a Cancel - it runs the same
              saveAndClose as the Done button, so nothing is lost either way. It exists
              because Done lives at the bottom of a scrolling sheet, and with the keyboard
              up on a small screen it can sit below the fold. One exit is not enough when
              the exit can be off-screen.
            */}
            <View style={styles.modalTopBar}>
              <Pressable onPress={saveAndClose} hitSlop={12} style={styles.modalClose}>
                <Ionicons name="chevron-down" size={22} color={t.secondary} />
              </Pressable>
            </View>

            <ScrollView
              ref={modalScrollRef}
              contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 120 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              <Text style={styles.modalDay}>DAY {activeDay?.day}</Text>
              {!!shownDay?.theme && <Text style={styles.themeTag}>{shownDay.theme}</Text>}
              <Text style={styles.modalTitle}>{shownDay?.title}</Text>

              {/*
                The iTHRIVE30 voice line: the app speaking straight to the Thriver, before
                the quote. It is the brand's own words, so it is set apart from the lesson
                body and labelled, rather than reading as a first line of the lesson.
              */}
              {!!shownDay?.voice && (
                <View style={styles.voiceBlock}>
                  <Text style={styles.voiceLabel}>iTHRIVE30</Text>
                  <Text style={styles.voiceText}>{shownDay.voice}</Text>
                </View>
              )}

              {/*
                The quote is the day's centrepiece, so it is set as one: centred, larger,
                with the author beneath it rather than trailing the last line. parseQuote is
                the same splitter the Daily Hero uses - don't hand-roll one, the closing
                smart quote sits mid-string, before the attribution.
              */}
              {!!quote.quote && (
                <View style={styles.quoteBlock}>
                  <View style={styles.quoteRule} />
                  <Text style={styles.quoteText}>{quote.quote}</Text>
                  {!!quote.attribution && (
                    <Text style={styles.quoteAuthor}>~ {quote.attribution}</Text>
                  )}
                  {/* Who they are - only on the first day a person is quoted. */}
                  {!!shownDay?.quoteNote && (
                    <Text style={styles.quoteNote}>{shownDay.quoteNote}</Text>
                  )}
                  <View style={styles.quoteRule} />
                </View>
              )}

              {/* One sentence per line - the lessons are written as short declaratives and
                  read as admin when they're run together in a block. See lib/prose.ts. */}
              {lessonLines.length > 0 && (
                <View style={[styles.proseBlock, !quote.quote && styles.proseBlockNoQuote]}>
                  {lessonLines.map((line, i) => (
                    <Text key={i} style={styles.lessonText}>{line}</Text>
                  ))}
                </View>
              )}

              {/* The affirmation closes the reading half of the day, in the Thriver's own
                  first person. It already carries its curly quote marks in the content. */}
              {/* The carry-line is said twice: the prompt under it is part of the format,
                  so it is added here rather than typed into every day. */}
              {/* The prompt sits on the same line as the carry-line (JSON build note). */}
              {!!shownDay?.affirmation && (
                <View style={styles.affirmationBlock}>
                  <Text style={styles.affirmationText}>
                    {shownDay.affirmation}{' '}
                    <Text style={styles.sayAgainInline}>{shownDay.affirmationPrompt || '~ say that again…'}</Text>
                  </Text>
                </View>
              )}

              {/* Earlier answers shown in place: the Day 2 words on reflection days, the
                  Day 4 why on Day 20, the wheel reveal on Day 30, and what you did. */}
              {panelCtx &&
                shownDay?.panels
                  ?.filter((p) => p.kind === 'vision' || p.kind === 'replay' || p.kind === 'wheel_reveal' || p.kind === 'said_and_did')
                  .map((p, k) => <DayPanel key={k} panel={p} ctx={panelCtx} />)}

              {/* Answers from earlier days, read live - Day 7 shows the Day 1 three words. */}
              {shownDay?.echoes?.map((echo, i) => {
                const earlier = responses[echo.dayId]?.answers[echo.fieldIndex];
                const shown = Array.isArray(earlier) ? earlier.filter(Boolean).join(' · ') : String(earlier ?? '').trim();
                return (
                  <View key={i} style={styles.echoBlock}>
                    <Text style={styles.echoLabel}>{echo.label.toUpperCase()}</Text>
                    <Text style={shown ? styles.echoText : styles.echoEmpty}>{shown || echo.empty}</Text>
                  </View>
                );
              })}

              {/* Only a handful of days carry a sourced fact. */}
              {!!shownDay?.fact && (
                <View style={styles.factBlock}>
                  <Text style={styles.factLabel}>FACT</Text>
                  <Text style={styles.factText}>{shownDay.fact}</Text>
                </View>
              )}

              {!!shownDay?.worksheetTitle && <Text style={styles.worksheetTitle}>{shownDay.worksheetTitle}</Text>}

              {activeDay && activeDay.fields.length === 0 && (
                <Text style={styles.noFieldsNote}>This day has no worksheet fields yet.</Text>
              )}

              {shownDay?.fields.map((field, i) =>
                activeDay && !isFieldVisible(activeDay, i, draftAnswers) ? null : (
                  <View
                    key={i}
                    style={{ marginTop: 18 }}
                    onLayout={(e) => { fieldOffsets.current[i] = e.nativeEvent.layout.y; }}
                  >
                    <Text style={styles.promptLabel}>{field.prompt}</Text>
                    {renderField(field, i)}
                    {panelCtx &&
                      shownDay.panels
                        ?.filter((p) => p.kind === 'after_save' && p.afterField === i)
                        .map((p, k) => <DayPanel key={k} panel={p} ctx={panelCtx} />)}
                  </View>
                )
              )}

              {/* Day 2: the Day 1 wheel beside the three words, closing the day on the gap. */}
              {panelCtx &&
                shownDay?.panels
                  ?.filter((p) => p.kind === 'wheel_contrast')
                  .map((p, k) => <DayPanel key={k} panel={p} ctx={panelCtx} />)}

              {doThisLines.length > 0 && (
                <View style={styles.doThisBox}>
                  <Text style={styles.actionBoxLabel}>{actionLabel}</Text>
                  {doThisLines.map((line, i) => (
                    <Text key={i} style={styles.doThisText}>{line}</Text>
                  ))}
                  {/* The action's tick is stored one place after the last field. */}
                  {!!activeDay?.actionCheck && (() => {
                    const index = activeDay.fields.length;
                    const ticked = !!draftAnswers[index];
                    return (
                      <Pressable
                        onPress={() => updateAnswer(index, ticked ? '' : activeDay.actionCheck!)}
                        style={styles.actionCheckRow}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={ticked ? 'checkmark-circle' : 'ellipse-outline'}
                          size={24}
                          color={t.primary}
                        />
                        <Text style={styles.actionCheckText}>{activeDay.actionCheck}</Text>
                      </Pressable>
                    );
                  })()}
                </View>
              )}

              {/* "Why it works": the proof sits under the action it explains, never above. */}
              {!!shownDay?.actionProof && (
                <View style={styles.factBlock}>
                  <Text style={styles.factLabel}>WHY IT WORKS</Text>
                  <Text style={styles.factText}>{shownDay.actionProof}</Text>
                  {!!shownDay.actionProofSource && (
                    <Text style={styles.proofSource}>{shownDay.actionProofSource}</Text>
                  )}
                </View>
              )}

              {goDeeperLines.length > 0 && (
                <View style={[styles.proseBlock, { marginTop: 24 }]}>
                  {goDeeperLines.map((line, i) => (
                    <Text key={i} style={styles.goDeeperText}>{line}</Text>
                  ))}
                </View>
              )}

              <Pressable style={styles.submitButton} onPress={saveAndClose}>
                <Text style={styles.submitButtonText}>Done</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* `&& !activeDay` guarantees only one Modal is ever on screen - see saveAndClose. */}
      <Modal
        visible={showMoodPopup && !activeDay}
        transparent
        animationType="fade"
        onRequestClose={() => finalizeMood(0)}
      >
        <View style={styles.moodBackdrop}>
          <View style={styles.moodCard}>
            <Ionicons name="checkmark-circle" size={32} color={t.primary} />
            <Text style={styles.moodTitle}>Response saved!</Text>
            <Text style={styles.moodSubtitle}>How are you feeling right now?</Text>
            <View style={{ marginVertical: 14 }}>
              <StarRating value={draftMood} onChange={setDraftMood} />
            </View>
            <Pressable style={styles.moodSaveButton} onPress={() => finalizeMood(draftMood)}>
              <Text style={styles.moodSaveButtonText}>Save</Text>
            </Pressable>
            <Pressable onPress={() => finalizeMood(0)} hitSlop={8} style={{ marginTop: 12 }}>
              <Text style={styles.moodSkipText}>Skip</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ground },
    title: { color: t.primary, fontSize: 26, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: t.secondary, fontSize: 14, marginBottom: 20 },
    celebrateCard: { backgroundColor: t.surface, borderWidth: 2, borderColor: t.accentGold, borderRadius: 14, padding: 18, marginTop: 16, marginBottom: 8, gap: 6 },
    celebrateKicker: { color: t.accentGold, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
    celebrateTitle: { color: t.primary, fontSize: 22, fontWeight: '800', marginBottom: 4 },
    celebrateBody: { color: t.body, fontSize: 15, lineHeight: 22 },
    celebrateBadges: { marginTop: 10, gap: 6 },
    celebrateBadgesLabel: { color: t.secondaryDim, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
    celebrateBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    celebrateBadgeText: { color: t.ink, fontSize: 14, fontWeight: '600' },
    backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 2 },
    backText: { color: t.primary, fontSize: 15, fontWeight: '600' },
    introBanner: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.primary, borderRadius: 12, padding: 16, marginBottom: 16 },
    introText: { color: t.inkSoft, fontSize: 14, lineHeight: 21 },
    card: { backgroundColor: t.surface, borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: t.border },
    cardDone: { borderColor: t.primary },
    cardLocked: { opacity: 0.5 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    dayBadge: { color: t.primaryDim, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    themeTag: { color: t.primaryDim, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
    cardTitle: { color: t.ink, fontSize: 18, fontWeight: '700', marginBottom: 6 },
    cardDescription: { color: t.body, fontSize: 14, marginBottom: 12, lineHeight: 20, fontStyle: 'italic' },
    catchUpLabel: { color: t.primaryDim, fontSize: 12, fontStyle: 'italic', marginBottom: 10 },
    lockedLabel: { color: t.muted, fontSize: 14, fontStyle: 'italic' },
    completeButton: { backgroundColor: t.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    completeButtonText: { color: t.onPrimary, fontWeight: '700', fontSize: 14 },
    viewButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    viewButtonText: { color: t.primary, fontWeight: '700', fontSize: 14 },
    modalBackdrop: { flex: 1, backgroundColor: t.scrim, justifyContent: 'flex-end' },
    modalTopBar: { alignItems: 'center', paddingTop: 8 },
    modalClose: { paddingHorizontal: 24, paddingVertical: 4 },
    modalCard: { backgroundColor: t.surfaceSunken, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', borderWidth: 1, borderColor: t.border },
    modalDay: { color: t.primaryDim, fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginBottom: 6 },
    modalTitle: { color: t.primary, fontSize: 24, fontWeight: '700', lineHeight: 31, marginBottom: 4 },
    voiceBlock: {
      marginTop: 20,
      paddingLeft: 14,
      borderLeftWidth: 2,
      borderLeftColor: t.primaryDim,
      gap: 6,
    },
    voiceLabel: { color: t.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
    voiceText: { color: t.inkSoft, fontSize: 16, lineHeight: 25 },

    affirmationBlock: {
      marginTop: 28,
      backgroundColor: t.primaryTint,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.primaryTintBorder,
      paddingVertical: 18,
      paddingHorizontal: 18,
    },
    affirmationText: {
      color: t.encouragement,
      fontSize: 16,
      lineHeight: 25,
      fontStyle: 'italic',
      textAlign: 'center',
    },

    sayAgainText: { color: t.secondaryDim, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
    sayAgainInline: { color: t.secondaryDim, fontSize: 13 },
    inlineButton: { marginTop: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: t.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
    inlineButtonText: { color: t.primary, fontWeight: '700', fontSize: 13 },
    echoBlock: { marginTop: 24, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: t.primaryDim, gap: 6 },
    echoLabel: { color: t.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
    echoText: { color: t.ink, fontSize: 17, fontWeight: '600', lineHeight: 25 },
    echoEmpty: { color: t.secondary, fontSize: 14, fontStyle: 'italic', lineHeight: 21 },
    actionCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, alignSelf: 'flex-start' },
    actionCheckText: { color: t.inkSoft, fontSize: 15, fontWeight: '600' },
    proofSource: { color: t.secondaryDim, fontSize: 12, lineHeight: 18 },
    scaleItemLabel: { color: t.body, fontSize: 14 },
    chipCount: { color: t.secondaryDim, fontSize: 12 },
    optionChipDimmed: { opacity: 0.45 },
    optionChipAdd: { borderStyle: 'dashed', backgroundColor: 'transparent' },
    optionChipAddText: { color: t.primary, fontSize: 13, fontWeight: '600' },
    factBlock: { marginTop: 22, gap: 6 },
    factLabel: { color: t.secondaryDim, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
    factText: { color: t.secondary, fontSize: 14, lineHeight: 22 },

    quoteBlock: { alignItems: 'center', marginTop: 26, marginBottom: 30, paddingHorizontal: 4 },
    quoteRule: { width: 34, height: 1, backgroundColor: t.primaryDim, marginVertical: 16 },
    quoteText: {
      color: t.inkSoft,
      fontSize: 18,
      fontStyle: 'italic',
      lineHeight: 28,
      textAlign: 'center',
    },
    quoteAuthor: {
      color: t.primary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      textAlign: 'center',
      marginTop: 12,
    },
    quoteNote: { color: t.secondaryDim, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
    proseBlock: { gap: 10, marginBottom: 4 },
    proseBlockNoQuote: { marginTop: 22 },
    lessonText: { color: t.body, fontSize: 15, lineHeight: 24 },
    worksheetTitle: { color: t.primary, fontSize: 16, fontWeight: '700', marginTop: 32 },
    noFieldsNote: { color: t.muted, fontSize: 13, fontStyle: 'italic', marginTop: 12 },
    promptLabel: { color: t.inkSoft, fontSize: 14.5, lineHeight: 21, marginBottom: 10, fontWeight: '600' },
    answerInput: {
      color: t.ink, fontSize: 15, backgroundColor: t.surfaceAlt, borderRadius: 10, borderWidth: 1,
      borderColor: t.borderStrong, padding: 12, minHeight: 70, textAlignVertical: 'top',
    },
    answerInputShort: {
      color: t.ink, fontSize: 15, backgroundColor: t.surfaceAlt, borderRadius: 10, borderWidth: 1,
      borderColor: t.borderStrong, padding: 12, minHeight: 44,
    },
    rating10Wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    rating10Cell: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: t.borderStrong, backgroundColor: t.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    rating10CellActive: { backgroundColor: t.primary, borderColor: t.primary },
    rating10Text: { color: t.secondaryDim, fontSize: 14, fontWeight: '700' },
    rating10TextActive: { color: t.onPrimary },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionChip: { borderWidth: 1, borderColor: t.borderStrong, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: t.surfaceAlt },
    optionChipSelected: { backgroundColor: t.primary, borderColor: t.primary },
    optionChipText: { color: t.body, fontSize: 13 },
    optionChipTextSelected: { color: t.onPrimary, fontWeight: '700' },
    doThisBox: { marginTop: 30, backgroundColor: t.primaryTint, borderRadius: 10, borderWidth: 1, borderColor: t.primaryTintBorder, padding: 16, gap: 8 },
    actionBoxLabel: { color: t.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 2 },
    doThisText: { color: t.inkSoft, fontSize: 15, lineHeight: 23 },
    goDeeperText: { color: t.secondaryDim, fontSize: 14, fontStyle: 'italic', lineHeight: 22 },
    submitButton: { backgroundColor: t.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 26, marginBottom: 10 },
    submitButtonText: { color: t.onPrimary, fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
    moodBackdrop: { flex: 1, backgroundColor: t.scrim, alignItems: 'center', justifyContent: 'center', padding: 30 },
    moodCard: { backgroundColor: t.surfaceSunken, borderWidth: 2, borderColor: t.primary, borderRadius: 18, padding: 26, alignItems: 'center', width: '100%' },
    moodTitle: { color: t.primary, fontSize: 18, fontWeight: '800', marginTop: 10 },
    moodSubtitle: { color: t.body, fontSize: 14, marginTop: 6, textAlign: 'center' },
    moodSaveButton: { backgroundColor: t.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 40, marginTop: 6 },
    moodSaveButtonText: { color: t.onPrimary, fontWeight: '700', fontSize: 14 },
    moodSkipText: { color: t.secondaryDim, fontSize: 13, textDecorationLine: 'underline' },
  });
