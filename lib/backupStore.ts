import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { SCHEMA_VERSION, getSettings } from './settingsStore';

/**
 * Backup, restore and erase for every byte the app holds.
 *
 * There is no backend, so this file is the only thing standing between a user and losing
 * their whole programme when they change phone or reinstall. Everything the app writes is
 * under one AsyncStorage prefix, which is what makes a complete export possible in one pass.
 *
 * The export is deliberately plain, readable JSON: it is the user's own data, and they
 * should be able to open it and see that for themselves.
 */

/** Every key the app owns starts with this. Anything else in storage is not ours to touch. */
const KEY_PREFIX = 'ithrive30_';

const FORMAT = 'ithrive30.backup';
const FORMAT_VERSION = 1;

export type BackupFile = {
  format: typeof FORMAT;
  formatVersion: number;
  /** Data-shape version at time of export - see settingsStore.SCHEMA_VERSION. */
  schemaVersion: number;
  appVersion: string;
  /** Local time, human-readable. Not used for logic. */
  exportedAt: string;
  installId: string;
  entryCount: number;
  data: Record<string, string>;
};

export type ExportResult =
  | { status: 'shared'; entryCount: number; fileName: string }
  | { status: 'unavailable'; fileName: string; uri: string }
  | { status: 'error'; message: string };

export type RestoreResult =
  | { status: 'restored'; entryCount: number; exportedAt: string }
  | { status: 'canceled' }
  | { status: 'error'; message: string };

function appVersion(): string {
  return Constants.expoConfig?.version ?? 'unknown';
}

/** Local date key for the filename - local getters only, never toISOString (AGENTS.md). */
function localStamp(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localTimestamp(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${localStamp(date)} ${hh}:${mm}`;
}

async function ourKeys(): Promise<string[]> {
  const all = await AsyncStorage.getAllKeys();
  return all.filter((k) => k.startsWith(KEY_PREFIX));
}

// ---------- Export ----------

/** Collects everything the app has stored into one serialisable object. */
export async function createBackup(): Promise<BackupFile> {
  const keys = await ourKeys();
  const pairs = await AsyncStorage.multiGet(keys);

  const data: Record<string, string> = {};
  for (const [key, value] of pairs) {
    if (value !== null) data[key] = value;
  }

  const settings = await getSettings();

  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    appVersion: appVersion(),
    exportedAt: localTimestamp(),
    installId: settings.installId,
    entryCount: Object.keys(data).length,
    data,
  };
}

/**
 * Writes the backup to a cache file and hands it to the system share sheet, so the user
 * chooses where it goes - Files, Drive, their own email. Nothing is uploaded anywhere by
 * the app itself.
 */
export async function exportBackup(): Promise<ExportResult> {
  try {
    const backup = await createBackup();
    const fileName = `ithrive30-backup-${localStamp()}.json`;

    const file = new File(Paths.cache, fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(JSON.stringify(backup, null, 2));

    if (!(await Sharing.isAvailableAsync())) {
      return { status: 'unavailable', fileName, uri: file.uri };
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save your iTHRIVE30 backup',
      UTI: 'public.json',
    });

    return { status: 'shared', entryCount: backup.entryCount, fileName };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Could not create the backup file.' };
  }
}

// ---------- Restore ----------

/**
 * Validates a parsed file before anything is written. Returns the payload or a reason
 * the user can act on - never throws, and never half-restores.
 */
function validate(parsed: unknown): { ok: true; backup: BackupFile } | { ok: false; message: string } {
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, message: "That file isn't an iTHRIVE30 backup." };
  }

  const candidate = parsed as Partial<BackupFile>;

  if (candidate.format !== FORMAT) {
    return { ok: false, message: "That file isn't an iTHRIVE30 backup." };
  }

  if (typeof candidate.formatVersion !== 'number' || candidate.formatVersion > FORMAT_VERSION) {
    return {
      ok: false,
      message: 'That backup was made by a newer version of iTHRIVE30. Update the app, then try again.',
    };
  }

  const data = candidate.data;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, message: 'That backup file is damaged and could not be read.' };
  }

  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith(KEY_PREFIX) || typeof value !== 'string') {
      return { ok: false, message: 'That backup file is damaged and could not be read.' };
    }
  }

  return { ok: true, backup: candidate as BackupFile };
}

/**
 * Opens the system file picker and replaces all app data with the contents of the chosen
 * backup. This is a replace, not a merge: merging two habit logs has no correct answer,
 * and quietly guessing at one would be worse than being predictable. The caller is
 * expected to confirm with the user first.
 */
export async function restoreBackup(): Promise<RestoreResult> {
  try {
    const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
    if (picked.canceled) return { status: 'canceled' };

    const text = await picked.result.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { status: 'error', message: 'That file could not be read as a backup.' };
    }

    const check = validate(parsed);
    if (!check.ok) return { status: 'error', message: check.message };

    const entries = Object.entries(check.backup.data);

    // Clear ours first so keys absent from the backup don't survive the restore and leave
    // a mix of two different states.
    const existing = await ourKeys();
    if (existing.length > 0) await AsyncStorage.multiRemove(existing);
    await AsyncStorage.multiSet(entries);

    return {
      status: 'restored',
      entryCount: entries.length,
      exportedAt: check.backup.exportedAt ?? 'an earlier date',
    };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'The restore could not be completed.' };
  }
}

// ---------- Erase ----------

/**
 * Removes every key the app owns. Used by "Delete everything" in Settings, which both
 * stores expect to be reachable in-app. Leaves other apps' storage untouched.
 */
export async function eraseAllData(): Promise<{ removed: number }> {
  const keys = await ourKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys);
  return { removed: keys.length };
}

/** How many entries the app is currently holding - shown next to the backup button. */
export async function countStoredEntries(): Promise<number> {
  return (await ourKeys()).length;
}
