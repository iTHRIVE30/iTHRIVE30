import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { markScreenVisited, recordChallengeEdit } from '../../lib/rewardEvents';
import { parseQuote } from '../../lib/dailyHero';
import { toReadableLines } from '../../lib/prose';
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
  submitChallengeResponse,
  hasAnswerContent,
} from '../../lib/challengeStore';
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
  onChange,
}: {
  options: string[];
  selected: string[];
  multiple: boolean;
  onChange: (next: string[]) => void;
}) {
  const styles = useThemedStyles(createStyles);

  const toggle = (opt: string) => {
    if (multiple) {
      const next = selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt];
      onChange(next);
    } else {
      onChange([opt]);
    }
  };

  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => toggle(opt)}
            style={[styles.optionChip, isSelected && styles.optionChipSelected]}
          >
            <Text style={[styles.optionChipText, isSelected && styles.optionChipTextSelected]}>{opt}</Text>
          </Pressable>
        );
      })}
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

  if (field.type === 'multiselect') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <ChipSelector options={field.options || []} selected={selected} multiple onChange={(next) => onChange(next)} />
    );
  }

  if (field.type === 'dropdown') {
    const selected = typeof value === 'string' && value ? [value] : [];
    return (
      <ChipSelector
        options={field.options || []}
        selected={selected}
        multiple={false}
        onChange={(next) => onChange(next[0] || '')}
      />
    );
  }

  return null;
}

type LevelListItem = { level: LevelDef; unlocked: boolean; progress: LevelProgress };

export default function ChallengesScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const [view, setView] = useState<'levels' | 'days'>('levels');
  const [levelItems, setLevelItems] = useState<LevelListItem[]>([]);

  const [selectedLevel, setSelectedLevel] = useState<LevelDef | null>(null);
  const [levelProgramDay, setLevelProgramDay] = useState(1);
  const [responses, setResponses] = useState<ChallengeResponses>({});

  const [activeDay, setActiveDay] = useState<ChallengeDayDef | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<ChallengeAnswer[]>([]);

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
    const [day, resp] = await Promise.all([getLevelProgramDay(level.number), getChallengeResponses()]);
    setLevelProgramDay(day || 1);
    setResponses(resp);
  }, []);

  useFocusEffect(
    useCallback(() => {
      markScreenVisited('challenges');
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
    if (!item.unlocked) return;
    setSelectedLevel(item.level);
    await loadLevelDetail(item.level);
    setView('days');
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
      setDraftAnswers(challenge.fields.map((f) => (f.type === 'multiselect' ? [] : '')));
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
    const updated = await submitChallengeResponse(id, answers, mood);
    if (existing && changed) recordChallengeEdit();
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
    await persist(pendingSubmit.id, pendingSubmit.answers, mood);
    setShowMoodPopup(false);
    setPendingSubmit(null);
    setDraftMood(0);
    closeModal();
  };

  const actionLabel = (activeDay?.doThisLabel || 'Do This').toUpperCase();

  // Presentation only - no word is changed. See lib/prose.ts.
  const quote = parseQuote(activeDay?.quote ?? '');
  const lessonLines = toReadableLines(activeDay?.lesson);
  const doThisLines = toReadableLines(activeDay?.doThis);
  const goDeeperLines = toReadableLines(activeDay?.goDeeper);

  // ---------- Levels list view ----------
  if (view === 'levels') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>Challenges</Text>
        <Text style={styles.subtitle}>30 levels · 30 days each</Text>

        {levelItems.map((item) => (
          <Pressable
            key={item.level.id}
            style={[styles.card, !item.unlocked && styles.cardLocked]}
            onPress={() => openLevel(item)}
            disabled={!item.unlocked}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.dayBadge}>LEVEL {item.level.number}</Text>
              {!item.unlocked && <Ionicons name="lock-closed" size={18} color={t.faint} />}
            </View>
            <Text style={styles.cardTitle}>{item.level.name}</Text>
            {item.unlocked ? (
              <Text style={styles.cardDescription}>
                {item.progress.completedContentDays} / {item.progress.totalContentDays || 30} completed
              </Text>
            ) : (
              <Text style={styles.lockedLabel}>Complete Level {item.level.number - 1} to unlock</Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  // ---------- Days-in-level view ----------
  const days = selectedLevel ? getLevelDays(selectedLevel.number) : [];
  const completedCount = days.filter((d) => !!responses[d.id]).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Pressable onPress={backToLevels} style={styles.backRow} hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color={t.primary} />
        <Text style={styles.backText}>All Levels</Text>
      </Pressable>

      <Text style={styles.title}>{selectedLevel?.name}</Text>
      <Text style={styles.subtitle}>
        Level {selectedLevel?.number} · {completedCount} / {days.length} completed · Day {levelProgramDay} of 30
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
              {!!activeDay?.theme && <Text style={styles.themeTag}>{activeDay.theme}</Text>}
              <Text style={styles.modalTitle}>{activeDay?.title}</Text>

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
                  <View style={styles.quoteRule} />
                </View>
              )}

              {/* One sentence per line - the lessons are written as short declaratives and
                  read as admin when they're run together in a block. See lib/prose.ts. */}
              {lessonLines.length > 0 && (
                <View style={styles.proseBlock}>
                  {lessonLines.map((line, i) => (
                    <Text key={i} style={styles.lessonText}>{line}</Text>
                  ))}
                </View>
              )}

              {!!activeDay?.worksheetTitle && <Text style={styles.worksheetTitle}>{activeDay.worksheetTitle}</Text>}

              {activeDay && activeDay.fields.length === 0 && (
                <Text style={styles.noFieldsNote}>This day has no worksheet fields yet.</Text>
              )}

              {activeDay?.fields.map((field, i) => (
                <View
                  key={i}
                  style={{ marginTop: 18 }}
                  onLayout={(e) => { fieldOffsets.current[i] = e.nativeEvent.layout.y; }}
                >
                  <Text style={styles.promptLabel}>{field.prompt}</Text>
                  <FieldInput
                    field={field}
                    value={draftAnswers[i]}
                    onChange={(v) => updateAnswer(i, v)}
                    onFocus={() => handleFieldFocus(i)}
                  />
                </View>
              ))}

              {doThisLines.length > 0 && (
                <View style={styles.doThisBox}>
                  <Text style={styles.actionBoxLabel}>{actionLabel}</Text>
                  {doThisLines.map((line, i) => (
                    <Text key={i} style={styles.doThisText}>{line}</Text>
                  ))}
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
    proseBlock: { gap: 10, marginBottom: 4 },
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
