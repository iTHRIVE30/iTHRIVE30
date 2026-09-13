import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Sentry from '@sentry/react-native';

import { getSettings } from './settingsStore';

/**
 * Crash reporting, wrapped so it can never be the thing that breaks the app.
 *
 * Three guards, all of which must pass before a single event leaves the device:
 *
 *  1. Not Expo Go. @sentry/react-native is a native module and needs a development or
 *     production build. Expo Go stays completely untouched, so day-to-day testing on a
 *     phone behaves exactly as it did before.
 *  2. A DSN is configured. Until the Sentry project exists there is nothing to send to,
 *     and the app should carry on as if this file weren't here.
 *  3. The user hasn't opted out. `crashReports` in Settings defaults to on and is
 *     disclosed in the privacy policy, but it is a real switch.
 *
 * Guard 3 is enforced in `beforeSend` rather than by skipping init, because the setting
 * is read asynchronously and a crash can happen first. The flag starts *disabled* and is
 * only turned on once the stored preference has actually been read - so the failure mode
 * is losing an early crash report, never sending one the user declined.
 */

/** Read from app.json -> expo.extra.sentryDsn, or an EXPO_PUBLIC_SENTRY_DSN env var. */
function resolveDsn(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (fromEnv) return fromEnv;

  const fromConfig = Constants.expoConfig?.extra?.sentryDsn;
  return typeof fromConfig === 'string' && fromConfig.length > 0 ? fromConfig : undefined;
}

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const dsn = resolveDsn();

/** Whether the stored opt-out has been read and came back enabled. See guard 3. */
let sendingEnabled = false;
let initialised = false;

export const monitoringStatus = {
  get active() {
    return initialised;
  },
  get reason(): string {
    if (isExpoGo) return 'Disabled in Expo Go - needs a development build.';
    if (!dsn) return 'No Sentry DSN configured yet.';
    return initialised ? 'Active.' : 'Not started.';
  },
};

/**
 * Starts Sentry if the environment supports it, then reads the user's preference. Safe to
 * call more than once. Never throws - a monitoring failure must not become an app failure.
 */
export async function initMonitoring(): Promise<void> {
  try {
    if (!initialised && !isExpoGo && dsn) {
      Sentry.init({
        dsn,
        // No user identifiers, no breadcrumbs carrying user text, no session replay.
        // The only thing we want off the device is the shape of the crash itself.
        sendDefaultPii: false,
        enableAutoSessionTracking: false,
        beforeSend: (event) => (sendingEnabled ? event : null),
      });
      initialised = true;
    }

    const settings = await getSettings();
    sendingEnabled = settings.crashReports;
  } catch {
    // Best-effort by design.
  }
}

/** Called by the Settings toggle. Takes effect immediately, in both directions. */
export function setCrashReportingEnabled(enabled: boolean): void {
  sendingEnabled = enabled;
}

/**
 * Report a handled error - something we caught and recovered from, but still want to know
 * about. Unhandled crashes are captured automatically and don't need this.
 */
export function captureError(error: unknown, context?: Record<string, string>): void {
  try {
    if (!initialised || !sendingEnabled) return;
    Sentry.captureException(error, context ? { tags: context } : undefined);
  } catch {
    // Best-effort by design.
  }
}
