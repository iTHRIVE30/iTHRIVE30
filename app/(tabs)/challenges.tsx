import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { markScreenVisited, recordChallengeEdit } from '../../lib/rewardEvents';
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
  getChallengeResponses,
  submitChallengeResponse,
  hasAnswerContent,
} from '../../lib/challengeStore';

const GOLD = '#D4AF37';
const BLACK = '#0B0B0B';

// Nothing in here is ever read-only: every day stays editable forever, today or years
// later. An earlier "locked once submitted" mode was removed along with its Cancel button.

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange?.(n)} hitSlop={8}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={30} color={GOLD} />
        </Pressable>
      ))}
    </View>
  );
}

function Rating10({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
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
}: {
  field: ChallengeField;
  value: ChallengeAnswer;
  onChange: (v: ChallengeAnswer) => void;
}) {
  if (field.type === 'text' || field.type === 'textarea') {
    const text = typeof value === 'string' ? value : '';
    return (
      <TextInput
        style={field.type === 'textarea' ? styles.answerInput : styles.answerInputShort}
        value={text}
        onChangeText={(t) => onChange(t)}
        placeholder={field.placeholder || 'Type my response...'}
        placeholderTextColor="#666"
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

  const openDay = (challenge: ChallengeDayDef) => {
    const existing = responses[challenge.id];
    if (existing) {
      setDraftAnswers(existing.answers);
    } else {
      setDraftAnswers(challenge.fields.map((f) => (f.type === 'multiselect' ? [] : '')));
    }
    setActiveDay(challenge);
  };

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
    if (!existing && filledIn) {
      setPendingSubmit({ id: activeDay.id, answers: draftAnswers });
      setDraftMood(0);
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
              {!item.unlocked && <Ionicons name="lock-closed" size={18} color="#555" />}
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
        <Ionicons name="chevron-back" size={20} color={GOLD} />
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
              {isDone && <Ionicons name="checkmark-circle" size={20} color={GOLD} />}
              {!isUnlockedDay && !!challenge && <Ionicons name="lock-closed" size={18} color="#555" />}
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
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalDay}>DAY {activeDay?.day}</Text>
              {!!activeDay?.theme && <Text style={styles.themeTag}>{activeDay.theme}</Text>}
              <Text style={styles.modalTitle}>{activeDay?.title}</Text>
              {!!activeDay?.quote && <Text style={styles.quoteText}>{activeDay.quote}</Text>}
              {!!activeDay?.lesson && <Text style={styles.lessonText}>{activeDay.lesson}</Text>}

              {!!activeDay?.worksheetTitle && <Text style={styles.worksheetTitle}>{activeDay.worksheetTitle}</Text>}

              {activeDay && activeDay.fields.length === 0 && (
                <Text style={styles.noFieldsNote}>This day has no worksheet fields yet.</Text>
              )}

              {activeDay?.fields.map((field, i) => (
                <View key={i} style={{ marginTop: 18 }}>
                  <Text style={styles.promptLabel}>{field.prompt}</Text>
                  <FieldInput field={field} value={draftAnswers[i]} onChange={(v) => updateAnswer(i, v)} />
                </View>
              ))}

              {!!activeDay?.doThis && (
                <View style={styles.doThisBox}>
                  <Text style={styles.actionBoxLabel}>{actionLabel}</Text>
                  <Text style={styles.doThisText}>{activeDay.doThis}</Text>
                </View>
              )}

              {!!activeDay?.goDeeper && <Text style={styles.goDeeperText}>{activeDay.goDeeper}</Text>}

              <Pressable style={styles.submitButton} onPress={saveAndClose}>
                <Text style={styles.submitButtonText}>Done</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showMoodPopup} transparent animationType="fade" onRequestClose={() => finalizeMood(0)}>
        <View style={styles.moodBackdrop}>
          <View style={styles.moodCard}>
            <Ionicons name="checkmark-circle" size={32} color={GOLD} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLACK },
  title: { color: GOLD, fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: '#aaa', fontSize: 14, marginBottom: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 2 },
  backText: { color: GOLD, fontSize: 15, fontWeight: '600' },
  introBanner: { backgroundColor: '#161616', borderWidth: 1, borderColor: GOLD, borderRadius: 12, padding: 16, marginBottom: 16 },
  introText: { color: '#eee', fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: '#161616', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#262626' },
  cardDone: { borderColor: GOLD },
  cardLocked: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dayBadge: { color: '#8a7433', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  themeTag: { color: '#8a7433', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  cardDescription: { color: '#ccc', fontSize: 14, marginBottom: 12, lineHeight: 20, fontStyle: 'italic' },
  catchUpLabel: { color: '#8a7433', fontSize: 12, fontStyle: 'italic', marginBottom: 10 },
  lockedLabel: { color: '#666', fontSize: 14, fontStyle: 'italic' },
  completeButton: { backgroundColor: GOLD, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  completeButtonText: { color: BLACK, fontWeight: '700', fontSize: 14 },
  viewButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: GOLD, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  viewButtonText: { color: GOLD, fontWeight: '700', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#141414', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', borderWidth: 1, borderColor: '#262626' },
  modalDay: { color: '#8a7433', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  modalTitle: { color: GOLD, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  quoteText: { color: '#ccc', fontSize: 14, fontStyle: 'italic', lineHeight: 20, marginBottom: 10 },
  lessonText: { color: '#ccc', fontSize: 14, lineHeight: 20, marginBottom: 4 },
  worksheetTitle: { color: GOLD, fontSize: 15, fontWeight: '700', marginTop: 20 },
  noFieldsNote: { color: '#666', fontSize: 13, fontStyle: 'italic', marginTop: 12 },
  promptLabel: { color: '#eee', fontSize: 14, marginBottom: 8, fontWeight: '600' },
  answerInput: {
    color: '#fff', fontSize: 15, backgroundColor: '#1c1c1c', borderRadius: 10, borderWidth: 1,
    borderColor: '#333', padding: 12, minHeight: 70, textAlignVertical: 'top',
  },
  answerInputShort: {
    color: '#fff', fontSize: 15, backgroundColor: '#1c1c1c', borderRadius: 10, borderWidth: 1,
    borderColor: '#333', padding: 12, minHeight: 44,
  },
  rating10Wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rating10Cell: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#333', backgroundColor: '#1c1c1c', alignItems: 'center', justifyContent: 'center' },
  rating10CellActive: { backgroundColor: GOLD, borderColor: GOLD },
  rating10Text: { color: '#999', fontSize: 14, fontWeight: '700' },
  rating10TextActive: { color: BLACK },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { borderWidth: 1, borderColor: '#333', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#1c1c1c' },
  optionChipSelected: { backgroundColor: GOLD, borderColor: GOLD },
  optionChipText: { color: '#ccc', fontSize: 13 },
  optionChipTextSelected: { color: BLACK, fontWeight: '700' },
  doThisBox: { marginTop: 20, backgroundColor: '#1f1a08', borderRadius: 10, borderWidth: 1, borderColor: '#3a2f10', padding: 14 },
  actionBoxLabel: { color: GOLD, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  doThisText: { color: '#eee', fontSize: 14, lineHeight: 20 },
  goDeeperText: { color: '#888', fontSize: 13, fontStyle: 'italic', marginTop: 14, lineHeight: 18 },
  submitButton: { backgroundColor: GOLD, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 26, marginBottom: 10 },
  submitButtonText: { color: BLACK, fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  moodBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  moodCard: { backgroundColor: '#141414', borderWidth: 2, borderColor: GOLD, borderRadius: 18, padding: 26, alignItems: 'center', width: '100%' },
  moodTitle: { color: GOLD, fontSize: 18, fontWeight: '800', marginTop: 10 },
  moodSubtitle: { color: '#ccc', fontSize: 14, marginTop: 6, textAlign: 'center' },
  moodSaveButton: { backgroundColor: GOLD, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 40, marginTop: 6 },
  moodSaveButtonText: { color: BLACK, fontWeight: '700', fontSize: 14 },
  moodSkipText: { color: '#888', fontSize: 13, textDecorationLine: 'underline' },
});
