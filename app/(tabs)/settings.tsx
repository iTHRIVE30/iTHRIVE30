import { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import {
  Appearance,
  Settings,
  ageFromDob,
  isUnder18,
  formatDobForDisplay,
  formatTime,
  parseTimeInput,
  getSettings,
  parseDobInput,
  saveSettings,
} from '../../lib/settingsStore';
import {
  countStoredEntries,
  eraseAllData,
  exportBackup,
  restoreBackup,
} from '../../lib/backupStore';
import { monitoringStatus, setCrashReportingEnabled } from '../../lib/monitoring';
import { reminderStatus, requestReminderPermission, syncReminders } from '../../lib/reminders';
import { shareProgressSummary } from '../../lib/shareProgress';
import { useAppearance, useTheme, useThemedStyles } from '../../hooks/useTheme';
import type { Theme } from '../../constants/theme';


/**
 * Settings - preferences, and the only place the user can get their data out of the app.
 *
 * Deliberately not an "Account": no email, no password, no login. There is no server, and
 * adding one is investment-gated (AGENTS.md).
 *
 * Also deliberately absent: step and water targets. The 13 habits are a baseline, not a
 * threshold - personal targets belong to My Journey and the three editable habits.
 *
 * Appearance is a three-way: Dark, Light, or System - System follows the device live
 * rather than sampling once, so the app flips when the phone does.
 */

/** Set in app.json -> expo.extra. The rows stay hidden until they're real. */
const PRIVACY_POLICY_URL: string | undefined = Constants.expoConfig?.extra?.privacyPolicyUrl;
const SUPPORT_EMAIL: string =
  Constants.expoConfig?.extra?.supportEmail ?? 'bondiprojectglobal@gmail.com';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const APPEARANCE_OPTIONS: { key: Appearance; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function SettingsScreen() {
  const t = useTheme();
  const styles = useThemedStyles(createStyles);
  const { appearance, systemTheme, setAppearance } = useAppearance();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dobText, setDobText] = useState('');
  const [morningText, setMorningText] = useState('07:00');
  const [eveningText, setEveningText] = useState('20:30');
  const [entryCount, setEntryCount] = useState<number | null>(null);
  const [busy, setBusy] = useState<null | 'backup' | 'restore'>(null);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    const [s, count] = await Promise.all([getSettings(), countStoredEntries()]);
    setSettings(s);
    setDobText(formatDobForDisplay(s.dateOfBirth));
    setMorningText(formatTime(s.morningTime));
    setEveningText(formatTime(s.eveningTime));
    setEntryCount(count);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Autosave throughout - no submit button anywhere in this app.
  const patch = async (change: Partial<Settings>) => {
    const updated = await saveSettings(change);
    setSettings(updated);
    return updated;
  };

  const handleName = (text: string) => {
    setSettings((prev) => (prev ? { ...prev, firstName: text } : prev));
    patch({ firstName: text });
  };

  const handleDob = (text: string) => {
    setDobText(text);
    if (text.trim() === '') {
      patch({ dateOfBirth: '' });
      return;
    }
    const iso = parseDobInput(text);
    if (iso) patch({ dateOfBirth: iso });
  };

  const handleReminderToggle = async (
    key: 'morningReminder' | 'eveningReminder',
    value: boolean
  ) => {
    // Ask only when switching one ON, and only if we don't already hold permission.
    if (value) {
      const granted = await requestReminderPermission();
      if (!granted) {
        Alert.alert(
          'Notifications are off',
          'Turn on notifications for iTHRIVE30 in your phone settings, then try again.'
        );
        return;
      }
    }
    const updated = await patch({ [key]: value });
    setMorningText(formatTime(updated.morningTime));
    setEveningText(formatTime(updated.eveningTime));
    await syncReminders(updated);
  };

  const handleTimeChange = async (which: 'morning' | 'evening', text: string) => {
    if (which === 'morning') setMorningText(text);
    else setEveningText(text);

    // Only persist and reschedule once it's a real time - a half-typed field saves nothing.
    if (!parseTimeInput(text)) return;
    const updated = await patch(
      which === 'morning' ? { morningTime: text } : { eveningTime: text }
    );
    await syncReminders(updated);
  };

  const handleShareProgress = async () => {
    setSharing(true);
    const result = await shareProgressSummary();
    setSharing(false);
    if (result.status === 'error') {
      Alert.alert('Could not share', result.message ?? 'Try again in a moment.');
    }
    // 'shared' and 'dismissed' both need no popup - the share sheet was the interaction.
  };

  const handleCrashToggle = async (value: boolean) => {
    setCrashReportingEnabled(value);
    await patch({ crashReports: value });
  };

  // ---------- Data actions ----------

  const handleBackup = async () => {
    setBusy('backup');
    const result = await exportBackup();
    setBusy(null);

    if (result.status === 'error') {
      Alert.alert('Backup failed', result.message);
    } else if (result.status === 'unavailable') {
      Alert.alert(
        'Sharing unavailable',
        `Your backup was written to:\n\n${result.uri}\n\nCopy it somewhere safe from your file manager.`
      );
    }
    // On success the share sheet is its own confirmation - no extra popup.
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore from a backup?',
      'This replaces everything currently in the app with the contents of the backup file. ' +
        'If you have data here you want to keep, back it up first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose file',
          style: 'destructive',
          onPress: async () => {
            setBusy('restore');
            const result = await restoreBackup();
            setBusy(null);

            if (result.status === 'restored') {
              await load();
              Alert.alert(
                'Restored',
                `${result.entryCount} entries restored from your backup of ${result.exportedAt}.`
              );
            } else if (result.status === 'error') {
              Alert.alert("That didn't work", result.message);
            }
          },
        },
      ]
    );
  };

  const handleErase = () => {
    Alert.alert(
      'Delete everything?',
      'Every habit, note, reflection, goal and badge on this device will be permanently ' +
        'deleted. This cannot be undone, and there is no copy anywhere else.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            // Two taps for something this final.
            Alert.alert('Last check', 'This really cannot be undone. Delete all your data?', [
              { text: 'Keep my data', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await eraseAllData();
                  await load();
                  Alert.alert('Deleted', 'Everything has been removed from this device.');
                },
              },
            ]);
          },
        },
      ]
    );
  };

  if (!settings) {
    return (
      <View style={[styles.container, styles.loading]}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  // Only true when a date of birth was actually entered and works out under 18. A blank
  // field is never treated as 'probably a minor' - see isUnder18 in settingsStore.
  const under18 = isUnder18(settings.dateOfBirth);
  const age = ageFromDob(settings.dateOfBirth);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Your details, your data, and who can see it</Text>

      {/* ---------- Your details ---------- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your details</Text>
        <Text style={styles.cardNote}>Both optional. Stored on this device only.</Text>

        <Text style={styles.fieldLabel}>First name</Text>
        <TextInput
          style={styles.input}
          value={settings.firstName}
          onChangeText={handleName}
          placeholder="What should the app call you?"
          placeholderTextColor={t.muted}
          autoCapitalize="words"
          returnKeyType="done"
        />

        <Text style={styles.fieldLabel}>Date of birth</Text>
        <TextInput
          style={styles.input}
          value={dobText}
          onChangeText={handleDob}
          placeholder="DD/MM/YYYY"
          placeholderTextColor={t.muted}
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
        />
        <Text style={styles.fieldHint}>
          {age === null
            ? 'Used only to mark your birthday inside the app.'
            : `Used only to mark your birthday inside the app. That makes you ${age}.`}
        </Text>
      </View>

      {/* ---------- Appearance ---------- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Appearance</Text>
        <Text style={styles.cardNote}>
          {appearance === 'system'
            ? `Following your phone, which is currently set to ${systemTheme}.`
            : `Always ${appearance}, whatever your phone is set to.`}
        </Text>

        <View style={styles.segment}>
          {APPEARANCE_OPTIONS.map((opt) => {
            const active = appearance === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setAppearance(opt.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={opt.icon}
                  size={16}
                  color={active ? t.onPrimary : t.secondary}
                />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ---------- Accountability ----------
          Available to everyone. The under-18 line is added context, not a restriction:
          gating the feature by age would make it read as supervision imposed on a minor
          rather than something anyone can choose. */}
      <View style={[styles.card, under18 && styles.cardHighlight]}>
        <Text style={styles.cardTitle}>Share your progress</Text>

        {under18 ? (
          <Text style={styles.cardNote}>
            Going through this alongside a parent, guardian or mentor makes it far more
            likely to stick — someone who knows what you&apos;re doing can ask how it&apos;s
            going. Send them a summary whenever you want to.
          </Text>
        ) : (
          <Text style={styles.cardNote}>
            Send someone a summary of how you&apos;re going — a partner, a friend, a mentor,
            a coach. Being seen doing it is one of the few things that reliably helps.
          </Text>
        )}

        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={14} color={t.primaryDim} />
          <Text style={styles.privacyNoteText}>
            Only what you <Text style={styles.privacyNoteStrong}>did</Text> — days, streaks,
            level, goals. Never your moods, notes, reflections or photos. Those stay on this
            phone.
          </Text>
        </View>

        <Pressable
          style={[styles.outlineButton, sharing && styles.buttonBusy]}
          onPress={handleShareProgress}
          disabled={sharing}
        >
          <Ionicons name="share-outline" size={16} color={t.primary} />
          <Text style={styles.outlineButtonText}>
            {sharing ? 'Preparing…' : 'Share a progress summary'}
          </Text>
        </Pressable>
      </View>

      {/* ---------- Reminders ---------- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reminders</Text>
        <Text style={styles.cardNote}>
          A nudge from your own phone. Nothing is sent over the internet, and neither one
          will ever tell you off for a day you missed.
        </Text>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Morning</Text>
            <Text style={styles.fieldHint}>Start the day with your intention.</Text>
          </View>
          <Switch
            value={settings.morningReminder}
            onValueChange={(v) => handleReminderToggle('morningReminder', v)}
            disabled={!reminderStatus.available}
            trackColor={{ false: t.borderMuted, true: t.primaryDim }}
            thumbColor={settings.morningReminder ? t.primary : t.muted}
          />
        </View>
        {settings.morningReminder && (
          <TextInput
            style={styles.input}
            value={morningText}
            onChangeText={(v) => handleTimeChange('morning', v)}
            placeholder="07:00"
            placeholderTextColor={t.muted}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
          />
        )}

        <View style={[styles.switchRow, { marginTop: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Evening</Text>
            <Text style={styles.fieldHint}>An open door, not a deadline.</Text>
          </View>
          <Switch
            value={settings.eveningReminder}
            onValueChange={(v) => handleReminderToggle('eveningReminder', v)}
            disabled={!reminderStatus.available}
            trackColor={{ false: t.borderMuted, true: t.primaryDim }}
            thumbColor={settings.eveningReminder ? t.primary : t.muted}
          />
        </View>
        {settings.eveningReminder && (
          <TextInput
            style={styles.input}
            value={eveningText}
            onChangeText={(v) => handleTimeChange('evening', v)}
            placeholder="20:30"
            placeholderTextColor={t.muted}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
          />
        )}

        <Text style={styles.statusLine}>{reminderStatus.reason}</Text>
      </View>

      {/* ---------- Your data ---------- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your data</Text>
        <Text style={styles.cardNote}>
          Everything you record lives on this phone and nowhere else. If you lose the phone or
          reinstall the app without a backup, it is gone — so make one, and keep it somewhere
          you&apos;ll still have in a year.
        </Text>

        {entryCount !== null && (
          <Text style={styles.entryCount}>
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'} stored
          </Text>
        )}

        <Pressable
          style={[styles.primaryButton, busy === 'backup' && styles.buttonBusy]}
          onPress={handleBackup}
          disabled={busy !== null}
        >
          <Ionicons name="download-outline" size={16} color={t.ground} />
          <Text style={styles.primaryButtonText}>
            {busy === 'backup' ? 'Preparing…' : 'Back up my data'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.outlineButton, busy === 'restore' && styles.buttonBusy]}
          onPress={handleRestore}
          disabled={busy !== null}
        >
          <Ionicons name="cloud-upload-outline" size={16} color={t.primary} />
          <Text style={styles.outlineButtonText}>
            {busy === 'restore' ? 'Restoring…' : 'Restore from a backup'}
          </Text>
        </Pressable>

        <Pressable style={styles.dangerButton} onPress={handleErase} disabled={busy !== null}>
          <Ionicons name="trash-outline" size={16} color={t.danger} />
          <Text style={styles.dangerButtonText}>Delete everything</Text>
        </Pressable>
      </View>

      {/* ---------- Privacy ---------- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Privacy</Text>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Send anonymous crash reports</Text>
            <Text style={styles.fieldHint}>
              If the app crashes, send the technical details so it can be fixed. Never includes
              anything you&apos;ve written.
            </Text>
          </View>
          <Switch
            value={settings.crashReports}
            onValueChange={handleCrashToggle}
            trackColor={{ false: t.borderMuted, true: t.primaryDim }}
            thumbColor={settings.crashReports ? t.primary : t.muted}
          />
        </View>

        <Text style={styles.statusLine}>{monitoringStatus.reason}</Text>
      </View>

      {/* ---------- About ---------- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>

        {PRIVACY_POLICY_URL && (
          <Pressable
            style={styles.linkRow}
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
          >
            <Ionicons name="document-text-outline" size={16} color={t.primary} />
            <Text style={styles.linkText}>Privacy policy</Text>
            <Ionicons name="open-outline" size={14} color={t.muted} />
          </Pressable>
        )}

        <Pressable
          style={styles.linkRow}
          onPress={() =>
            Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('iTHRIVE30 support')}`
            )
          }
        >
          <Ionicons name="mail-outline" size={16} color={t.primary} />
          <Text style={styles.linkText}>Contact support</Text>
          <Ionicons name="open-outline" size={14} color={t.muted} />
        </Pressable>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Version</Text>
          <Text style={styles.metaValue}>{APP_VERSION}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Install ID</Text>
          <Text style={styles.metaValue} selectable numberOfLines={1}>
            {settings.installId}
          </Text>
        </View>
        <Text style={styles.fieldHint}>
          The install ID is a random code for this copy of the app. It isn&apos;t linked to you,
          and it helps if you ever need to describe a problem to support.
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.ground },
    loading: { alignItems: 'center', justifyContent: 'center' },
    muted: { color: t.muted, fontSize: 14 },

    title: { color: t.primary, fontSize: 26, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: t.secondary, fontSize: 14, marginBottom: 22 },

    card: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      padding: 16,
      marginBottom: 18,
    },
    cardHighlight: { borderColor: t.primaryDim, backgroundColor: t.primaryTintAlt },
    privacyNote: {
      flexDirection: 'row',
      gap: 9,
      alignItems: 'flex-start',
      backgroundColor: t.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.borderMuted,
      padding: 12,
      marginTop: 4,
      marginBottom: 14,
    },
    privacyNoteText: { color: t.muted, fontSize: 12, lineHeight: 18, flex: 1 },
    privacyNoteStrong: { color: t.inkSoft, fontWeight: '700' },
    cardTitle: { color: t.primary, fontSize: 17, fontWeight: '700', marginBottom: 6 },
    cardNote: { color: t.secondary, fontSize: 13, lineHeight: 19, marginBottom: 10 },

    fieldLabel: {
      color: t.primaryDim,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 10,
      marginBottom: 5,
    },
    input: {
      color: t.ink,
      fontSize: 14,
      backgroundColor: t.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.borderMuted,
      padding: 11,
      minHeight: 42,
    },
    fieldHint: { color: t.muted, fontSize: 11, lineHeight: 16, marginTop: 6 },

    segment: {
      flexDirection: 'row',
      backgroundColor: t.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.borderMuted,
      padding: 3,
      marginTop: 4,
    },
    segmentItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 8,
    },
    segmentItemActive: { backgroundColor: t.primary },
    segmentText: { color: t.secondary, fontSize: 13, fontWeight: '600' },
    segmentTextActive: { color: t.onPrimary, fontWeight: '700' },

    entryCount: {
      color: t.secondaryDim,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },

    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      backgroundColor: t.primary,
      borderRadius: 10,
      paddingVertical: 12,
    },
    primaryButtonText: { color: t.ground, fontWeight: '700', fontSize: 13 },

    outlineButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderWidth: 1,
      borderColor: t.primary,
      borderRadius: 10,
      paddingVertical: 12,
      marginTop: 10,
    },
    outlineButtonText: { color: t.primary, fontWeight: '700', fontSize: 13 },

    dangerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderWidth: 1,
      borderColor: t.dangerBorder,
      borderRadius: 10,
      paddingVertical: 12,
      marginTop: 10,
    },
    dangerButtonText: { color: t.danger, fontWeight: '700', fontSize: 13 },

    buttonBusy: { opacity: 0.5 },

    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
    switchLabel: { color: t.inkSoft, fontSize: 14, fontWeight: '600' },
    statusLine: {
      color: t.muted,
      fontSize: 11,
      fontStyle: 'italic',
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: t.borderSoft,
      paddingTop: 10,
    },

    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.borderSoft,
    },
    linkText: { color: t.inkSoft, fontSize: 14, flex: 1 },

    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      paddingVertical: 9,
    },
    metaLabel: { color: t.secondaryDim, fontSize: 13 },
    metaValue: { color: t.body, fontSize: 12, fontFamily: 'monospace', flexShrink: 1 },
  });
