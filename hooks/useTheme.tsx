import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import { DarkTheme, THEMES, type Theme, type ThemeName } from '../constants/theme';
import { getSettings, saveSettings, type Appearance } from '../lib/settingsStore';

/**
 * App-wide theme, driven by the user's Appearance setting.
 *
 * 'system' follows the device, which is why app.json now sets
 * `userInterfaceStyle: "automatic"` - pinned to "dark" the OS reports 'dark' forever and
 * `useColorScheme()` can never return anything else.
 *
 * The provider starts on the dark theme and swaps once the stored preference has been
 * read. That read is a single AsyncStorage key and resolves inside the splash sequence,
 * so a light-mode user does not see the app repaint: the native splash is black (it runs
 * before any JS and cannot be theme-aware), the JS splash is deliberately black too, and
 * the theme is settled by the time either clears.
 */

type ThemeContextValue = {
  theme: Theme;
  /** The stored preference - 'system' | 'light' | 'dark'. */
  appearance: Appearance;
  /** What 'system' currently resolves to, for labelling the control. */
  systemTheme: ThemeName;
  setAppearance: (next: Appearance) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: DarkTheme,
  appearance: 'system',
  systemTheme: 'dark',
  setAppearance: async () => {},
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [appearance, setAppearanceState] = useState<Appearance>('system');

  useEffect(() => {
    let alive = true;
    getSettings()
      .then((s) => {
        if (alive) setAppearanceState(s.appearance);
      })
      .catch(() => {
        // Preference unreadable: stay on the default rather than failing to render.
      });
    return () => {
      alive = false;
    };
  }, []);

  const systemTheme: ThemeName = scheme === 'light' ? 'light' : 'dark';
  const resolved: ThemeName = appearance === 'system' ? systemTheme : appearance;

  const setAppearance = useCallback(async (next: Appearance) => {
    // Repaint immediately, persist behind it - the same autosave shape as the rest of the app.
    setAppearanceState(next);
    try {
      await saveSettings({ appearance: next });
    } catch {
      // Best-effort; the choice still applies for this session.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: THEMES[resolved], appearance, systemTheme, setAppearance }),
    [resolved, appearance, systemTheme, setAppearance]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The active palette. */
export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

/** The setting itself, for the Appearance control in Settings. */
export function useAppearance() {
  const { appearance, systemTheme, setAppearance } = useContext(ThemeContext);
  return { appearance, systemTheme, setAppearance };
}

/**
 * Build a StyleSheet from the active theme, rebuilt only when the theme changes.
 *
 * Define the factory at module scope so its identity is stable:
 *
 *   const createStyles = (t: Theme) => StyleSheet.create({ ... });
 *   const styles = useThemedStyles(createStyles);
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
