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
import { AppThemeProvider, useTheme } from '@/hooks/useTheme';
import { initMonitoring } from '@/lib/monitoring';
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

type Phase = 'loading' | 'hero' | 'ready';

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
  const [hero, setHero] = useState<DailyHeroContent | null>(null);

  // Decide the day's welcome while the loading ring is still sweeping, and hand the
  // promise to SplashLoader so the ring hitting 100% means genuinely ready.
  const [prepare] = useState(() =>
    (async () => {
      try {
        if (!(await shouldShowDailyHero())) return null;
        return await getDailyHeroContent();
      } catch {
        return null;
      }
    })()
  );

  useEffect(() => {
    prepare.then(setHero).catch(() => setHero(null));
  }, [prepare]);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Crash reporting. No-ops in Expo Go, and stays silent until a DSN is configured and the
  // user's opt-out has been read - see lib/monitoring.ts. Never throws.
  useEffect(() => {
    initMonitoring();
  }, []);

  const handleLoaderDone = useCallback(() => {
    setPhase(hero ? 'hero' : 'ready');
  }, [hero]);

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
      {phase === 'hero' && hero && <DailyHero content={hero} onDismiss={handleHeroDismiss} />}

      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
