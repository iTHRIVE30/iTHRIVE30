// SDK 56+ : expo-router no longer allows app code to import @react-navigation/* directly
// (Metro hard-errors on it). expo-router re-exports the theming API itself, and this is the
// non-deprecated path - the `expo-router/react-navigation` compat shim re-exports the same
// names but is marked for removal in a future SDK.
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavLightTheme,
  Stack,
  ThemeProvider,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useMemo, useState } from 'react';
import 'react-native-reanimated';

import SplashLoader from '@/components/SplashLoader';
import DailyHero from '@/components/DailyHero';
import Onboarding from '@/components/Onboarding';
import SignIn from '@/components/SignIn';
import { AppThemeProvider, useTheme } from '@/hooks/useTheme';
import { runContentResetOnce } from '@/lib/contentReset';
import { markSeen } from '@/lib/lifecycle';
import { initMonitoring } from '@/lib/monitoring';
import { syncReminders } from '@/lib/reminders';
import { getSettings, saveSettings } from '@/lib/settingsStore';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  DailyHeroContent,
  getDailyHeroContent,
  markDailyHeroSeen,
  shouldShowDailyHero,
} from '@/lib/dailyHero';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Hold the native splash until our own opening sequence is on screen, so there's no flash
// of the default splash between the two. Failure here is harmless - it just means the
// native splash hides on its own schedule.
SplashScreen.preventAutoHideAsync().catch(() => {});

type Phase = 'loading' | 'signin' | 'onboarding' | 'hero' | 'ready';

/** What the loading ring is actually waiting on: which opening screen, if any, comes next. */
type Opening = { hero: DailyHeroContent | null; needsOnboarding: boolean; needsSignIn: boolean; firstName: string };

export default function RootLayout() {
  // The one-time fresh start (lib/contentReset.ts) has to finish before anything reads
  // storage. If the tabs mounted first they would load the old data, and a write already
  // in flight could land after the erase and bring part of it back. It takes milliseconds,
  // and the native splash is still up while it runs - it is hidden by RootLayoutInner.
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    runContentResetOnce().finally(() => setStorageReady(true));
  }, []);
  if (!storageReady) return null;

  // The theme has to sit outside everything that reads it, including the opening sequence.
  return (
    <AppThemeProvider>
      <RootLayoutInner />
    </AppThemeProvider>
  );
}

function RootLayoutInner() {
  const theme = useTheme();
  const [phase, setPhase] = useState<Phase>('loading');
  const [opening, setOpening] = useState<Opening>({ hero: null, needsOnboarding: false, needsSignIn: false, firstName: '' });

  // Decide what follows the loading ring while it is still sweeping, and hand the promise
  // to SplashLoader so the ring hitting 100% means genuinely ready. Each read is guarded
  // separately: a failure in one must not cost us the other.
  const [prepare] = useState<Promise<Opening>>(() =>
    (async () => {
      let needsOnboarding = false;
      let hero: DailyHeroContent | null = null;
      let firstName = '';
      // Sign-in is required (lib/supabase.ts). The session is read from the phone, so an
      // already signed-in Thriver opens offline as before. If .env isn't filled in yet there
      // is nothing to sign in to, so the gate stays open rather than locking everyone out.
      let needsSignIn = false;
      try {
        if (isSupabaseConfigured && supabase) {
          const { data } = await supabase.auth.getSession();
          needsSignIn = !data.session;
        }
      } catch {
        needsSignIn = isSupabaseConfigured;
      }

      try {
        const settings = await getSettings();
        needsOnboarding = !settings.onboardedAt;
        firstName = settings.firstName;
      } catch {
        // Unreadable settings: don't force onboarding on someone who may have seen it.
      }

      try {
        if (await shouldShowDailyHero()) hero = await getDailyHeroContent();
      } catch {
        hero = null;
      }

      return { hero, needsOnboarding, needsSignIn, firstName };
    })()
  );

  useEffect(() => {
    prepare.then(setOpening).catch(() => {});
  }, [prepare]);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  // Crash reporting. No-ops in Expo Go, and stays silent until a DSN is configured and the
  // user's opt-out has been read - see lib/monitoring.ts. Never throws.
  useEffect(() => {
    initMonitoring();
    // Bring the phone's scheduled reminders back in line with the stored settings - they
    // can drift if the app was reinstalled or notifications were revoked in system settings.
    syncReminders();
    // Keeps profiles.last_seen_at current for the inactive_5d job and sends queued
    // lifecycle events. No-op when signed out. Never throws.
    markSeen();
  }, []);

  // Reads the resolved promise, not `opening` state, so it never acts on a stale default
  // and its identity never changes while the loader is running.
  // If startup reads never settle, open the app with no hero rather than wait forever.
  const handleLoaderDone = useCallback(() => {
    Promise.race([
      prepare,
      new Promise<Opening>((resolve) =>
        setTimeout(
          () => resolve({ hero: null, needsOnboarding: false, needsSignIn: isSupabaseConfigured, firstName: '' }),
          100
        )
      ),
    ])
      .then((o) => {
        if (o.needsSignIn) setPhase('signin');
        else if (o.needsOnboarding) setPhase('onboarding');
        else setPhase(o.hero ? 'hero' : 'ready');
      })
      .catch(() => setPhase('ready'));
  }, [prepare]);

  /**
   * First run ends here. The daily hero is deliberately skipped and marked seen: onboarding
   * has already had the newcomer's full attention for four cards, and stacking a second
   * full-screen welcome behind it is one screen too many on the very first launch. The hero
   * greets them tomorrow instead.
   *
   * The first name from the last card goes in the same write as `onboardedAt` - two
   * separate saves could each read the old settings and one would undo the other.
   */
  const handleOnboardingDone = useCallback((firstName: string) => {
    saveSettings({ onboardedAt: new Date().toISOString(), ...(firstName ? { firstName } : {}) }).catch(() => {});
    markDailyHeroSeen();
    setPhase('ready');
  }, []);

  // After signing in, carry on exactly where the opening sequence would have gone.
  const handleSignedIn = useCallback(() => {
    markSeen();
    prepare
      .then((o) => {
        if (o.needsOnboarding) setPhase('onboarding');
        else setPhase(o.hero ? 'hero' : 'ready');
      })
      .catch(() => setPhase('ready'));
  }, [prepare]);

  const handleHeroDismiss = useCallback(() => {
    markDailyHeroSeen();
    setPhase('ready');
  }, []);

  // Navigation chrome follows the app theme. Spread the library's own theme rather than
  // hand-rolling one, so fields it adds in a later SDK still arrive populated.
  const navTheme = useMemo(() => {
    const base = theme.name === 'dark' ? NavDarkTheme : NavLightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: theme.ground,
        card: theme.ground,
        text: theme.ink,
        border: theme.border,
        primary: theme.primary,
      },
    };
  }, [theme]);

  return (
    <ThemeProvider value={navTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>

      {phase === 'loading' && <SplashLoader onDone={handleLoaderDone} holdUntil={prepare} />}
      {phase === 'signin' && <SignIn onDone={handleSignedIn} />}
      {phase === 'onboarding' && <Onboarding onDone={handleOnboardingDone} />}
      {phase === 'hero' && opening.hero && (
        <DailyHero content={opening.hero} firstName={opening.firstName} onDismiss={handleHeroDismiss} />
      )}

      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
