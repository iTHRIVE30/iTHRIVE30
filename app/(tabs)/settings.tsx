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
  formatDobForDisplay,
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
  const [entryCount, setEntryCount] = useState<number | null>(null);
  const [busy, setBusy] = useState<null | 'backup' | 'restore'>(null);

  const load = useCallback(async () => {
    const [s, count] = await Promise.all([getSettings(), countStoredEntries()]);
    setSettings(s);
    setDobText(formatDobForDisplay(s.dateOfBirth));
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
        <Text style={styles.fieldHint}>Used only to mark your birthday inside the app.</Text>
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
