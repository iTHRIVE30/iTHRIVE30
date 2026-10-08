import AsyncStorage from '@react-native-async-storage/async-storage';

import { eraseAllData } from './backupStore';

/**
 * A one-time fresh start for every device, run before the app draws anything.
 *
 * The foundation challenge was replaced wholesale: week one (revision 22), then all 30 days
 * from the consolidated JSON (8 Oct 2026, Days 1 and 2 swapped, most questions changed). Its day ids are
 * the same as before but the questions are not, and answers are stored by position - an
 * old Day 1 answer would land in the wrong box. So every tester starts again: all app data
 * is erased once, and the app opens on onboarding as if newly installed.
 *
 * TO DO IT AGAIN after a future rewrite, change RESET_ID. Every device that has not seen
 * the new id erases once more on its next launch. Leave it alone otherwise.
 *
 * The marker is deliberately NOT under the `ithrive30_` prefix, unlike every other key.
 * That prefix is what backup, restore and "Delete everything" act on, and the marker must
 * survive all three: restoring a backup made before the reset, or deleting everything and
 * carrying on, must never trigger a second wipe on the next launch.
 */
const RESET_ID = 'foundation-30day-2026-10-08';
const MARKER_KEY = 'ithrive30-device:content-reset';

let running: Promise<void> | null = null;

/** Erases everything once per RESET_ID. Never throws: a failure just opens the app as it is. */
export function runContentResetOnce(): Promise<void> {
  if (!running) {
    running = (async () => {
      try {
        if ((await AsyncStorage.getItem(MARKER_KEY)) === RESET_ID) return;
        await eraseAllData();
        await AsyncStorage.setItem(MARKER_KEY, RESET_ID);
      } catch {
        // Storage unreadable: open the app rather than block it. It will try again next launch.
      }
    })();
  }
  return running;
}
