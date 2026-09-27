import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Animated,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pedometer } from 'expo-sensors';
import * as ImagePicker from 'expo-image-picker';
import {
  HabitDef,
  DailyLog,
  GratitudeEntries,
  ActivityDetail,
  ReadingDetail,
  NoteEntry,
  getHabits,
  getTodayKey,
  getLogForDate,
  toggleHabit,
  setHabitValue,
  saveHabitLabel,
  getIntention,
  saveIntention,
  getGratitude,
  saveGratitude,
  getMoodRating,
  saveMoodRating,
  MOOD_SCALE_MAX,
  getActivityDetail,
  saveActivityDetail,
  getFruitDetail,
  saveFruitDetail,
  getReadingDetail,
  saveReadingDetail,
  getWaterGlasses,
  saveWaterGlasses,
  WATER_GOAL_GLASSES,
  WATER_SCALE_MAX,
  getSelfiePhoto,
  saveSelfiePhoto,
  getNotes,
  addNote,
  deleteNote,
  getDaysWithData,
} from '../../lib/habitStore';
import { getTodayChallengeInfo, getStartedLevels, startLevel, StartedLevel, LevelDef } from '../../lib/challengeStore';
import { canUseTrackerOnly } from '../../lib/entitlements';
import Fireworks from '../../components/Fireworks';
import { LOGO_IS_HERE, LOGO_MARK } from '../../lib/brand';
import {
  markScreenVisited,
  recordBackfill,
  recordCustomHabitLabel,
  recordDayCompleted,
} from '../../lib/rewardEvents';
import KeyboardAwareScrollView from '../../components/KeyboardAwareScrollView';
import ReminderOffer from '../../components/ReminderOffer';
import { greeting } from '../../lib/personalise';
import { getSettings, saveSettings } from '../../lib/settingsStore';
import { useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { Theme } from '../../constants/theme';

const STEP_GOAL = 10000;
const ACTIVITY_TYPES = ['Walk', 'Swim', 'Run', 'Cycling', 'Hike'];
const DETAIL_HABIT_IDS = ['activity', 'fruit', 'water', 'reading'];
const TILE_WIDTH = 58;
const TILE_GAP = 10;

function formatDayTile(dateKey: string) {
  const d = new Date(dateKey + 'T00:00:00');
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
    num: String(d.getDate()),
    month: d.toLocaleDateString(undefined, { month: 'short' }),
  };
}

