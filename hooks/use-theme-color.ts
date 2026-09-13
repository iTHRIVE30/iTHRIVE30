/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  // React Native's ColorSchemeName is wider than 'light' | 'dark' (it also allows null and
  // 'unspecified'), so narrow it explicitly rather than using ?? - anything that isn't an
  // explicit dark preference falls back to light.
  const scheme = useColorScheme();
  const theme: 'light' | 'dark' = scheme === 'dark' ? 'dark' : 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
