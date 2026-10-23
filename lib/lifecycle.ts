import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getTodayKey } from './habitStore';
import { supabase } from './supabase';

/**
 * Lifecycle events sent to Supabase (table `lifecycle_events`) so Bondi Project Global can
 * see how Thrivers move through the challenges and shape the next ones.
 *
 * STRUCTURE ONLY. An event says that something happened - a day completed, a level
 * finished - never what anyone wrote. Moods, notes, gratitude, intentions, challenge
 * answers and photos never go in `data`. Daily logs stay in AsyncStorage.
 *
 * Events queue on the phone first and upload when they can, so being offline (or signed
 * out for a moment) never loses one and never slows a screen down. Everything here is
 * best-effort and never throws.
 */

export type LifecycleEventName =
  | 'signup_completed'
  | 'day_completed'
  | 'level_completed'
  | 'purchase_completed';
// 'inactive_5d' is written by the nightly pg_cron job, never by the app.

type QueuedEvent = {
  client_event_id: string;
  event: LifecycleEventName;
  level?: number;
  day?: number;
  data?: Record<string, string | number | boolean>;
  occurred_at: string;
};

const QUEUE_KEY = 'ithrive30_lifecycle_queue_v1';
const LAST_SEEN_KEY = 'ithrive30_last_seen_sent_v1';
/** Stops a phone that has been offline for months building an unbounded queue. */
const QUEUE_MAX = 500;

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function readQueue(): Promise<QueuedEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Queue an event and try to send it straight away. */
export async function recordLifecycleEvent(
  event: LifecycleEventName,
  details: { level?: number; day?: number; data?: QueuedEvent['data'] } = {}
): Promise<void> {
  try {
    const queue = await readQueue();
    queue.push({ client_event_id: uuid(), event, ...details, occurred_at: new Date().toISOString() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-QUEUE_MAX)));
  } catch {
    // Storage failed: losing one event is better than breaking the save that called this.
  }
  flushLifecycleEvents();
}

let flushing: Promise<void> | null = null;

/** Upload whatever is queued. Safe to call often; only one upload runs at a time. */
export function flushLifecycleEvents(): Promise<void> {
  if (!flushing) {
    flushing = (async () => {
      try {
        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        const queue = await readQueue();
        if (queue.length === 0) return;
        // A retried upload carries the same client_event_id and is ignored by the database.
        const { error } = await supabase
          .from('lifecycle_events')
          .upsert(queue, { onConflict: 'user_id,client_event_id', ignoreDuplicates: true });
        if (error) return;
        // Only drop what was sent - anything queued during the upload stays.
        const sent = new Set(queue.map((e) => e.client_event_id));
        const remaining = (await readQueue()).filter((e) => !sent.has(e.client_event_id));
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
      } catch {
        // Offline or Supabase unreachable: try again on the next event or app open.
      } finally {
        flushing = null;
      }
    })();
  }
  return flushing;
}

/**
 * Called once the user has just signed in. Creates their profile the first time, which is
 * also the one moment `signup_completed` is recorded.
 */
export async function ensureProfile(): Promise<void> {
  try {
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', auth.user.id).maybeSingle();
    if (!existing) {
      const { error } = await supabase.from('profiles').insert({ id: auth.user.id, ...deviceInfo() });
      if (!error) await recordLifecycleEvent('signup_completed');
    }
  } catch {
    // Profile creation will be retried by markSeen on the next app open.
  }
}

/**
 * Keeps `profiles.last_seen_at` current, at most once a local day. This is what the
 * nightly inactive_5d job reads. Also sends anything still queued.
 */
export async function markSeen(): Promise<void> {
  try {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const today = getTodayKey();
    if ((await AsyncStorage.getItem(LAST_SEEN_KEY)) !== today) {
      // Catches a profile whose first creation failed (signed in, then went offline).
      await ensureProfile();
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString(), ...deviceInfo() })
        .eq('id', data.session.user.id);
      if (!error) await AsyncStorage.setItem(LAST_SEEN_KEY, today);
    }
  } catch {
    // Try again next open.
  }
  flushLifecycleEvents();
}

function deviceInfo() {
  return { app_version: Constants.expoConfig?.version ?? null, platform: Platform.OS };
}
