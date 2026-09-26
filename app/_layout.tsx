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
import { AppThemeProvider, useTheme } from '@/hooks/useTheme';
import { initMonitoring } from '@/lib/monitoring';
import { syncReminders } from '@/lib/reminders';
import { getSettings, saveSettings } from '@/lib/settingsStore';
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

type Phase = 'loading' | 'onboarding' | 'hero' | 'ready';

/** What the loading ring is actually waiting on: which opening screen, if any, comes next. */
type Opening = { hero: DailyHeroContent | null; needsOnboarding: boolean; firstName: string };

export default function RootLayout() {
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
  const [opening, setOpening] = useState<Opening>({ hero: null, needsOnboarding: false, firstName: '' });

  // Decide what follows the loading ring while it is still sweeping, and hand the promise
  // to SplashLoader so the ring hitting 100% means genuinely ready. Each read is guarded
  // separately: a failure in one must not cost us the other.
  const [prepare] = useState<Promise<Opening>>(() =>
    (async () => {
      let needsOnboarding = false;
      let hero: DailyHeroContent | null = null;
      let firstName = '';

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

      return { hero, needsOnboarding, firstName };
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
  }, []);

  const handleLoaderDone = useCallback(() => {
    if (opening.needsOnboarding) setPhase('onboarding');
    else setPhase(opening.hero ? 'hero' : 'ready');
  }, [opening]);

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
      {phase === 'onboarding' && <Onboarding onDone={handleOnboardingDone} />}
      {phase === 'hero' && opening.hero && (
        <DailyHero content={opening.hero} firstName={opening.firstName} onDismiss={handleHeroDismiss} />
      )}

      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
