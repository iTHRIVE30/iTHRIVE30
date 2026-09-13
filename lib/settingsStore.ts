import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Device-local preferences and the two forward-compatibility fields.
 *
 * Nothing here is an account. There is no email, no password and no login - adding one
 * would mean a server holding credentials, which is explicitly deferred (see AGENTS.md).
 *
 * Note there is deliberately no step or water target here: the 13 habits are a baseline,
 * not a threshold. Personal targets live in My Journey and the three editable habits.
 */

const SETTINGS_KEY = 'ithrive30_settings_v1';

/**
 * Bumped whenever the *shape* of stored data changes in a way a future migration would
 * need to know about. Written into every backup file so an old export can be recognised
 * and upgraded rather than rejected.
 */
export const SCHEMA_VERSION = 1;

export type Appearance = 'system' | 'light' | 'dark';

export type Settings = {
  /** Optional. Used to make the daily greeting and badge copy read as the user's own. */
  firstName: string;
  /** Local YYYY-MM-DD, or '' when unset. Unlocks the birthday badge. */
  dateOfBirth: string;
  /** 'system' follows the device live; 'light' and 'dark' pin it. See hooks/useTheme.tsx. */
  appearance: Appearance;
  /** A morning nudge. Off until the user turns it on and grants permission. */
  morningReminder: boolean;
  /** Local 24h HH:MM. */
  morningTime: string;
  /** An evening invitation to finish the day. Never a reproach - see lib/reminders.ts. */
  eveningReminder: boolean;
  eveningTime: string;
  /** Opt-out for anonymous crash diagnostics. Default on, disclosed in the privacy policy. */
  crashReports: boolean;
  /**
   * Anonymous, device-generated, never leaves the device except inside the user's own
   * backup file. Contains nothing derived from the person. If cloud sync ever ships this
   * is the key existing data migrates onto, instead of asking users to start over.
   */
  installId: string;
  schemaVersion: number;
};

const DEFAULTS: Omit<Settings, 'installId'> = {
  firstName: '',
  dateOfBirth: '',
  appearance: 'system',
  morningReminder: false,
  morningTime: '07:00',
  eveningReminder: false,
  eveningTime: '20:30',
  crashReports: true,
  schemaVersion: SCHEMA_VERSION,
};

function generateInstallId(): string {
  const a = Date.now().toString(36);
  const b = Math.random().toString(36).slice(2, 10);
  const c = Math.random().toString(36).slice(2, 10);
  return `${a}-${b}${c}`;
}

/**
 * Reads settings, filling in any field a previous version didn't write. Generates and
 * persists an installId the first time it's called, so every install has one from the
 * moment Settings is first touched.
 */
export async function getSettings(): Promise<Settings> {
  let stored: Partial<Settings> = {};
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) stored = JSON.parse(raw) ?? {};
  } catch {
    stored = {};
  }

  const settings: Settings = {
    ...DEFAULTS,
    ...stored,
    installId: stored.installId || generateInstallId(),
    schemaVersion: SCHEMA_VERSION,
  };

  // Persist if we just minted the id, or upgraded an older record.
  if (!stored.installId || stored.schemaVersion !== SCHEMA_VERSION) {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Best-effort: a failed write here just means we mint again next launch.
    }
  }

  return settings;
}

/** Merge-and-save. Returns the full settings object as written. */
export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const updated: Settings = { ...current, ...patch, schemaVersion: SCHEMA_VERSION };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}

// ---------- Reminder time helpers ----------

/** 'HH:MM' -> {hour, minute}, or null when the text isn't yet a real time of day. */
export function parseTimeInput(text: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2})\s*:\s*(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** Zero-pads for display, so a saved '7:0' still shows as '07:00'. */
export function formatTime(text: string): string {
  const parsed = parseTimeInput(text);
  if (!parsed) return text;
  return `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`;
}

// ---------- Date of birth helpers ----------
// Local getters only, never toISOString - see AGENTS.md.

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY' for display. Returns '' for anything unparseable. */
export function formatDobForDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/**
 * 'DD/MM/YYYY' (or 'D/M/YYYY') -> 'YYYY-MM-DD'. Returns null when the text isn't yet a
 * real calendar date, so a half-typed field simply doesn't save rather than saving junk.
 */
export function parseDobInput(text: string): string | null {
  const m = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/.exec(text.trim());
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);

  const thisYear = new Date().getFullYear();
  if (year < 1900 || year > thisYear) return null;
  if (month < 1 || month > 12) return null;

  // Round-trip through a local Date to reject 31/02 and friends.
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}