function formatMonth(dateKey: string): string {
  return new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** The strip never holds more than 30 days: add today, drop the oldest. */
const STRIP_MAX_DAYS = 30;

/**
 * The rolling strip: up to 30 calendar dates ending today, oldest first, never reaching
 * back before `start`. Inside a Level that is simply Day 1 to today; past Day 30 (or in
 * tracker-only mode) it slides forward a day at a time, so today is always on it.
 */
function rollingStripDates(start: string | null, today: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(today + 'T00:00:00');
  for (let i = 0; i < STRIP_MAX_DAYS; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    dates.unshift(key);
    if (!start || key <= start) break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates;
}

function formatFullDate(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatNoteTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function TodayScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const dayScrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  const todayKey = getTodayKey();

  // The day strip follows the Level: Day 1 to today, labelled D1-D30. Once a Level passes
  // Day 30 without the next one started, it rolls (drop the oldest day, add today) so
  // today is always on it. The picker switches to Levels already finished, as history.
  // In tracker-only mode there is no Level running: the strip just rolls by date.
  const [startedLevels, setStartedLevels] = useState<StartedLevel[]>([]);
  const [viewedLevel, setViewedLevel] = useState<number | null>(null);
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const [trackerOnly, setTrackerOnly] = useState(false);

  const latestLevel = startedLevels[startedLevels.length - 1] ?? null;
  const activeLevel = useMemo(
    () => startedLevels.find((l) => l.level.number === viewedLevel) ?? null,
    [startedLevels, viewedLevel]
  );
  const isCurrentLevel = trackerOnly || (!!activeLevel && activeLevel === latestLevel);

  const stripDates = useMemo(() => {
    if (trackerOnly) return rollingStripDates(startedLevels[0]?.startDate ?? null, todayKey);
    if (!activeLevel) return [todayKey];
    if (activeLevel === latestLevel) return rollingStripDates(activeLevel.startDate, todayKey);
    // A finished Level, viewed as history: its own 30 days.
    const upTo = activeLevel.dates.filter((d) => d <= todayKey);
    return upTo.length > 0 ? upTo : [activeLevel.dates[0]];
  }, [trackerOnly, startedLevels, activeLevel, latestLevel, todayKey]);

  /** Which Level day a date is, for the D-labels. Past Day 30 a date has none. */
  const levelDayByDate = useMemo(() => {
    const map: Record<string, number> = {};
    startedLevels.forEach((l) => l.dates.forEach((d, i) => { map[d] = i + 1; }));
    return map;
  }, [startedLevels]);

  const [activeDateKey, setActiveDateKey] = useState(todayKey);
  const isToday = activeDateKey === todayKey;

  // Every day - today or a past one, blank or already filled in - stays fully editable.
  // dayHasData just drives the little dot on the day strip, it's not a lock.
  const [dayHasData, setDayHasData] = useState<Record<string, boolean>>({});

  const [habits, setHabits] = useState<HabitDef[]>([]);
  const [checked, setChecked] = useState<DailyLog>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [intention, setIntention] = useState('');
  const [gratitude, setGratitude] = useState<GratitudeEntries>(['', '', '']);
  const [mood, setMood] = useState(0);

  const [activityDetail, setActivityDetail] = useState<ActivityDetail>({ types: [], other: '' });
  const [fruitDetail, setFruitDetail] = useState('');
  const [readingDetail, setReadingDetail] = useState<ReadingDetail>({
    bookTitle: '', bookAuthor: '', podcastTitle: '', podcastHost: '', podcastGuest: '',
  });
  const [waterGlasses, setWaterGlasses] = useState(0);

  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [noteDraft, setNoteDraft] = useState('');

  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [pedometerAvailable, setPedometerAvailable] = useState(true);
  const [selfiePhotoUri, setSelfiePhotoUri] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [levelName, setLevelName] = useState('');
  const [programDay, setProgramDay] = useState(1);
  const [todayChallengeTitle, setTodayChallengeTitle] = useState<string | null>(null);
  const [todayChallengeTheme, setTodayChallengeTheme] = useState<string | null>(null);
  const [todayLevelNumber, setTodayLevelNumber] = useState<number | null>(null);
  // Day 30 answered: the choice between the next Level and keeping the tracker only.
  const [levelFinished, setLevelFinished] = useState(false);
  const [nextLevel, setNextLevel] = useState<LevelDef | null>(null);
  const [trackerOnlyOffered, setTrackerOnlyOffered] = useState(false);

  const [celebrateTrigger, setCelebrateTrigger] = useState(0);
  const [celebrateAnim] = useState(() => new Animated.Value(0));
  const prevAllComplete = useRef(false);

  const refreshSteps = useCallback(async () => {
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      setPedometerAvailable(isAvailable);
      if (!isAvailable) return;

      if (Pedometer.requestPermissionsAsync) {
        try { await Pedometer.requestPermissionsAsync(); } catch {}
      }

      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const result = await Pedometer.getStepCountAsync(start, end);
      setTodaySteps(result.steps);

      const shouldBeChecked = result.steps >= STEP_GOAL;
      const currentDay = await getLogForDate(todayKey);
      if (shouldBeChecked !== !!currentDay['steps']) {
        const updated = await setHabitValue(todayKey, 'steps', shouldBeChecked);
        setChecked(updated);
      }
    } catch (err) {
      console.log('Pedometer error:', err);
      setPedometerAvailable(false);
    }
  }, [todayKey]);

  const refreshTodayChallenge = useCallback(async () => {
    try {
      const info = await getTodayChallengeInfo();
      setLevelName(info.level.name);
      setTodayLevelNumber(info.level.number);
      setProgramDay(info.levelDay || 1);
      setTodayChallengeTitle(info.challenge ? info.challenge.title : null);
      setTodayChallengeTheme(info.challenge ? info.challenge.theme : null);
      setLevelFinished(info.levelFinished);
      setNextLevel(info.nextLevel);
      setTrackerOnlyOffered(await canUseTrackerOnly());

      const currentDay = await getLogForDate(todayKey);
      if (info.answeredToday !== !!currentDay['app-tasks']) {
        const updated = await setHabitValue(todayKey, 'app-tasks', info.answeredToday);
        setChecked(updated);
      }
    } catch (err) {
      console.log('refreshTodayChallenge error (non-fatal):', err);
    }
  }, [todayKey]);

  // Stable identity is the point here - this is the dep of the day-switch effect below, so it
  // must not be re-created every render.
  const loadDayData = useCallback(async (dateKey: string) => {
    const [h, log, savedIntention, savedGratitude, savedMood, activity, fruit, reading, glasses, savedSelfie, dayNotes] =
      await Promise.all([
        getHabits(),
        getLogForDate(dateKey),
        getIntention(dateKey),
        getGratitude(dateKey),
        getMoodRating(dateKey),
        getActivityDetail(dateKey),
        getFruitDetail(dateKey),
        getReadingDetail(dateKey),
        getWaterGlasses(dateKey),
        getSelfiePhoto(dateKey),
        getNotes(dateKey),
      ]);
    setHabits(h);
    setChecked(log);
    setIntention(savedIntention);
    setGratitude(savedGratitude);
    setMood(savedMood);
    setActivityDetail(activity);
    setFruitDetail(fruit);
    setReadingDetail(reading);
    setWaterGlasses(glasses);
    setSelfiePhotoUri(savedSelfie);
    setNotes(dayNotes);
  }, []);

  const refreshDayStatuses = useCallback(async () => {
    // One bulk read - a 30-day strip through the per-date helper would be hundreds.
    setDayHasData(await getDaysWithData(stripDates));
  }, [stripDates]);

  /** Which Levels have been started (and so which history is reachable), and the mode. */
  const refreshLevels = useCallback(async () => {
    const [levels, settings] = await Promise.all([getStartedLevels(), getSettings()]);
    setStartedLevels(levels);
    setTrackerOnly(settings.trackerOnly);
    setViewedLevel((current) => {
      if (current !== null && levels.some((l) => l.level.number === current)) return current;
      return levels[levels.length - 1]?.level.number ?? null;
    });
  }, []);

  // Switching days (tap or swipe on the strip) reloads that day's data immediately.
  // Loading a different day's data IS synchronising with an external store (AsyncStorage),
  // which is what effects are for. Collapsing the open panel alongside it is deliberate.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadDayData(activeDateKey);
    setExpandedId(null);
  }, [activeDateKey, loadDayData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Tab regaining focus: refresh statuses always, and (only for Today) sync steps/challenge and re-pull
  // in case something changed elsewhere (e.g. a challenge was completed on the Challenges tab).
  useFocusEffect(
    useCallback(() => {
      markScreenVisited('today');
      // Re-read on focus so a name changed in Settings shows the moment you come back.
      getSettings().then((s) => setFirstName(s.firstName)).catch(() => {});
      refreshLevels();
      refreshDayStatuses();
      if (isToday) {
        refreshSteps();
        // Level 1's clock starts inside this on a first run, so re-read the Levels after it.
        refreshTodayChallenge().then(refreshLevels);
        loadDayData(todayKey);
      }
    }, [isToday, todayKey, refreshLevels, refreshDayStatuses, refreshSteps, refreshTodayChallenge, loadDayData])
  );

  /** Starts the next Level from the Day 30 choice card. */
  const handleStartNextLevel = async () => {
    if (!nextLevel) return;
    await startLevel(nextLevel.number);
    if (trackerOnly) await saveSettings({ trackerOnly: false });
    setViewedLevel(nextLevel.number);
    setActiveDateKey(todayKey);
    await refreshTodayChallenge();
    await refreshLevels();
    // The habit list changes back to 13 when leaving tracker-only.
    loadDayData(todayKey);
  };

  /** Keeps the habit tracker going with no Level running. */
  const handleKeepTrackerOnly = async () => {
    await saveSettings({ trackerOnly: true });
    await refreshLevels();
    loadDayData(todayKey);
  };

  const scrollToDay = useCallback((index: number, animated: boolean) => {
    dayScrollRef.current?.scrollTo({ x: index * (TILE_WIDTH + TILE_GAP), animated });
  }, []);

  /**
   * Scrolling the strip LOOKS, it does not SELECT. Only a tap changes the day.
   *
   * This used to work the other way and it fought the user badly: `onMomentumScrollEnd`
   * set the active day from the scroll position, and a `useEffect` on `activeIndex` then
   * scrolled the strip to wherever that landed. Scroll to see Day 13 while on Day 10 and
   * the momentum handler picked the tile nearest the LEFT EDGE - `Math.round(x / tile)` is
   * the leftmost index, not the centre or the tapped one - selected it, and the effect
   * yanked the strip back to it. So the strip jumped mid-gesture and taps on a distant day
   * appeared to snap back.
   *
   * Both halves of that loop are gone. The strip is only scrolled programmatically when it
   * is rebuilt - first render, or a Level change - so the selected day is on screen to
   * begin with. After that the scroll position is the user's, and nothing takes it back.
   */
  const lastStripKey = useRef<string | null>(null);
  useEffect(() => {
    if (stripDates.length === 0) return;
    const stripKey = `${stripDates[0]}:${stripDates.length}`;
    if (stripKey === lastStripKey.current) return;
    lastStripKey.current = stripKey;

    const index = Math.max(0, stripDates.indexOf(activeDateKey));
    // Not animated: this is the strip arriving, not the user being moved.
    scrollToDay(index, false);
  }, [stripDates, activeDateKey, scrollToDay]);

  /**
   * Arriving from the Progress calendar, which opens a specific date here. Consumed once -
   * the tab keeps its params, so without the guard it would re-open that date on every visit.
   * Lands on whichever Level's strip holds that date, so the tile is there to see.
   */
  const params = useLocalSearchParams<{ date?: string }>();
  const consumedDate = useRef<string | null>(null);
  // Syncing with navigation params (an external input) is what effects are for.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const date = params.date;
    if (!date || consumedDate.current === date || startedLevels.length === 0) return;
    consumedDate.current = date;
    if (!trackerOnly) {
      const inRolling = latestLevel && rollingStripDates(latestLevel.startDate, todayKey).includes(date);
      const holder = inRolling ? latestLevel : startedLevels.find((l) => l.dates.includes(date));
      if (holder) setViewedLevel(holder.level.number);
    }
    setActiveDateKey(date);
    lastStripKey.current = null; // re-centre the strip on the arriving date
    // A date older than the rolling strip has no dot status yet - read it for the banner.
    getDaysWithData([date]).then((d) => setDayHasData((prev) => ({ ...prev, ...d })));
  }, [params.date, startedLevels, latestLevel, trackerOnly, todayKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * Tapping today's challenge title jumps straight to it on the Challenges tab, rather than
   * making someone find the Level and the day themselves. The title is the thing people
   * read first and the thing they want to act on, so it should be the way in.
   */
  const openTodayChallenge = () => {
    if (todayLevelNumber === null) return;
    router.push({
      pathname: '/challenges',
      params: { level: String(todayLevelNumber), day: String(programDay) },
    });
  };

  /** A tap selects, and nothing else. It never scrolls the strip out from under the finger. */
  const handleSelectDay = (index: number) => {
    setActiveDateKey(stripDates[index]);
  };

  /**
   * Switching Level jumps to that Level's most recent day - today for the current Level,
   * Day 30 for a finished one - which is where you'd want to land when reviewing.
   */
  const handleSelectLevel = (levelNumber: number) => {
    setLevelPickerOpen(false);
    if (levelNumber === viewedLevel) return;
    const target = startedLevels.find((l) => l.level.number === levelNumber);
    if (!target) return;
    setViewedLevel(levelNumber);
    if (target === latestLevel) {
      setActiveDateKey(todayKey);
    } else {
      const upTo = target.dates.filter((d) => d <= todayKey);
      setActiveDateKey(upTo[upTo.length - 1] ?? target.dates[0]);
    }
  };


  const handleToggle = async (id: string) => {
    const habit = habits.find((h) => h.id === id);
    // Auto habits (steps / today's challenge) stay automatic only for Today - a live sensor/status
    // can't be reconstructed for a past day, so those become manually fixable when catching up.
    if (habit?.auto && isToday) return;
    const updatedDay = await toggleHabit(activeDateKey, id);
    setChecked(updatedDay);
    // Ticking a past day means the history strip was used to catch up - that is the only
    // way to tell a backfill from a live log after the fact, so record it now.
    if (!isToday) recordBackfill(activeDateKey);
    if (DETAIL_HABIT_IDS.includes(id) && updatedDay[id]) {
      setExpandedId(id);
    }
    refreshDayStatuses();
  };

  const toggleExpanded = (id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  };

  const handleTakeSelfie = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Enable camera access in your device settings to take your daily selfie.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const uri = result.assets[0].uri;
      await saveSelfiePhoto(activeDateKey, uri);
      setSelfiePhotoUri(uri);
      const updated = await setHabitValue(activeDateKey, 'selfie', true);
      setChecked(updated);
      refreshDayStatuses();
    }
  };

  const startEditing = (habit: HabitDef) => {
    setEditingId(habit.id);
    setDraftLabel(habit.label);
  };

  const commitEdit = async () => {
    if (!editingId) return;
    const trimmed = draftLabel.trim();
    if (trimmed.length > 0) {
      const updated = await saveHabitLabel(editingId, trimmed);
      setHabits(updated);
      recordCustomHabitLabel(editingId, trimmed);
    }
    setEditingId(null);
  };

  const updateGratitudeField = (index: number, value: string) => {
    setGratitude((prev) => {
      const next = [...prev] as GratitudeEntries;
      next[index] = value;
      return next;
    });
  };

  const commitGratitude = () => saveGratitude(activeDateKey, gratitude);
  const commitIntention = () => saveIntention(activeDateKey, intention);

  const handleSelectMood = (value: number) => {
    const next = mood === value ? 0 : value; // tap the same star again to clear it
    setMood(next);
    saveMoodRating(activeDateKey, next);
    refreshDayStatuses();
  };

  const toggleActivityType = (type: string) => {
    setActivityDetail((prev) => {
      const types = prev.types.includes(type) ? prev.types.filter((t) => t !== type) : [...prev.types, type];
      const next = { ...prev, types };
      saveActivityDetail(activeDateKey, next);
      return next;
    });
  };

  const updateActivityOther = (text: string) => setActivityDetail((prev) => ({ ...prev, other: text }));
  const commitActivityOther = () => saveActivityDetail(activeDateKey, activityDetail);

  const commitFruitDetail = () => saveFruitDetail(activeDateKey, fruitDetail);

  const updateReadingField = (field: keyof ReadingDetail, value: string) =>
    setReadingDetail((prev) => ({ ...prev, [field]: value }));
  const commitReadingDetail = () => saveReadingDetail(activeDateKey, readingDetail);

  const handleSelectWaterGlasses = async (glasses: number) => {
    setWaterGlasses(glasses);
    await saveWaterGlasses(activeDateKey, glasses);
    const updated = await setHabitValue(activeDateKey, 'water', glasses >= WATER_GOAL_GLASSES);
    setChecked(updated);
    refreshDayStatuses();
  };

  const handleAddNote = async () => {
    const text = noteDraft.trim();
    if (!text) return;
    const updated = await addNote(activeDateKey, text);
    setNotes(updated);
    setNoteDraft('');
    refreshDayStatuses();
  };

  const handleDeleteNote = async (id: string) => {
    const updated = await deleteNote(activeDateKey, id);
    setNotes(updated);
  };

  const completedCount = habits.filter((h) => checked[h.id]).length;
  const allComplete = habits.length > 0 && completedCount === habits.length;
  const gratitudeNumbers = ['1', '2', '3'];

  useEffect(() => {
    if (!isToday) return;
    if (allComplete && !prevAllComplete.current) {
      Animated.spring(celebrateAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
      setCelebrateTrigger((t) => t + 1);
      if (isToday) recordDayCompleted(todayKey);
    } else if (!allComplete) {
      celebrateAnim.setValue(0);
    }
    prevAllComplete.current = allComplete;
  }, [allComplete, isToday, todayKey, celebrateAnim]);

  return (
    <>
      {/* Today keeps its deeper bottom padding - the habit detail panels expand inline. */}
      <KeyboardAwareScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 260 }}>
        {/* Tagline cut follows the ground, not the brand - the white cut vanishes on ivory. */}
        <Image source={LOGO_IS_HERE[t.logoTone]} style={styles.logo} resizeMode="contain" />

        {/* Only when there's a name - without one, a bare "Good morning" adds nothing. */}
        {isToday && !!firstName.trim() && <Text style={styles.greeting}>{greeting(firstName)}</Text>}
        <Text style={styles.headerTitle}>Today iTHRIVE.</Text>
        <Text style={styles.levelLabel}>
          {trackerOnly ? 'Habit tracker' : `${levelName} · Day ${programDay} of 30`}
        </Text>
        {isToday && !trackerOnly && !!todayChallengeTitle && (
          <Pressable
            style={styles.dayHeaderCard}
            onPress={openTodayChallenge}
            accessibilityRole="button"
            accessibilityHint="Opens today's challenge on the Challenges tab"
          >
            <View style={styles.dayHeaderTextWrap}>
              <Text style={styles.dayHeaderTitle}>{todayChallengeTitle}</Text>
              {!!todayChallengeTheme && <Text style={styles.dayHeaderSubtitle}>{todayChallengeTheme}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.primaryDim} />
          </Pressable>
        )}

        {/*
          Day 30 answered: the challenge and the tracker can split here. Start the next Level,
          or keep the habit tracker only (a paid option - see lib/entitlements.ts). Neither is
          pushed: skipped days of this Level stay open whichever is chosen.
        */}
        {isToday && !trackerOnly && levelFinished && (nextLevel || trackerOnlyOffered) && (
          <View style={styles.choiceCard}>
            <Text style={styles.choiceTitle}>{levelName} is complete.</Text>
            <Text style={styles.choiceBody}>What comes next is your call.</Text>
            {!!nextLevel && (
              <Pressable style={styles.choicePrimary} onPress={handleStartNextLevel}>
                <Text style={styles.choicePrimaryText}>
                  Start Level {nextLevel.number} · {nextLevel.name}
                </Text>
              </Pressable>
            )}
            {trackerOnlyOffered && (
              <Pressable style={styles.choiceSecondary} onPress={handleKeepTrackerOnly}>
                <Text style={styles.choiceSecondaryText}>Keep tracking my habits only</Text>
              </Pressable>
            )}
          </View>
        )}

        {isToday && <ReminderOffer hasLoggedAnything={Object.values(dayHasData).some(Boolean)} />}

        {allComplete && isToday && (
          <Animated.View style={[styles.celebrateBanner, { transform: [{ scale: celebrateAnim }], opacity: celebrateAnim }]}>
            <Text style={styles.celebrateEmoji}>🎉</Text>
            <Text style={styles.celebrateText}>Well done! That&apos;s a 100% day.</Text>
          </Animated.View>
        )}

        <View style={styles.dayStripWrap}>
          <View style={styles.stripHeaderRow}>
            {trackerOnly ? (
              <Text style={styles.levelPickerText} numberOfLines={1}>
                {formatMonth(activeDateKey)}
              </Text>
            ) : (
              <Pressable
                style={styles.levelPickerButton}
                onPress={() => startedLevels.length > 1 && setLevelPickerOpen(true)}
                disabled={startedLevels.length <= 1}
              >
                <Text style={styles.levelPickerText} numberOfLines={1}>
                  {activeLevel ? `Level ${activeLevel.level.number} · ${activeLevel.level.name}` : 'Today'}
                </Text>
                {startedLevels.length > 1 && <Ionicons name="chevron-down" size={14} color={t.primary} />}
              </Pressable>
            )}

            {!isCurrentLevel && <Text style={styles.stripHistoryTag}>HISTORY</Text>}
            {isCurrentLevel && !isToday && (
              <Pressable onPress={() => setActiveDateKey(todayKey)} hitSlop={8}>
                <Text style={styles.jumpToTodayText}>Jump to today</Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            ref={dayScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={TILE_WIDTH + TILE_GAP}
            decelerationRate="fast"
            contentContainerStyle={{ gap: TILE_GAP }}
          >
            {stripDates.map((d, i) => {
              const tile = formatDayTile(d);
              const isActive = d === activeDateKey;
              const dIsToday = d === todayKey;
              // D1-D30 inside a Level; past Day 30 (and in tracker-only) the month instead.
              const levelDay = trackerOnly ? undefined : levelDayByDate[d];
              return (
                <Pressable key={d} onPress={() => handleSelectDay(i)} style={[styles.dayTile, isActive && styles.dayTileActive]}>
                  <Text style={[styles.dayTileWeekday, isActive && styles.dayTileTextActive]}>
                    {dIsToday ? 'Today' : tile.weekday}
                  </Text>
                  <Text style={[styles.dayTileNum, isActive && styles.dayTileTextActive]}>{tile.num}</Text>
                  <Text style={[styles.dayTileDayNo, isActive && styles.dayTileTextActive]}>
                    {levelDay ? `D${levelDay}` : tile.month}
                  </Text>
                  <View style={[styles.dayTileDot, dayHasData[d] && styles.dayTileDotFilled]} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <Modal
          visible={levelPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setLevelPickerOpen(false)}
        >
          <Pressable style={styles.pickerBackdrop} onPress={() => setLevelPickerOpen(false)}>
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>View a Level</Text>
              {[...startedLevels].reverse().map((l) => {
                const selected = l.level.number === viewedLevel;
                const current = l === latestLevel;
                return (
                  <Pressable
                    key={l.level.number}
                    style={[styles.pickerRow, selected && styles.pickerRowSelected]}
                    onPress={() => handleSelectLevel(l.level.number)}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={17}
                      color={selected ? t.primary : t.muted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerRowText, selected && styles.pickerRowTextSelected]}>
                        Level {l.level.number} · {l.level.name}
                      </Text>
                      <Text style={styles.pickerRowSub}>
                        {current ? `Current · started ${formatFullDate(l.startDate)}` : `Started ${formatFullDate(l.startDate)}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Modal>

        {!isToday && dayHasData[activeDateKey] && (
          <View style={styles.editingBanner}>
            <Ionicons name="create-outline" size={16} color={t.primary} />
            <Text style={styles.editingBannerText}>Editing {formatFullDate(activeDateKey)}.</Text>
          </View>
        )}
        {!isToday && !dayHasData[activeDateKey] && (
          <View style={styles.catchUpBanner2}>
            <Ionicons name="create-outline" size={16} color={t.onPrimary} />
            <Text style={styles.catchUpBanner2Text}>
              No entry for {formatFullDate(activeDateKey)} yet — fill it in below so it&apos;s not lost.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Intention</Text>
        <TextInput
          style={styles.singleInput}
          value={intention}
          onChangeText={setIntention}
          onBlur={commitIntention}
          placeholder="What is your focus for today?"
          placeholderTextColor={t.muted}
          multiline
        />

        <Text style={styles.progressText}>{completedCount} / {habits.length} habits complete</Text>

        {habits.map((habit) => {
          const hasDetail = DETAIL_HABIT_IDS.includes(habit.id);
          const isExpanded = expandedId === habit.id;
          return (
            <View key={habit.id} style={[styles.habitRow, checked[habit.id] && styles.habitRowChecked]}>
              <View style={styles.habitRowTop}>
                {habit.id === 'selfie' ? (
                  <Pressable onPress={handleTakeSelfie} style={styles.habitLeft}>
                    {selfiePhotoUri ? (
                      <Image source={{ uri: selfiePhotoUri }} style={styles.selfieThumb} />
                    ) : (
                      <Ionicons name="camera" size={26} color={t.secondaryDim} />
                    )}
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={[styles.habitLabel, checked[habit.id] && styles.habitLabelChecked]}>{habit.label}</Text>
                      <Text style={styles.stepSubtitle}>{selfiePhotoUri ? 'Tap to retake' : "Tap to take today's selfie"}</Text>
                    </View>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => handleToggle(habit.id)} style={styles.habitLeft}>
                    <Ionicons
                      name={checked[habit.id] ? 'checkmark-circle' : 'ellipse-outline'}
                      size={26}
                      color={checked[habit.id] ? t.primary : t.secondaryDim}
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      {editingId === habit.id ? (
                        <TextInput
                          style={styles.habitInput}
                          value={draftLabel}
                          onChangeText={setDraftLabel}
                          onBlur={commitEdit}
                          onSubmitEditing={commitEdit}
                          autoFocus
                          placeholder="Name this habit"
                          placeholderTextColor={t.muted}
                        />
                      ) : (
                        <Text style={[styles.habitLabel, checked[habit.id] && styles.habitLabelChecked]}>{habit.label}</Text>
                      )}
                      {habit.id === 'steps' && isToday && pedometerAvailable && (
                        <Text style={styles.stepSubtitle}>
                          {todaySteps !== null ? `${todaySteps.toLocaleString()} / ${STEP_GOAL.toLocaleString()} steps` : 'Reading step count...'}
                        </Text>
                      )}
                      {habit.id === 'steps' && isToday && !pedometerAvailable && (
                        <Text style={styles.stepSubtitle}>Step tracking unavailable on this device</Text>
                      )}
                      {habit.id === 'app-tasks' && isToday && (
                        <Text style={styles.stepSubtitle}>{todayChallengeTitle ? todayChallengeTitle : 'No challenge scheduled today'}</Text>
                      )}
                      {habit.id === 'fruit' && !!fruitDetail && (
                        <Text style={styles.stepSubtitle} numberOfLines={1}>{fruitDetail}</Text>
                      )}
                      {habit.id === 'activity' && activityDetail.types.length > 0 && (
                        <Text style={styles.stepSubtitle} numberOfLines={1}>{activityDetail.types.join(', ')}</Text>
                      )}
                      {habit.id === 'water' && waterGlasses > 0 && (
                        <Text style={styles.stepSubtitle}>{waterGlasses} / {WATER_SCALE_MAX} glasses</Text>
                      )}
                      {habit.id === 'reading' && !!(readingDetail.bookTitle || readingDetail.podcastTitle) && (
                        <Text style={styles.stepSubtitle} numberOfLines={1}>{readingDetail.bookTitle || readingDetail.podcastTitle}</Text>
                      )}
                    </View>
                  </Pressable>
                )}

                {habit.editable && editingId !== habit.id && (
                  <Pressable onPress={() => startEditing(habit)} hitSlop={10}>
                    <Ionicons name="pencil" size={18} color={t.muted} />
                  </Pressable>
                )}

                {habit.auto && isToday && (
                  <View style={styles.autoBadge}>
                    <Ionicons name="sync" size={12} color={t.primaryDim} />
                    <Text style={styles.autoBadgeText}>AUTO</Text>
                  </View>
                )}

                {hasDetail && (
                  <Pressable onPress={() => toggleExpanded(habit.id)} hitSlop={10} style={{ marginLeft: 8 }}>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={t.muted} />
                  </Pressable>
                )}
              </View>

              {hasDetail && isExpanded && (
                <View style={styles.detailPanel}>
                  {habit.id === 'activity' && (
                    <>
                      <Text style={styles.detailLabel}>What did you do?</Text>
                      <View style={styles.chipRow}>
                        {ACTIVITY_TYPES.map((type) => (
                          <Pressable
                            key={type}
                            style={[styles.miniChip, activityDetail.types.includes(type) && styles.miniChipActive]}
                            onPress={() => toggleActivityType(type)}
                          >
                            <Text style={[styles.miniChipText, activityDetail.types.includes(type) && styles.miniChipTextActive]}>{type}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <TextInput
                        style={styles.detailInput}
                        value={activityDetail.other}
                        onChangeText={updateActivityOther}
                        onBlur={commitActivityOther}
                        placeholder="Other (type your own)"
                        placeholderTextColor={t.muted}
                      />
                    </>
                  )}

                  {habit.id === 'fruit' && (
                    <>
                      <Text style={styles.detailLabel}>Which fruit?</Text>
                      <TextInput
                        style={styles.detailInput}
                        value={fruitDetail}
                        onChangeText={setFruitDetail}
                        onBlur={commitFruitDetail}
                        placeholder="e.g. Banana, apple"
                        placeholderTextColor={t.muted}
                      />
                    </>
                  )}

                  {habit.id === 'water' && (
                    <>
                      <Text style={styles.detailLabel}>How many glasses did you actually drink?</Text>
                      <View style={styles.waterScaleRow}>
                        {Array.from({ length: WATER_SCALE_MAX + 1 }, (_, n) => n).map((n) => (
                          <Pressable
                            key={n}
                            onPress={() => handleSelectWaterGlasses(n)}
                            style={[styles.waterGlassDot, n <= waterGlasses && styles.waterGlassDotFilled, n === WATER_GOAL_GLASSES && styles.waterGlassGoalMark]}
                          >
                            <Text style={[styles.waterGlassDotText, n <= waterGlasses && styles.waterGlassDotTextFilled]}>{n}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <Text style={styles.detailHint}>
                        Goal is {WATER_GOAL_GLASSES} glasses - the scale goes to {WATER_SCALE_MAX} for days you drink more.
                      </Text>
                    </>
                  )}

                  {habit.id === 'reading' && (
                    <>
                      <Text style={styles.detailLabel}>Book</Text>
                      <TextInput
                        style={styles.detailInput}
                        value={readingDetail.bookTitle}
                        onChangeText={(t) => updateReadingField('bookTitle', t)}
                        onBlur={commitReadingDetail}
                        placeholder="Title"
                        placeholderTextColor={t.muted}
                      />
                      <TextInput
                        style={styles.detailInput}
                        value={readingDetail.bookAuthor}
                        onChangeText={(t) => updateReadingField('bookAuthor', t)}
                        onBlur={commitReadingDetail}
                        placeholder="Author"
                        placeholderTextColor={t.muted}
                      />
                      <Text style={[styles.detailLabel, { marginTop: 10 }]}>Or podcast</Text>
                      <TextInput
                        style={styles.detailInput}
                        value={readingDetail.podcastTitle}
                        onChangeText={(t) => updateReadingField('podcastTitle', t)}
                        onBlur={commitReadingDetail}
                        placeholder="Podcast title"
                        placeholderTextColor={t.muted}
                      />
                      <TextInput
                        style={styles.detailInput}
                        value={readingDetail.podcastHost}
                        onChangeText={(t) => updateReadingField('podcastHost', t)}
                        onBlur={commitReadingDetail}
                        placeholder="Host"
                        placeholderTextColor={t.muted}
                      />
                      <TextInput
                        style={styles.detailInput}
                        value={readingDetail.podcastGuest}
                        onChangeText={(t) => updateReadingField('podcastGuest', t)}
                        onBlur={commitReadingDetail}
                        placeholder="Guest (optional)"
                        placeholderTextColor={t.muted}
                      />
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Gratitude</Text>
        <Text style={styles.promptLabel}>Today I am grateful for:</Text>
        {gratitudeNumbers.map((num, i) => (
          <View key={num} style={styles.numberedRow}>
            <Text style={styles.numberLabel}>{num}.</Text>
            <TextInput
              style={styles.numberedInput}
              value={gratitude[i]}
              onChangeText={(text) => updateGratitudeField(i, text)}
              onBlur={commitGratitude}
              placeholder="Type here"
              placeholderTextColor={t.muted}
            />
          </View>
        ))}

        <Text style={styles.sectionTitle}>Mood</Text>
        <Text style={styles.promptLabel}>How are you feeling?</Text>
        <View style={styles.moodRow}>
          {Array.from({ length: MOOD_SCALE_MAX }, (_, i) => i + 1).map((n) => (
            <Pressable key={n} onPress={() => handleSelectMood(n)} hitSlop={6}>
              <Ionicons name={n <= mood ? 'star' : 'star-outline'} size={32} color={n <= mood ? t.primary : t.faint} />
            </Pressable>
          ))}
        </View>
        {mood > 0 && <Text style={styles.moodValueText}>{mood} / {MOOD_SCALE_MAX}</Text>}

        <Text style={styles.sectionTitle}>Notes</Text>
        <Text style={styles.promptLabel}>Add as many timestamped reflections as you like.</Text>
        {notes.map((n) => (
          <View key={n.id} style={styles.noteRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.noteTimestamp}>{formatNoteTimestamp(n.timestamp)}</Text>
              <Text style={styles.noteText}>{n.text}</Text>
            </View>
            <Pressable onPress={() => handleDeleteNote(n.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={t.muted} />
            </Pressable>
          </View>
        ))}
        <View style={styles.noteForm}>
          <TextInput
            style={styles.noteInput}
            value={noteDraft}
            onChangeText={setNoteDraft}
            placeholder="Write a reflection..."
            placeholderTextColor={t.muted}
            multiline
          />
          <Pressable style={styles.addNoteButton} onPress={handleAddNote}>
            <Ionicons name="add" size={16} color={t.onPrimary} />
            <Text style={styles.addNoteButtonText}>Add Note</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Image source={LOGO_MARK} style={styles.footerLogo} resizeMode="contain" />
          <Text style={styles.motto}>Change · Grow · Evolve</Text>
        </View>
      </KeyboardAwareScrollView>
      <Fireworks trigger={celebrateTrigger} />
    </>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ground },
    logo: { width: '100%', height: 88, marginBottom: 8 },
    greeting: { color: t.secondary, fontSize: 15, fontWeight: '600', marginBottom: 2 },
    headerTitle: { color: t.primary, fontSize: 24, fontWeight: '800', marginBottom: 2 },
    levelLabel: { color: t.primaryDim, fontSize: 13, fontWeight: '600', letterSpacing: 1, marginBottom: 14 },
    dayHeaderTextWrap: { flex: 1 },
    dayHeaderCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 14, marginBottom: 16 },
    dayHeaderTitle: { color: t.ink, fontSize: 17, fontWeight: '700' },
    dayHeaderSubtitle: { color: t.primaryDim, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
    celebrateBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.ground, borderWidth: 2, borderColor: t.primary, borderRadius: 12, padding: 14, marginBottom: 16, gap: 10 },
    celebrateEmoji: { fontSize: 22 },
    celebrateText: { color: t.primary, fontSize: 14, fontWeight: '700', flex: 1 },

    dayStripWrap: { marginBottom: 14 },
    dayTile: { width: TILE_WIDTH, alignItems: 'center', backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, paddingVertical: 10 },
    dayTileActive: { borderColor: t.primary, backgroundColor: t.primaryTint },
    dayTileWeekday: { color: t.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    dayTileNum: { color: t.inkSoft, fontSize: 16, fontWeight: '700', marginTop: 2 },
    dayTileTextActive: { color: t.primary },
    stripHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
    levelPickerButton: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
    levelPickerText: { color: t.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.4, flexShrink: 1 },
    stripHistoryTag: { color: t.primaryDim, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    pickerBackdrop: { flex: 1, backgroundColor: t.scrim, justifyContent: 'center', padding: 28 },
    pickerCard: { backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.borderMuted, padding: 10, maxHeight: '70%' },
    pickerTitle: { color: t.primary, fontSize: 13, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', padding: 12, paddingBottom: 8 },
    pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 10 },
    pickerRowSelected: { backgroundColor: t.primaryTint },
    pickerRowText: { color: t.body, fontSize: 14, fontWeight: '600' },
    pickerRowTextSelected: { color: t.primary },
    pickerRowSub: { color: t.muted, fontSize: 11, marginTop: 2 },
    choiceCard: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.primary, borderRadius: 14, padding: 16, marginBottom: 16, gap: 8 },
    choiceTitle: { color: t.primary, fontSize: 17, fontWeight: '800' },
    choiceBody: { color: t.body, fontSize: 14, marginBottom: 4 },
    choicePrimary: { backgroundColor: t.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' },
    choicePrimaryText: { color: t.onPrimary, fontSize: 14, fontWeight: '800', textAlign: 'center' },
    choiceSecondary: { borderWidth: 1, borderColor: t.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
    choiceSecondaryText: { color: t.primary, fontSize: 14, fontWeight: '700' },
    jumpToTodayText: { color: t.primaryDim, fontSize: 11, fontWeight: '700' },
    dayTileDayNo: { color: t.faint, fontSize: 9, fontWeight: '700', marginTop: 1 },
    dayTileDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: t.borderStrong, marginTop: 6 },
    dayTileDotFilled: { backgroundColor: t.success },

    editingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.primary, borderRadius: 12, padding: 12, marginBottom: 16 },
    editingBannerText: { color: t.body, fontSize: 12, flex: 1, lineHeight: 17 },
    catchUpBanner2: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.primary, borderRadius: 12, padding: 12, marginBottom: 16 },
    catchUpBanner2Text: { color: t.onPrimary, fontSize: 12, flex: 1, lineHeight: 17, fontWeight: '600' },

    sectionTitle: { color: t.primary, fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 10 },
    promptLabel: { color: t.body, fontSize: 14, marginBottom: 6 },
    singleInput: {
      color: t.ink, fontSize: 15, backgroundColor: t.surface, borderRadius: 10, borderWidth: 1,
      borderColor: t.border, padding: 12, marginBottom: 12, minHeight: 44,
    },
    numberedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    numberLabel: { color: t.primary, fontSize: 15, fontWeight: '700', width: 20 },
    numberedInput: {
      flex: 1, color: t.ink, fontSize: 15, backgroundColor: t.surface, borderRadius: 10,
      borderWidth: 1, borderColor: t.border, padding: 12, minHeight: 44,
    },
    progressText: { color: t.secondary, marginTop: 8, marginBottom: 16 },
    habitRow: { backgroundColor: t.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: t.border },
    habitRowChecked: { borderColor: t.primary },
    habitRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    habitLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    habitLabel: { color: t.inkSoft, fontSize: 16 },
    habitLabelChecked: { color: t.ink, fontWeight: '600' },
    habitInput: { color: t.ink, fontSize: 16, borderBottomWidth: 1, borderBottomColor: t.primary, paddingVertical: 2 },
    stepSubtitle: { color: t.primaryDim, fontSize: 12, marginTop: 3 },
    selfieThumb: { width: 26, height: 26, borderRadius: 6 },
    autoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.primaryTint, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, gap: 3 },
    autoBadgeText: { color: t.primaryDim, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

    detailPanel: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: t.border },
    detailLabel: { color: t.secondary, fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    detailInput: { color: t.ink, fontSize: 14, backgroundColor: t.surfaceAlt, borderRadius: 8, borderWidth: 1, borderColor: t.borderMuted, padding: 10, marginBottom: 8 },
    detailHint: { color: t.muted, fontSize: 11, marginTop: 6, fontStyle: 'italic' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    miniChip: { borderWidth: 1, borderColor: t.borderStrong, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
    miniChipActive: { backgroundColor: t.primary, borderColor: t.primary },
    miniChipText: { color: t.secondary, fontSize: 12, fontWeight: '600' },
    miniChipTextActive: { color: t.onPrimary },

    waterScaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
    waterGlassDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: t.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surfaceAlt },
    waterGlassDotFilled: { backgroundColor: t.primary, borderColor: t.primary },
    waterGlassGoalMark: { borderColor: t.primary, borderWidth: 2 },
    waterGlassDotText: { color: t.secondaryDim, fontSize: 11, fontWeight: '700' },
    waterGlassDotTextFilled: { color: t.onPrimary },

    moodRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
    moodValueText: { color: t.primaryDim, fontSize: 13, fontWeight: '600', marginBottom: 12 },

    noteRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: t.surface, borderRadius: 10, borderWidth: 1, borderColor: t.border, padding: 12, marginBottom: 10, gap: 10 },
    noteTimestamp: { color: t.primaryDim, fontSize: 11, fontWeight: '600', marginBottom: 3 },
    noteText: { color: t.inkSoft, fontSize: 14, lineHeight: 19 },
    noteForm: { marginBottom: 8 },
    noteInput: {
      color: t.ink, fontSize: 15, backgroundColor: t.surface, borderRadius: 10, borderWidth: 1,
      borderColor: t.border, padding: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 10,
    },
    addNoteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: t.primary, borderRadius: 10, paddingVertical: 12 },
    addNoteButtonText: { color: t.onPrimary, fontWeight: '700', fontSize: 14 },
    emptyText: { color: t.muted, fontSize: 13, fontStyle: 'italic', marginBottom: 10 },

    footer: { alignItems: 'center', marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: t.border },
    footerLogo: { width: 120, height: 50, marginBottom: 10, opacity: 0.9 },
    motto: {
      color: t.primaryDim, fontSize: 13, fontWeight: '700', letterSpacing: 4, textTransform: 'uppercase',
      textShadowColor: 'rgba(255,255,255,0.18)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1,
    },
  });
