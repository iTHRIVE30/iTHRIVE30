import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { getSettings, parseTimeInput, type Settings } from './settingsStore';

/**
 * Daily reminders.
 *
 * Local notifications only - scheduled on the device, fired by the device. There is no
 * push server, no token registration and no backend, which is the whole reason this can
 * ship inside a local-only app at no cost.
 *
 * TONE IS A HARD CONSTRAINT. The app never blocks and never shames a missed day, so
 * neither does a notification. The evening one especially: it invites you back in, it does
 * not tell you what you failed to do. Nothing here counts, scolds, or mentions a streak at
 * risk - a nudge that makes someone feel caught is a nudge that gets switched off, and
 * loss-aversion pressure is exactly the mechanic this programme rejects.
 *
 * Content is fixed rather than naming the day's challenge. A DAILY repeating trigger
 * carries static text, so per-day copy would mean re-scheduling a rolling window every
 * time the app opens - and reminders would then quietly lapse for anyone who stopped
 * opening it, which is precisely the person the reminder is for. A reminder that always
 * fires beats a cleverer one that stops.
 */

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const MORNING_ID = 'ithrive30-morning';
const EVENING_ID = 'ithrive30-evening';

const MORNING = {
  title: 'Your day is open',
  body: "Set today's intention and pick up where you left off.",
};

const EVENING = {
  title: 'Still time',
  body: 'A minute to log the day, if you want it. Whatever you did counts.',
};

export const reminderStatus = {
  get available() {
    return !isExpoGo;
  },
  get reason(): string {
    if (isExpoGo) return 'Reminders need a development build - not available in Expo Go.';
    return 'Reminders are handled by your phone. Nothing is sent over the internet.';
  },
};

// Show the banner even when the app happens to be open, rather than swallowing it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Asks for notification permission. Returns whether it was granted. Never throws - a
 * permission dialog failing must not take a settings screen down with it.
 */
export async function requestReminderPermission(): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;

    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return asked.granted;
  } catch {
    return false;
  }
}

async function schedule(identifier: string, hour: number, minute: number, content: { title: string; body: string }) {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { ...content, sound: false },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId: 'daily' } : {}),
    },
  });
}

/**
 * Brings the phone's scheduled notifications in line with the stored settings.
 *
 * Cancels ours by identifier first rather than calling
 * `cancelAllScheduledNotificationsAsync()`, so this can never clear a notification some
 * future feature scheduled. Safe to call on every app open and after every toggle.
 */
export async function syncReminders(settings?: Settings): Promise<void> {
  if (isExpoGo) return;

  try {
    const s = settings ?? (await getSettings());

    await Notifications.cancelScheduledNotificationAsync(MORNING_ID).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(EVENING_ID).catch(() => {});

    const wanted = s.morningReminder || s.eveningReminder;
    if (!wanted) return;

    const granted = await Notifications.getPermissionsAsync().then((p) => p.granted).catch(() => false);
    if (!granted) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily', {
        name: 'Daily reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: undefined,
      });
    }

    if (s.morningReminder) {
      const at = parseTimeInput(s.morningTime);
      if (at) await schedule(MORNING_ID, at.hour, at.minute, MORNING);
    }

    if (s.eveningReminder) {
      const at = parseTimeInput(s.eveningTime);
      if (at) await schedule(EVENING_ID, at.hour, at.minute, EVENING);
    }
  } catch {
    // Best-effort, like monitoring. A scheduling failure costs a nudge, never a crash.
  }
}
