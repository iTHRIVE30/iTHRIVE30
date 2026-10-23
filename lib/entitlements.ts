import { recordLifecycleEvent } from './lifecycle';

/**
 * What the user has paid for. There is no purchasing yet - these are the marked places
 * where the in-app purchase check goes when it arrives, so no screen needs to change then.
 *
 * Two gates exist:
 *   - Levels:       isLevelUnlocked() in lib/challengeStore - own the level, or hold a
 *                   3/6-month, annual or lifetime bundle that covers it.
 *   - Tracker only: canUseTrackerOnly() below - keep the habit tracker after a Level ends
 *                   without starting the next one.
 *
 * Purchases come from the App Store / Play Store (e.g. via RevenueCat), which hold the
 * record of what was bought - still no server of our own.
 */

/** Whether "Keep tracking only" is offered. Always true until purchasing exists. */
export async function canUseTrackerOnly(): Promise<boolean> {
  return true;
}

/**
 * Call when a purchase has gone through on the phone (App Store / Play Store, once
 * purchasing exists), so it shows up in Supabase as `purchase_completed`. Purchases made
 * outside the app (Stripe) will be recorded server side by the stripe-webhook function
 * instead - never call this for those, or they would be counted twice.
 */
export function recordPurchaseCompleted(sku: string): void {
  recordLifecycleEvent('purchase_completed', { data: { sku } });
}
