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

const GOLD = '#D4AF37';
const BLACK = '#0B0B0B';
const DIM_GOLD = '#8a7433';
const DANGER = '#C4573F';

/**
 * Settings - preferences, and the only place the user can get their data out of the app.
 *
 * Deliberately not an "Account": no email, no password, no login. There is no server, and
 * adding one is investment-gated (AGENTS.md).
 *
 * Also deliberately absent: step and water targets. The 13 habits are a baseline, not a
 * threshold - personal targets belong to My Journey and the three editable habits.
 *
 * The Appearance preference is stored but has no control here yet, because light mode
 * isn't built. A selector that changed nothing would be a dead control.
 */

/** Set in app.json -> expo.extra. The rows stay hidden until they're real. */
const PRIVACY_POLICY_URL: string | undefined = Constants.expoConfig?.extra?.privacyPolicyUrl;
const SUPPORT_EMAIL: string =
  Constants.expoConfig?.extra?.supportEmail ?? 'bondiprojectglobal@gmail.com';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function SettingsScreen() {
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
          placeholderTextColor="#666"
          autoCapitalize="words"
          returnKeyType="done"
        />

        <Text style={styles.fieldLabel}>Date of birth</Text>
        <TextInput
          style={styles.input}
          value={dobText}
          onChangeText={handleDob}
          placeholder="DD/MM/YYYY"
          placeholderTextColor="#666"
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
        />
        <Text style={styles.fieldHint}>Used only to mark your birthday inside the app.</Text>
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
          <Ionicons name="download-outline" size={16} color={BLACK} />
          <Text style={styles.primaryButtonText}>
            {busy === 'backup' ? 'Preparing…' : 'Back up my data'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.outlineButton, busy === 'restore' && styles.buttonBusy]}
          onPress={handleRestore}
          disabled={busy !== null}
        >
          <Ionicons name="cloud-upload-outline" size={16} color={GOLD} />
          <Text style={styles.outlineButtonText}>
            {busy === 'restore' ? 'Restoring…' : 'Restore from a backup'}
          </Text>
        </Pressable>

        <Pressable style={styles.dangerButton} onPress={handleErase} disabled={busy !== null}>
          <Ionicons name="trash-outline" size={16} color={DANGER} />
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
            trackColor={{ false: '#2a2a2a', true: DIM_GOLD }}
            thumbColor={settings.crashReports ? GOLD : '#666'}
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
            <Ionicons name="document-text-outline" size={16} color={GOLD} />
            <Text style={styles.linkText}>Privacy policy</Text>
            <Ionicons name="open-outline" size={14} color="#666" />
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
          <Ionicons name="mail-outline" size={16} color={GOLD} />
          <Text style={styles.linkText}>Contact support</Text>
          <Ionicons name="open-outline" size={14} color="#666" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLACK },
  loading: { alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#666', fontSize: 14 },

  title: { color: GOLD, fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: '#aaa', fontSize: 14, marginBottom: 22 },

  card: {
    backgroundColor: '#161616',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
    marginBottom: 18,
  },
  cardTitle: { color: GOLD, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  cardNote: { color: '#aaa', fontSize: 13, lineHeight: 19, marginBottom: 10 },

  fieldLabel: {
    color: DIM_GOLD,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 11,
    minHeight: 42,
  },
  fieldHint: { color: '#666', fontSize: 11, lineHeight: 16, marginTop: 6 },

  entryCount: {
    color: '#888',
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
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 12,
  },
  primaryButtonText: { color: BLACK, fontWeight: '700', fontSize: 13 },

  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
  },
  outlineButtonText: { color: GOLD, fontWeight: '700', fontSize: 13 },

  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#4A2A20',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
  },
  dangerButtonText: { color: DANGER, fontWeight: '700', fontSize: 13 },

  buttonBusy: { opacity: 0.5 },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  switchLabel: { color: '#eee', fontSize: 14, fontWeight: '600' },
  statusLine: {
    color: '#666',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#242424',
    paddingTop: 10,
  },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  linkText: { color: '#eee', fontSize: 14, flex: 1 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 9,
  },
  metaLabel: { color: '#888', fontSize: 13 },
  metaValue: { color: '#ccc', fontSize: 12, fontFamily: 'monospace', flexShrink: 1 },
});
