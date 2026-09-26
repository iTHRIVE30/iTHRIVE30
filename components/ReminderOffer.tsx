import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { getTodayKey } from '../lib/habitStore';
import { reminderStatus, requestReminderPermission, syncReminders } from '../lib/reminders';
import { formatTime, getSettings, saveSettings, type Settings } from '../lib/settingsStore';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import type { Theme } from '../constants/theme';

/**
 * A one-time offer of the morning reminder, on the Today tab.
 *
 * Not asked during setup: turning reminders on raises the phone's own permission prompt,
 * and people refuse it on first launch, before the app means anything to them - and a
 * refusal is hard to undo. So it waits for a good moment instead: the first time they come
 * back on a LATER day, having already logged something. That reads as "you're building
 * something - want a hand?".
 *
 * NEVER tie it to a missed day. An offer that appears after a gap tells someone the app
 * noticed they slipped, which is the exact feeling the reminder tone rules forbid (see
 * lib/reminders.ts) and the opposite of "You cannot fall behind".
 *
 * Offered once. Yes or Not now, it never comes back - Settings has the switch from then on.
 * Hidden entirely where reminders can't run (Expo Go), rather than offering a dead switch.
 */
export default function ReminderOffer({ hasLoggedAnything }: { hasLoggedAnything: boolean }) {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const [settings, setSettings] = useState<Settings | null>(null);

  useFocusEffect(
    useCallback(() => {
      getSettings().then(setSettings).catch(() => {});
    }, [])
  );

  if (!settings || !shouldOffer(settings, hasLoggedAnything)) return null;

  const answer = async (wantsIt: boolean) => {
    const granted = wantsIt ? await requestReminderPermission() : false;
    try {
      const updated = await saveSettings({
        reminderOfferAt: new Date().toISOString(),
        ...(granted ? { morningReminder: true } : {}),
      });
      setSettings(updated);
      if (granted) syncReminders(updated);
    } catch {
      // Best-effort. The worst case is the offer showing once more next time.
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="notifications-outline" size={20} color={t.primary} />
        <Text style={styles.title}>Want a nudge in the morning?</Text>
      </View>
      <Text style={styles.body}>
        One quiet reminder at {formatTime(settings.morningTime)} to set up your day. Change the time or
        turn it off any time in Settings.
      </Text>
      <View style={styles.buttons}>
        <Pressable style={styles.yes} onPress={() => answer(true)}>
          <Text style={styles.yesText}>Yes, please</Text>
        </Pressable>
        <Pressable style={styles.no} onPress={() => answer(false)} hitSlop={8}>
          <Text style={styles.noText}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

function shouldOffer(s: Settings, hasLoggedAnything: boolean): boolean {
  if (!reminderStatus.available) return false;
  if (s.reminderOfferAt || s.morningReminder || s.eveningReminder) return false;
  if (!s.onboardedAt || !hasLoggedAnything) return false;
  // A later day than the one they started on. Local date keys, never toISOString.
  return getTodayKey(new Date(s.onboardedAt)) < getTodayKey();
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.primaryDim,
      padding: 16,
      marginBottom: 16,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    title: { color: t.ink, fontSize: 16, fontWeight: '700', flex: 1 },
    body: { color: t.body, fontSize: 14, lineHeight: 21 },
    buttons: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 14 },
    yes: { backgroundColor: t.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18 },
    yesText: { color: t.onPrimary, fontSize: 14, fontWeight: '800' },
    no: { paddingVertical: 10 },
    noText: { color: t.muted, fontSize: 14, fontWeight: '600' },
  });
